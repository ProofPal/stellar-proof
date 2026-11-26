#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{storage::Persistent, Address as _, Events, Ledger},
    token::{Client as TokenClient, StellarAssetClient},
    xdr, Env,
};

struct Ctx {
    env: Env,
    client: StellarProofReceiptsClient<'static>,
    contract_id: Address,
    token: Address,
    sender: Address,
    receiver: Address,
}

const AMOUNT: i128 = 25_000_000;

fn setup() -> Ctx {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(StellarProofReceipts, ());
    let client = StellarProofReceiptsClient::new(&env, &contract_id);

    // A Stellar Asset Contract stands in for the native XLM SAC in tests.
    let admin = Address::generate(&env);
    let token = env.register_stellar_asset_contract_v2(admin).address();

    let sender = Address::generate(&env);
    let receiver = Address::generate(&env);
    StellarAssetClient::new(&env, &token).mint(&sender, &1_000_000_000);

    Ctx {
        env,
        client,
        contract_id,
        token,
        sender,
        receiver,
    }
}

fn create(ctx: &Ctx, receipt_id: &str) -> Receipt {
    ctx.client.create_receipt(
        &ctx.sender,
        &String::from_str(&ctx.env, receipt_id),
        &ctx.receiver,
        &ctx.token,
        &AMOUNT,
        &String::from_str(&ctx.env, "XLM"),
        &String::from_str(&ctx.env, "QmStellarProofCid"),
        &String::from_str(&ctx.env, "Smart contract security audit"),
    )
}

#[test]
fn creates_and_reads_receipt() {
    let ctx = setup();
    let receipt = create(&ctx, "rcpt-0001");

    assert_eq!(receipt.receipt_id, String::from_str(&ctx.env, "rcpt-0001"));
    assert_eq!(receipt.sender, ctx.sender);
    assert_eq!(receipt.receiver, ctx.receiver);
    assert_eq!(receipt.amount, AMOUNT);
    assert_eq!(receipt.token_symbol, String::from_str(&ctx.env, "XLM"));
    assert_eq!(receipt.timestamp, ctx.env.ledger().timestamp());

    let stored = ctx
        .client
        .get_receipt(&String::from_str(&ctx.env, "rcpt-0001"));
    assert_eq!(stored, receipt);

    let verified = ctx
        .client
        .verify_receipt(&String::from_str(&ctx.env, "rcpt-0001"));
    assert_eq!(verified, Some(receipt));
}

#[test]
fn stores_the_token_contract_address() {
    let ctx = setup();
    let receipt = create(&ctx, "rcpt-token");

    // The authoritative asset identity is the contract that moved the funds,
    // not the caller-supplied display symbol.
    assert_eq!(receipt.token, ctx.token);

    let stored = ctx
        .client
        .get_receipt(&String::from_str(&ctx.env, "rcpt-token"));
    assert_eq!(stored.token, ctx.token);
}

#[test]
fn transfers_the_payment_and_stores_receipt() {
    let ctx = setup();
    create(&ctx, "rcpt-0002");

    let token = TokenClient::new(&ctx.env, &ctx.token);
    assert_eq!(token.balance(&ctx.sender), 1_000_000_000 - AMOUNT);
    assert_eq!(token.balance(&ctx.receiver), AMOUNT);
}

#[test]
fn indexes_receipts_for_both_parties() {
    let ctx = setup();
    create(&ctx, "rcpt-0003");

    let sender_ids = ctx.client.get_receipts_by_user(&ctx.sender);
    let receiver_ids = ctx.client.get_receipts_by_user(&ctx.receiver);

    assert_eq!(sender_ids.len(), 1);
    assert_eq!(receiver_ids.len(), 1);
    assert_eq!(
        sender_ids.get(0),
        Some(String::from_str(&ctx.env, "rcpt-0003"))
    );
    assert_eq!(
        receiver_ids.get(0),
        Some(String::from_str(&ctx.env, "rcpt-0003"))
    );
}

