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

#[test]
fn test_open_channel_zero_or_negative_deposit_rejected() {
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

    // Zero deposit
    let res_zero = client.try_open_channel(&payer, &merchant, &token_id, &0i128, &200u32);
    assert_eq!(res_zero, Err(Ok(ChannelError::InvalidDeposit)));

    // Negative deposit
    let res_neg = client.try_open_channel(&payer, &merchant, &token_id, &-500i128, &200u32);
    assert_eq!(res_neg, Err(Ok(ChannelError::InvalidDeposit)));
}

#[test]
fn test_open_channel_past_or_current_expiry_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_sequence_number(200);

    let contract_id = env.register(X402ChannelContract, ());
    let client = X402ChannelContractClient::new(&env, &contract_id);

    let payer = Address::generate(&env);
    let merchant = Address::generate(&env);

    let token_admin = Address::generate(&env);
    let token_contract = env.register_stellar_asset_contract_v2(token_admin);
    let token_id = token_contract.address();

    // Expiry equal to current ledger sequence
    let res_eq = client.try_open_channel(&payer, &merchant, &token_id, &1_000_000, &200u32);
    assert_eq!(res_eq, Err(Ok(ChannelError::ChannelExpired)));

    // Expiry in the past
    let res_past = client.try_open_channel(&payer, &merchant, &token_id, &1_000_000, &150u32);
    assert_eq!(res_past, Err(Ok(ChannelError::ChannelExpired)));
}

#[test]
fn test_claim_payment_nonce_validation() {
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
    token_client.mint(&payer, &5_000_000);

    let channel_id = client.open_channel(&payer, &merchant, &token_id, &2_000_000, &500u32);

    // Initial claim with nonce 10
    let payout1 = client.claim_payment(&channel_id, &500_000, &10u64);
    assert_eq!(payout1, 500_000);

    // Same nonce must fail
    let res_same = client.try_claim_payment(&channel_id, &600_000, &10u64);
    assert_eq!(res_same, Err(Ok(ChannelError::InvalidNonce)));

    // Decreased nonce must fail
    let res_lower = client.try_claim_payment(&channel_id, &600_000, &9u64);
    assert_eq!(res_lower, Err(Ok(ChannelError::InvalidNonce)));

    // Zero nonce must fail
    let res_zero = client.try_claim_payment(&channel_id, &600_000, &0u64);
    assert_eq!(res_zero, Err(Ok(ChannelError::InvalidNonce)));
}

#[test]
fn test_claim_payment_amount_bounds() {
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
    token_client.mint(&payer, &5_000_000);

    let channel_id = client.open_channel(&payer, &merchant, &token_id, &1_000_000, &500u32);

    // Claim zero amount fails
    let res_zero = client.try_claim_payment(&channel_id, &0, &1u64);
    assert_eq!(res_zero, Err(Ok(ChannelError::InvalidAmount)));

    // Claim negative amount fails
    let res_neg = client.try_claim_payment(&channel_id, &-100, &1u64);
    assert_eq!(res_neg, Err(Ok(ChannelError::InvalidAmount)));

    // Valid first claim
    let payout = client.claim_payment(&channel_id, &400_000, &1u64);
    assert_eq!(payout, 400_000);

    // Claim equal to current claimed amount fails
    let res_equal = client.try_claim_payment(&channel_id, &400_000, &2u64);
    assert_eq!(res_equal, Err(Ok(ChannelError::InvalidAmount)));

    // Claim less than current claimed amount fails
    let res_less = client.try_claim_payment(&channel_id, &300_000, &3u64);
    assert_eq!(res_less, Err(Ok(ChannelError::InvalidAmount)));

    // Claim exceeding deposited amount fails
    let res_excess = client.try_claim_payment(&channel_id, &1_000_001, &4u64);
    assert_eq!(res_excess, Err(Ok(ChannelError::InvalidAmount)));
}

#[test]
fn test_payer_close_premature_and_unauthorized_caller() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_sequence_number(100);

    let contract_id = env.register(X402ChannelContract, ());
    let client = X402ChannelContractClient::new(&env, &contract_id);

    let payer = Address::generate(&env);
    let merchant = Address::generate(&env);
    let stranger = Address::generate(&env);

    let token_admin = Address::generate(&env);
    let token_contract = env.register_stellar_asset_contract_v2(token_admin);
    let token_id = token_contract.address();
    let token_client = token::StellarAssetClient::new(&env, &token_id);
    token_client.mint(&payer, &2_000_000);

    let channel_id = client.open_channel(&payer, &merchant, &token_id, &2_000_000, &500u32);

    // Stranger close rejected
    let res_stranger = client.try_close_channel(&channel_id, &stranger);
    assert_eq!(res_stranger, Err(Ok(ChannelError::Unauthorized)));

    // Payer close before expiry (sequence 100 < 500) rejected
    let res_premature = client.try_close_channel(&channel_id, &payer);
    assert_eq!(res_premature, Err(Ok(ChannelError::ChannelNotExpired)));

    // Advance to sequence 499 (still before 500)
    env.ledger().set_sequence_number(499);
    let res_still_early = client.try_close_channel(&channel_id, &payer);
    assert_eq!(res_still_early, Err(Ok(ChannelError::ChannelNotExpired)));

    // Advance to 500 (at expiry) - now payer close succeeds
    env.ledger().set_sequence_number(500);
    let refunded = client.close_channel(&channel_id, &payer);
    assert_eq!(refunded, 2_000_000);
}

