#![no_std]

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, symbol_short, token,
    Address, Env, String, Vec,
};

/// Roughly one day of ledgers (5 second close time).
const DAY_IN_LEDGERS: u32 = 17_280;
/// Persistent receipt records are bumped to live for ~90 days.
const PERSISTENT_BUMP: u32 = 90 * DAY_IN_LEDGERS;
/// Entries are extended when they are within ~30 days of expiring.
const PERSISTENT_THRESHOLD: u32 = 60 * DAY_IN_LEDGERS;
/// Upper bound for a single history page, so a read cannot exceed the host's
/// per-invocation budget.
const MAX_PAGE_SIZE: u32 = 50;

/// Storage keys used by the contract.
///
/// Tuple-style enum variants are encoded as `ScVal::Vec([Symbol, ...])`, which
/// lets off-chain clients read a receipt directly with `getLedgerEntries`
/// without simulating a transaction.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    /// `["Receipt", receipt_id] -> Receipt`
    Receipt(String),
    /// `["UserReceipts", address] -> Vec<String>`
    UserReceipts(Address),
    /// `["Acknowledgement", receipt_id] -> u64` (acknowledgement timestamp)
    Acknowledgement(String),
}

/// A single payment receipt anchored on the Stellar network.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Receipt {
    pub receipt_id: String,
    pub sender: Address,
    pub receiver: Address,
    /// The Stellar Asset Contract that actually moved, recorded by the
    /// contract rather than trusted from caller-supplied metadata.
    pub token: Address,
    pub amount: i128,
    /// Symbol read from the token contract at write time (SEP-41 `symbol()`),
    /// falling back to the payer-reported label only when the call fails.
    /// The authoritative asset identity is still `token`.
    pub token_symbol: String,
    pub ipfs_hash: String,
    pub timestamp: u64,
    pub purpose: String,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    EmptyReceiptId = 1,
    EmptyIpfsHash = 2,
    InvalidAmount = 3,
    ReceiptAlreadyExists = 4,
    ReceiptNotFound = 5,
    NotReceiver = 6,
    AlreadyAcknowledged = 7,
}

/// Emitted every time a receipt is anchored, so indexers can follow new proofs.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReceiptAnchored {
    #[topic]
    pub receipt_id: String,
    #[topic]
    pub sender: Address,
    pub receiver: Address,
    pub token: Address,
    pub amount: i128,
    pub token_symbol: String,
    pub ipfs_hash: String,
}

/// Emitted when anyone extends the lifetime of an existing receipt.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReceiptRenewed {
    #[topic]
    pub receipt_id: String,
}

/// Emitted when the recipient signs an acknowledgement of a receipt.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReceiptAcknowledged {
    #[topic]
    pub receipt_id: String,
    #[topic]
    pub receiver: Address,
}

#[contract]
pub struct StellarProofReceipts;