#[test]
fn pages_through_receipt_history() {
    let ctx = setup();
    create(&ctx, "rcpt-a");
    create(&ctx, "rcpt-b");
    create(&ctx, "rcpt-c");

    let first = ctx.client.get_receipts_by_user_page(&ctx.sender, &0, &2);
    assert_eq!(first.len(), 2);
    assert_eq!(first.get(0), Some(String::from_str(&ctx.env, "rcpt-a")));
    assert_eq!(first.get(1), Some(String::from_str(&ctx.env, "rcpt-b")));

    let second = ctx.client.get_receipts_by_user_page(&ctx.sender, &2, &2);
    assert_eq!(second.len(), 1);
    assert_eq!(second.get(0), Some(String::from_str(&ctx.env, "rcpt-c")));

    // An offset past the end is an empty page, not an error.
    let past_end = ctx.client.get_receipts_by_user_page(&ctx.sender, &99, &2);
    assert_eq!(past_end.len(), 0);

    // The page size is clamped so one read cannot blow the budget.
    let clamped = ctx.client.get_receipts_by_user_page(&ctx.sender, &0, &500);
    assert_eq!(clamped.len(), 3);
}

#[test]
fn renewal_is_permissionless_and_extends_the_ttl() {
    let ctx = setup();
    create(&ctx, "rcpt-renew");

    let initial_ttl = receipt_ttl(&ctx, "rcpt-renew");
    assert!(initial_ttl >= PERSISTENT_BUMP - DAY_IN_LEDGERS);

    // Move forward until the entry is inside the renewal threshold.
    ctx.env.ledger().set_sequence_number(65 * DAY_IN_LEDGERS);
    let decayed_ttl = receipt_ttl(&ctx, "rcpt-renew");
    assert!(decayed_ttl < PERSISTENT_THRESHOLD);

    // No auth is mocked for this call: renewal must work from any address.
    ctx.env.set_auths(&[]);
    ctx.client
        .bump_receipt(&String::from_str(&ctx.env, "rcpt-renew"));

    let renewed_ttl = receipt_ttl(&ctx, "rcpt-renew");
    assert!(renewed_ttl > decayed_ttl);
    assert!(renewed_ttl >= PERSISTENT_BUMP - DAY_IN_LEDGERS);
}

/// Test-only read of the persistent TTL. Production contract code cannot get
/// an entry's TTL; off-chain clients use `getLedgerEntries` instead.
fn receipt_ttl(ctx: &Ctx, receipt_id: &str) -> u32 {
    let key = DataKey::Receipt(String::from_str(&ctx.env, receipt_id));
    // Test storage access must run in the contract's context.
    ctx.env.as_contract(&ctx.contract_id, || {
        ctx.env.storage().persistent().get_ttl(&key)
    })
}

#[test]
fn renewal_of_unknown_receipt_is_not_found() {
    let ctx = setup();

    assert_eq!(
        ctx.client
            .try_bump_receipt(&String::from_str(&ctx.env, "rcpt-missing")),
        Err(Ok(Error::ReceiptNotFound))
    );
}

#[test]
fn publishes_one_anchored_event() {
    let ctx = setup();
    create(&ctx, "rcpt-event");

    let events = ctx.env.events().all().filter_by_contract(&ctx.contract_id);
    let events = events.events();

    // One event from this contract: the event name plus the receipt id and
    // sender topics.
    assert_eq!(events.len(), 1);
    match &events[0].body {
        xdr::ContractEventBody::V0(body) => assert_eq!(body.topics.len(), 3),
    }
}

