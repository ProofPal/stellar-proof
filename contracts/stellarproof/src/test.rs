#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::Address as _,
    token::{Client as TokenClient, StellarAssetClient},
    Env,
};

struct Ctx {
    env: Env,
    client: StellarProofReceiptsClient<'static>,
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