#[contractimpl]
impl StellarProofReceipts {
    /// Moves `amount` of `token` from `sender` to `receiver` and registers the
    /// payment receipt (IPFS CID + payment details) onchain in one atomic call.
    ///
    /// `token` is any Stellar Asset Contract: the native XLM SAC for XLM
    /// payments, or an issued asset's SAC (e.g. USDC) for stablecoin payments.
    /// The address is persisted with the receipt, so a verifier can prove which
    /// asset moved instead of trusting the display symbol. `token_symbol` is
    /// only a fallback: the stored symbol is read from the token contract with
    /// SEP-41 `symbol()` when the token supports it.
    ///
    /// Only the `sender` of the payment can register it, which is enforced by
    /// `require_auth()`. Soroban satisfies that authorization with the
    /// transaction envelope signature of the sender, because the sender is the
    /// invoker of this call.
    #[allow(clippy::too_many_arguments)]
    pub fn create_receipt(
        env: Env,
        sender: Address,
        receipt_id: String,
        receiver: Address,
        token: Address,
        amount: i128,
        token_symbol: String,
        ipfs_hash: String,
        purpose: String,
    ) -> Result<Receipt, Error> {
        sender.require_auth();

        if receipt_id.is_empty() {
            return Err(Error::EmptyReceiptId);
        }
        if ipfs_hash.is_empty() {
            return Err(Error::EmptyIpfsHash);
        }
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let key = DataKey::Receipt(receipt_id.clone());
        if env.storage().persistent().has(&key) {
            return Err(Error::ReceiptAlreadyExists);
        }

        // The payment settles inside the same invocation that records the
        // receipt, so either both happen or the whole transaction reverts.
        token::Client::new(&env, &token).transfer(&sender, &receiver, &amount);

        // Read the symbol from the asset itself instead of trusting the payer
        // label. A token without SEP-41 metadata falls back to that label.
        let token_symbol = Self::resolve_symbol(&env, &token, token_symbol);

        let receipt = Receipt {
            receipt_id: receipt_id.clone(),
            sender: sender.clone(),
            receiver: receiver.clone(),
            token: token.clone(),
            amount,
            token_symbol: token_symbol.clone(),
            ipfs_hash: ipfs_hash.clone(),
            timestamp: env.ledger().timestamp(),
            purpose,
        };

        env.storage().persistent().set(&key, &receipt);
        env.storage()
            .persistent()
            .extend_ttl(&key, PERSISTENT_THRESHOLD, PERSISTENT_BUMP);

        Self::index_receipt(&env, sender.clone(), receipt_id.clone());
        if receiver != sender {
            Self::index_receipt(&env, receiver.clone(), receipt_id.clone());
        }

        ReceiptAnchored {
            receipt_id: receipt_id.clone(),
            sender: sender.clone(),
            receiver: receiver.clone(),
            token,
            amount,
            token_symbol,
            ipfs_hash,
        }
        .publish(&env);

        Ok(receipt)
    }

