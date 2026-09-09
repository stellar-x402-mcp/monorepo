#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, token, Address, Env,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ChannelError {
    ChannelNotFound = 1,
    ChannelClosed = 2,
    ChannelExpired = 3,
    ChannelNotExpired = 4,
    InvalidDeposit = 5,
    InvalidAmount = 6,
    InvalidNonce = 7,
    Unauthorized = 8,
    InsufficientEscrow = 9,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ChannelState {
    pub payer: Address,
    pub merchant: Address,
    pub token: Address,
    pub deposited: i128,
    pub claimed: i128,
    pub nonce: u64,
    pub expiry_ledger: u32,
    pub closed: bool,
}

#[contracttype]
pub enum DataKey {
    Channel(u64),
    NextChannelId,
}

#[contract]
pub struct X402ChannelContract;

#[contractimpl]
impl X402ChannelContract {
    /// Opens a new bilateral payment channel by locking tokens in escrow.
    pub fn open_channel(
        env: Env,
        payer: Address,
        merchant: Address,
        token: Address,
        deposit: i128,
        expiry_ledger: u32,
    ) -> Result<u64, ChannelError> {
        payer.require_auth();

        if deposit <= 0 {
            return Err(ChannelError::InvalidDeposit);
        }

        let current_ledger = env.ledger().sequence();
        if expiry_ledger <= current_ledger {
            return Err(ChannelError::ChannelExpired);
        }

        // Transfer funds from payer to contract
        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&payer, &env.current_contract_address(), &deposit);

        let mut next_id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::NextChannelId)
            .unwrap_or(1u64);

        let channel_id = next_id;
        next_id += 1;
        env.storage().instance().set(&DataKey::NextChannelId, &next_id);

        let state = ChannelState {
            payer,
            merchant,
            token,
            deposited: deposit,
            claimed: 0,
            nonce: 0,
            expiry_ledger,
            closed: false,
        };

        env.storage().instance().set(&DataKey::Channel(channel_id), &state);

        Ok(channel_id)
    }

    /// Merchant claims cumulative earnings using monotonic voucher nonce.
    pub fn claim_payment(
        env: Env,
        channel_id: u64,
        amount: i128,
        nonce: u64,
    ) -> Result<i128, ChannelError> {
        let mut channel: ChannelState = match env
            .storage()
            .instance()
            .get(&DataKey::Channel(channel_id))
        {
            Some(c) => c,
            None => return Err(ChannelError::ChannelNotFound),
        };

        channel.merchant.require_auth();

        if channel.closed {
            return Err(ChannelError::ChannelClosed);
        }

        if nonce <= channel.nonce {
            return Err(ChannelError::InvalidNonce);
        }

        if amount <= channel.claimed || amount > channel.deposited {
            return Err(ChannelError::InvalidAmount);
        }

        let payout = amount - channel.claimed;
        channel.claimed = amount;
        channel.nonce = nonce;

        env.storage().instance().set(&DataKey::Channel(channel_id), &channel);

        // Disburse payout to merchant
        let token_client = token::Client::new(&env, &channel.token);
        token_client.transfer(&env.current_contract_address(), &channel.merchant, &payout);

        Ok(payout)
    }

    /// Closes a payment channel. Merchant can close anytime; payer can close after expiry.
    pub fn close_channel(
        env: Env,
        channel_id: u64,
        caller: Address,
    ) -> Result<i128, ChannelError> {
        caller.require_auth();

        let mut channel: ChannelState = match env
            .storage()
            .instance()
            .get(&DataKey::Channel(channel_id))
        {
            Some(c) => c,
            None => return Err(ChannelError::ChannelNotFound),
        };

        if channel.closed {
            return Err(ChannelError::ChannelClosed);
        }

        let current_ledger = env.ledger().sequence();

        // Either merchant closes cooperatively or payer closes after expiry
        if caller == channel.merchant {
            // Authorized
        } else if caller == channel.payer {
            if current_ledger < channel.expiry_ledger {
                return Err(ChannelError::ChannelNotExpired);
            }
        } else {
            return Err(ChannelError::Unauthorized);
        }

        channel.closed = true;
        let remaining = channel.deposited - channel.claimed;

        env.storage().instance().set(&DataKey::Channel(channel_id), &channel);

        if remaining > 0 {
            let token_client = token::Client::new(&env, &channel.token);
            token_client.transfer(&env.current_contract_address(), &channel.payer, &remaining);
        }

        Ok(remaining)
    }

    /// Read state of an existing payment channel.
    pub fn get_channel(env: Env, channel_id: u64) -> Result<ChannelState, ChannelError> {
        match env.storage().instance().get(&DataKey::Channel(channel_id)) {
            Some(c) => Ok(c),
            None => Err(ChannelError::ChannelNotFound),
        }
    }
}

#[cfg(test)]
mod test;