#[test]
fn test_operations_on_closed_channel_rejected() {
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
    token_client.mint(&payer, &1_000_000);

    let channel_id = client.open_channel(&payer, &merchant, &token_id, &1_000_000, &500u32);

    // Merchant cooperatively closes channel immediately
    let refunded = client.close_channel(&channel_id, &merchant);
    assert_eq!(refunded, 1_000_000);

    // Further claim must fail
    let res_claim = client.try_claim_payment(&channel_id, &100_000, &1u64);
    assert_eq!(res_claim, Err(Ok(ChannelError::ChannelClosed)));

    // Further close must fail
    let res_close_again = client.try_close_channel(&channel_id, &merchant);
    assert_eq!(res_close_again, Err(Ok(ChannelError::ChannelClosed)));
}

#[test]
fn test_nonexistent_channel_queries() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_sequence_number(100);

    let contract_id = env.register(X402ChannelContract, ());
    let client = X402ChannelContractClient::new(&env, &contract_id);
    let caller = Address::generate(&env);

    let non_existent_id = 99999u64;

    let res_get = client.try_get_channel(&non_existent_id);
    assert_eq!(res_get, Err(Ok(ChannelError::ChannelNotFound)));

    let res_claim = client.try_claim_payment(&non_existent_id, &100_000, &1u64);
    assert_eq!(res_claim, Err(Ok(ChannelError::ChannelNotFound)));

    let res_close = client.try_close_channel(&non_existent_id, &caller);
    assert_eq!(res_close, Err(Ok(ChannelError::ChannelNotFound)));
}

#[test]
fn test_cooperative_full_payout_zero_refund() {
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
    let token_client = token::Client::new(&env, &token_id);
    let stellar_admin = token::StellarAssetClient::new(&env, &token_id);
    stellar_admin.mint(&payer, &1_000_000);

    let channel_id = client.open_channel(&payer, &merchant, &token_id, &1_000_000, &500u32);

    // Merchant claims 100% of deposited funds
    let payout = client.claim_payment(&channel_id, &1_000_000, &1u64);
    assert_eq!(payout, 1_000_000);
    assert_eq!(token_client.balance(&merchant), 1_000_000);

    // Cooperative close has 0 remaining refund
    let refunded = client.close_channel(&channel_id, &merchant);
    assert_eq!(refunded, 0);
    assert_eq!(token_client.balance(&payer), 0);
    assert_eq!(token_client.balance(&contract_id), 0);

    let state = client.get_channel(&channel_id);
    assert_eq!(state.closed, true);
    assert_eq!(state.claimed, 1_000_000);
}

#[test]
fn test_channel_monotonic_fuzzing_and_balance_conservation() {
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
    let token_client = token::Client::new(&env, &token_id);
    let stellar_admin = token::StellarAssetClient::new(&env, &token_id);

    let initial_deposit = 50_000_000i128;
    stellar_admin.mint(&payer, &initial_deposit);

    let channel_id = client.open_channel(&payer, &merchant, &token_id, &initial_deposit, &10_000u32);

    let mut current_claimed = 0i128;
    let mut current_nonce = 0u64;

    // Simulate 50 sequential micro-vouchers of variable increments
    for i in 1..=50 {
        // Vary increment between 10,000 and 800,000 stroops
        let increment = (i as i128 * 17_321) % 800_000 + 10_000;
        let next_claimed = current_claimed + increment;
        let next_nonce = current_nonce + (i as u64 % 3) + 1; // Monotonically increasing nonce jumps

        let payout = client.claim_payment(&channel_id, &next_claimed, &next_nonce);
        assert_eq!(payout, increment);

        current_claimed = next_claimed;
        current_nonce = next_nonce;

        // Invariant 1: Contract state matches
        let state = client.get_channel(&channel_id);
        assert_eq!(state.claimed, current_claimed);
        assert_eq!(state.nonce, current_nonce);
        assert!(state.claimed <= state.deposited);

        // Invariant 2: Token balances strictly conserve total initial deposit
        let contract_bal = token_client.balance(&contract_id);
        let merchant_bal = token_client.balance(&merchant);
        assert_eq!(merchant_bal, current_claimed);
        assert_eq!(contract_bal, initial_deposit - current_claimed);
        assert_eq!(contract_bal + merchant_bal, initial_deposit);
    }

    // Cooperative close at the end of the 50 vouchers
    let refunded = client.close_channel(&channel_id, &merchant);
    assert_eq!(refunded, initial_deposit - current_claimed);

    // Final balance checks
    assert_eq!(token_client.balance(&contract_id), 0);
    assert_eq!(token_client.balance(&merchant), current_claimed);
    assert_eq!(token_client.balance(&payer), refunded);
    assert_eq!(token_client.balance(&merchant) + token_client.balance(&payer), initial_deposit);
}
