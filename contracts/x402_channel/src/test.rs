#![cfg(test)]
extern crate std;
use std::println;

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token, Address, Env,
};

#[test]
fn test_channel_lifecycle_and_gas_benchmarks() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_sequence_number(100);

    let contract_id = env.register(X402ChannelContract, ());
    let client = X402ChannelContractClient::new(&env, &contract_id);

    let payer = Address::generate(&env);
    let merchant = Address::generate(&env);

    // Register token and mint deposit
    let token_admin = Address::generate(&env);
    let token_contract = env.register_stellar_asset_contract_v2(token_admin);
    let token_id = token_contract.address();
    let token_client = token::StellarAssetClient::new(&env, &token_id);
    token_client.mint(&payer, &10_000_000);

    // Reset budget before open_channel
    env.cost_estimate().budget().reset_unlimited();

    // 1. Open Channel Benchmark
    let deposit = 5_000_000i128;
    let expiry = 500u32;
    let channel_id = client.open_channel(&payer, &merchant, &token_id, &deposit, &expiry);
    assert_eq!(channel_id, 1);

    let open_cpu = env.cost_estimate().budget().cpu_instruction_cost();
    let open_mem = env.cost_estimate().budget().memory_bytes_cost();
    println!("Gas Benchmark: open_channel CPU: {}, Mem: {} bytes", open_cpu, open_mem);

    let state = client.get_channel(&channel_id);
    assert_eq!(state.deposited, deposit);
    assert_eq!(state.claimed, 0);
    assert_eq!(state.nonce, 0);
    assert_eq!(state.closed, false);

    // 2. Claim Payment Micro-voucher Benchmark
    env.cost_estimate().budget().reset_unlimited();
    let claim_amount = 1_000_000i128;
    let nonce = 1u64;
    let payout = client.claim_payment(&channel_id, &claim_amount, &nonce);
    assert_eq!(payout, 1_000_000i128);

    let claim_cpu = env.cost_estimate().budget().cpu_instruction_cost();
    let claim_mem = env.cost_estimate().budget().memory_bytes_cost();
    println!("Gas Benchmark: claim_payment CPU: {}, Mem: {} bytes", claim_cpu, claim_mem);

    let state_after_claim = client.get_channel(&channel_id);
    assert_eq!(state_after_claim.claimed, 1_000_000i128);
    assert_eq!(state_after_claim.nonce, 1u64);

    // 3. Second Claim with higher nonce
    let payout2 = client.claim_payment(&channel_id, &2_500_000i128, &2u64);
    assert_eq!(payout2, 1_500_000i128);

    // 4. Close Channel Benchmark (merchant cooperative close)
    env.cost_estimate().budget().reset_unlimited();
    let refunded = client.close_channel(&channel_id, &merchant);
    assert_eq!(refunded, 2_500_000i128);

    let close_cpu = env.cost_estimate().budget().cpu_instruction_cost();
    let close_mem = env.cost_estimate().budget().memory_bytes_cost();
    println!("Gas Benchmark: close_channel CPU: {}, Mem: {} bytes", close_cpu, close_mem);

    let state_closed = client.get_channel(&channel_id);
    assert_eq!(state_closed.closed, true);
}

#[test]
fn test_channel_payer_close_after_expiry() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_sequence_number(100);

    let contract_id = env.register(X402ChannelContract, ());
    let client = X402ChannelContractClient::new(&env, &contract_id);

    let payer = Address::generate(&env);
    let merchant = Address::generate(&env);

    let token_admin = Address::generate(&env);
    let token_contract = env.register_stellar_asset_contract_v2(token_admin);
    let token_id = token_contract.address();
    let token_client = token::StellarAssetClient::new(&env, &token_id);
    token_client.mint(&payer, &10_000_000);

    let channel_id = client.open_channel(&payer, &merchant, &token_id, &2_000_000, &200u32);

    // Advance ledger past expiration
    env.ledger().set_sequence_number(250);

    let refunded = client.close_channel(&channel_id, &payer);
    assert_eq!(refunded, 2_000_000);

    let state = client.get_channel(&channel_id);
    assert_eq!(state.closed, true);
}
