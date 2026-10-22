import test from "node:test";
import assert from "node:assert/strict";
import {
  SUPPORTED_ASSETS,
  TESTNET_USDC_ISSUER,
  explorerAccountUrl,
  explorerContractUrl,
  explorerTxUrl,
  getAssetOption,
  isValidStellarAddress,
  stroopsToXlm,
  xlmToStroops,
} from "../lib/stellar";

const VALID_ACCOUNT = "GAXJ2ZSRTYP5233UYEBUOSDLYBJ65Q3XH2Z5UMAJ46SA26NEXATJ3SLV";
const VALID_CONTRACT = "CCGQESQGIY3O2YRIHKEB3X6PTYFOAG37P6ETNTITCZXDIWA77Q7JZL6O";

test("converts XLM amounts into stroops", () => {
  assert.equal(xlmToStroops("2.5"), 25_000_000n);
  assert.equal(xlmToStroops("15"), 150_000_000n);
  assert.equal(xlmToStroops("0.0000001"), 1n);
  assert.equal(xlmToStroops("0"), 0n);
});

test("rejects amounts with too much precision", () => {
  assert.throws(() => xlmToStroops("1.12345678"), /7 decimal places/);
  assert.throws(() => xlmToStroops("-5"), /positive number/);
  assert.throws(() => xlmToStroops("abc"), /positive number/);
  assert.throws(() => xlmToStroops(""), /positive number/);
});

test("converts stroops back into display amounts", () => {
  assert.equal(stroopsToXlm(25_000_000n), "2.5");
  assert.equal(stroopsToXlm(1n), "0.0000001");
  assert.equal(stroopsToXlm(0n), "0");
  assert.equal(stroopsToXlm("150000000"), "15");
});

test("round-trips amounts through stroops", () => {
  for (const amount of ["1", "2.5", "0.0000001", "987.654321"]) {
    assert.equal(stroopsToXlm(xlmToStroops(amount)), amount);
  }
});

test("validates Stellar account addresses", () => {
  assert.equal(isValidStellarAddress(VALID_ACCOUNT), true);
  assert.equal(isValidStellarAddress(` ${VALID_ACCOUNT} `), true);
  assert.equal(isValidStellarAddress(VALID_CONTRACT), false);
  assert.equal(isValidStellarAddress("0x5FbDB2315678afecb367f032d93F642f64180aa3"), false);
  assert.equal(isValidStellarAddress("not-an-address"), false);
  assert.equal(isValidStellarAddress(""), false);
});

test("exposes XLM and USDC as supported assets", () => {
  assert.deepEqual(
    SUPPORTED_ASSETS.map((asset) => asset.code),
    ["XLM", "USDC"]
  );
  assert.equal(getAssetOption("usdc")?.issuer, TESTNET_USDC_ISSUER);
  assert.equal(getAssetOption("XLM")?.issuer, undefined);
  assert.equal(getAssetOption("DOGE"), undefined);
});

test("builds Stellar Expert links", () => {
  assert.equal(
    explorerTxUrl("abc123"),
    "https://stellar.expert/explorer/testnet/tx/abc123"
  );
  assert.equal(
    explorerAccountUrl(VALID_ACCOUNT),
    `https://stellar.expert/explorer/testnet/account/${VALID_ACCOUNT}`
  );
  assert.equal(
    explorerContractUrl(VALID_CONTRACT),
    `https://stellar.expert/explorer/testnet/contract/${VALID_CONTRACT}`
  );
});