    /// Returns a receipt, or `ReceiptNotFound` when the id was never anchored.
    pub fn get_receipt(env: Env, receipt_id: String) -> Result<Receipt, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Receipt(receipt_id))
            .ok_or(Error::ReceiptNotFound)
    }

    /// Non-throwing verification helper for public proof-of-payment checks.
    pub fn verify_receipt(env: Env, receipt_id: String) -> Option<Receipt> {
        env.storage()
            .persistent()
            .get(&DataKey::Receipt(receipt_id))
    }

    /// Returns every receipt id where `user` was the sender or the receiver.
    ///
    /// Prefer `get_receipts_by_user_page` for accounts with long histories: a
    /// single call over an unbounded vector can exceed the read budget.
    pub fn get_receipts_by_user(env: Env, user: Address) -> Vec<String> {
        env.storage()
            .persistent()
            .get(&DataKey::UserReceipts(user))
            .unwrap_or(Vec::new(&env))
    }

    /// Returns one bounded page of the user's receipt ids.
    ///
    /// `start` is a zero-based offset and `limit` is clamped to 50. An offset
    /// past the end returns an empty vector, so clients can page until empty.
    pub fn get_receipts_by_user_page(
        env: Env,
        user: Address,
        start: u32,
        limit: u32,
    ) -> Vec<String> {
        let ids: Vec<String> = env
            .storage()
            .persistent()
            .get(&DataKey::UserReceipts(user))
            .unwrap_or(Vec::new(&env));

        let mut page = Vec::new(&env);
        let end = limit.min(MAX_PAGE_SIZE);
        let len = ids.len();
        let mut index = start;

        while index < len && page.len() < end {
            if let Some(id) = ids.get(index) {
                page.push_back(id);
            }
            index += 1;
        }

        page
    }

    /// Records the recipient's acknowledgement of a receipt.
    ///
    /// Only the recorded receiver can acknowledge, enforced by
    /// `require_auth()`. The receipt itself is not modified: the
    /// acknowledgement is a separate persistent entry, so a verifier can tell
    /// a payer-attested receipt from one the recipient also confirmed.
    ///
    /// Returns the ledger timestamp of the acknowledgement.
    pub fn acknowledge_receipt(
        env: Env,
        receiver: Address,
        receipt_id: String,
    ) -> Result<u64, Error> {
        receiver.require_auth();

        let receipt: Receipt = env
            .storage()
            .persistent()
            .get(&DataKey::Receipt(receipt_id.clone()))
            .ok_or(Error::ReceiptNotFound)?;

        if receipt.receiver != receiver {
            return Err(Error::NotReceiver);
        }

        let key = DataKey::Acknowledgement(receipt_id.clone());
        if env.storage().persistent().has(&key) {
            return Err(Error::AlreadyAcknowledged);
        }

        let timestamp = env.ledger().timestamp();
        env.storage().persistent().set(&key, &timestamp);
        env.storage()
            .persistent()
            .extend_ttl(&key, PERSISTENT_THRESHOLD, PERSISTENT_BUMP);

        ReceiptAcknowledged {
            receipt_id,
            receiver,
        }
        .publish(&env);

        Ok(timestamp)
    }

    /// Returns the acknowledgement timestamp for a receipt, if the recipient
    /// signed one.
    pub fn get_acknowledgement(env: Env, receipt_id: String) -> Option<u64> {
        env.storage()
            .persistent()
            .get(&DataKey::Acknowledgement(receipt_id))
    }

    /// Extends a receipt (and its owner indexes) to the full persistent TTL.
    ///
    /// Permissionless: keeping a public proof alive is a public good, so any
    /// address can pay the fee to renew it. No authorization is required and
    /// none is granted.
    ///
    /// Clients read the remaining lifetime from the entry's
    /// `liveUntilLedgerSeq` with `getLedgerEntries`; the host does not expose a
    /// production TTL getter to contract code.
    pub fn bump_receipt(env: Env, receipt_id: String) -> Result<(), Error> {
        let key = DataKey::Receipt(receipt_id.clone());
        let receipt: Receipt = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::ReceiptNotFound)?;

        env.storage()
            .persistent()
            .extend_ttl(&key, PERSISTENT_THRESHOLD, PERSISTENT_BUMP);

        Self::bump_index(&env, receipt.sender.clone());
        if receipt.receiver != receipt.sender {
            Self::bump_index(&env, receipt.receiver.clone());
        }

        // An acknowledgement should expire with the receipt it belongs to.
        let ack_key = DataKey::Acknowledgement(receipt_id.clone());
        if env.storage().persistent().has(&ack_key) {
            env.storage()
                .persistent()
                .extend_ttl(&ack_key, PERSISTENT_THRESHOLD, PERSISTENT_BUMP);
        }

        ReceiptRenewed { receipt_id }.publish(&env);

        Ok(())
    }

    /// Reads SEP-41 `symbol()` from the token contract, keeping `fallback` when
    /// the token does not implement the metadata interface (or returns an empty
    /// string). This keeps the call from trapping on non-SEP-41 assets.
    fn resolve_symbol(env: &Env, token: &Address, fallback: String) -> String {
        let result = env.try_invoke_contract::<String, soroban_sdk::Error>(
            token,
            &symbol_short!("symbol"),
            Vec::new(env),
        );

        match result {
            Ok(Ok(symbol)) if !symbol.is_empty() => symbol,
            _ => fallback,
        }
    }

    fn index_receipt(env: &Env, user: Address, receipt_id: String) {
        let key = DataKey::UserReceipts(user);
        let mut ids: Vec<String> = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or(Vec::new(env));
        ids.push_back(receipt_id);
        env.storage().persistent().set(&key, &ids);
        env.storage()
            .persistent()
            .extend_ttl(&key, PERSISTENT_THRESHOLD, PERSISTENT_BUMP);
    }

    fn bump_index(env: &Env, user: Address) {
        let key = DataKey::UserReceipts(user);
        if env.storage().persistent().has(&key) {
            env.storage()
                .persistent()
                .extend_ttl(&key, PERSISTENT_THRESHOLD, PERSISTENT_BUMP);
        }
    }
}

mod test;