#[test]
fn rejects_duplicate_receipt_id() {
    let ctx = setup();
    create(&ctx, "rcpt-0004");

    let result = ctx.client.try_create_receipt(
        &ctx.sender,
        &String::from_str(&ctx.env, "rcpt-0004"),
        &ctx.receiver,
        &ctx.token,
        &1_000_000,
        &String::from_str(&ctx.env, "XLM"),
        &String::from_str(&ctx.env, "QmAnotherCid"),
        &String::from_str(&ctx.env, "Duplicate"),
    );

    assert_eq!(result, Err(Ok(Error::ReceiptAlreadyExists)));

    // The failed call must not have moved any funds.
    let token = TokenClient::new(&ctx.env, &ctx.token);
    assert_eq!(token.balance(&ctx.receiver), AMOUNT);
}

#[test]
fn rejects_empty_receipt_id() {
    let ctx = setup();

    let result = ctx.client.try_create_receipt(
        &ctx.sender,
        &String::from_str(&ctx.env, ""),
        &ctx.receiver,
        &ctx.token,
        &1_000_000,
        &String::from_str(&ctx.env, "XLM"),
        &String::from_str(&ctx.env, "QmCid"),
        &String::from_str(&ctx.env, "Missing id"),
    );

    assert_eq!(result, Err(Ok(Error::EmptyReceiptId)));
}

#[test]
fn rejects_empty_ipfs_hash() {
    let ctx = setup();

    let result = ctx.client.try_create_receipt(
        &ctx.sender,
        &String::from_str(&ctx.env, "rcpt-0005"),
        &ctx.receiver,
        &ctx.token,
        &1_000_000,
        &String::from_str(&ctx.env, "XLM"),
        &String::from_str(&ctx.env, ""),
        &String::from_str(&ctx.env, "Missing cid"),
    );

    assert_eq!(result, Err(Ok(Error::EmptyIpfsHash)));
}

#[test]
fn rejects_non_positive_amount() {
    let ctx = setup();

    let result = ctx.client.try_create_receipt(
        &ctx.sender,
        &String::from_str(&ctx.env, "rcpt-0006"),
        &ctx.receiver,
        &ctx.token,
        &0,
        &String::from_str(&ctx.env, "XLM"),
        &String::from_str(&ctx.env, "QmCid"),
        &String::from_str(&ctx.env, "Zero amount"),
    );

    assert_eq!(result, Err(Ok(Error::InvalidAmount)));
}

#[test]
fn rejects_missing_sender_authorization() {
    let ctx = setup();
    // Remove the blanket mock: the sender is not the invoker of this call and
    // has signed nothing, so `require_auth` must reject it.
    ctx.env.set_auths(&[]);

    let result = ctx.client.try_create_receipt(
        &ctx.sender,
        &String::from_str(&ctx.env, "rcpt-unauthorized"),
        &ctx.receiver,
        &ctx.token,
        &1_000_000,
        &String::from_str(&ctx.env, "XLM"),
        &String::from_str(&ctx.env, "QmCid"),
        &String::from_str(&ctx.env, "No auth"),
    );

    assert!(result.is_err());
    assert_eq!(
        ctx.client
            .verify_receipt(&String::from_str(&ctx.env, "rcpt-unauthorized")),
        None
    );
}

#[test]
fn self_payment_is_indexed_once() {
    let ctx = setup();

    let receipt = ctx.client.create_receipt(
        &ctx.sender,
        &String::from_str(&ctx.env, "rcpt-self"),
        &ctx.sender,
        &ctx.token,
        &AMOUNT,
        &String::from_str(&ctx.env, "XLM"),
        &String::from_str(&ctx.env, "QmSelfCid"),
        &String::from_str(&ctx.env, "Self payment"),
    );
    assert_eq!(receipt.receiver, ctx.sender);

    let ids = ctx.client.get_receipts_by_user(&ctx.sender);
    assert_eq!(ids.len(), 1);
}

#[test]
fn unknown_receipt_is_not_found() {
    let ctx = setup();

    assert_eq!(
        ctx.client
            .try_get_receipt(&String::from_str(&ctx.env, "rcpt-missing")),
        Err(Ok(Error::ReceiptNotFound))
    );
    assert_eq!(
        ctx.client
            .verify_receipt(&String::from_str(&ctx.env, "rcpt-missing")),
        None
    );
}
