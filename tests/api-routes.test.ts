// A contract id must be configured for the routes to reach argument validation.
process.env.NEXT_PUBLIC_STELLARPROOF_CONTRACT_ID =
  "CCGQESQGIY3O2YRIHKEB3X6PTYFOAG37P6ETNTITCZXDIWA77Q7JZL6O";

import test from "node:test";
import assert from "node:assert/strict";

const SENDER = "GAXJ2ZSRTYP5233UYEBUOSDLYBJ65Q3XH2Z5UMAJ46SA26NEXATJ3SLV";
const RECEIVER = "GAE6JHVF7TOZ3SDQHT5JMIKP67BLBP3NOSNRL5GSOL2NJZNU7UNCIUMC";

function jsonRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function paymentPayload(overrides: Record<string, unknown> = {}) {
  return {
    sender: SENDER,
    receiver: RECEIVER,
    amount: "2.5",
    receiptId: "rcpt-test-1",
    ipfsHash: "QmTestCid",
    purpose: "Unit test payment",
    assetCode: "XLM",
    ...overrides,
  };
}

test("prepare-payment rejects an invalid sender", async () => {
  const { POST } = await import("../app/api/stellar/prepare-payment/route");
  const response = await POST(
    jsonRequest("http://localhost/api/stellar/prepare-payment", {
      ...paymentPayload(),
      sender: "0xdeadbeef",
    })
  );

  assert.equal(response.status, 400);
  const body = await response.json();
  assert.match(body.error, /Sender is not a valid Stellar account address/);
});

test("prepare-payment rejects an invalid recipient", async () => {
  const { POST } = await import("../app/api/stellar/prepare-payment/route");
  const response = await POST(
    jsonRequest("http://localhost/api/stellar/prepare-payment", {
      ...paymentPayload(),
      receiver: "not-a-address",
    })
  );

  assert.equal(response.status, 400);
  const body = await response.json();
  assert.match(body.error, /Recipient is not a valid Stellar account address/);
});

test("prepare-payment requires a receipt id and IPFS CID", async () => {
  const { POST } = await import("../app/api/stellar/prepare-payment/route");

  const missingId = await POST(
    jsonRequest("http://localhost/api/stellar/prepare-payment", {
      ...paymentPayload(),
      receiptId: "",
    })
  );
  assert.equal(missingId.status, 400);
  assert.match((await missingId.json()).error, /receipt id/);

  const missingCid = await POST(
    jsonRequest("http://localhost/api/stellar/prepare-payment", {
      ...paymentPayload(),
      ipfsHash: "",
    })
  );
  assert.equal(missingCid.status, 400);
  assert.match((await missingCid.json()).error, /IPFS CID/);
});

test("prepare-payment validates the amount", async () => {
  const { POST } = await import("../app/api/stellar/prepare-payment/route");

  const tooPrecise = await POST(
    jsonRequest("http://localhost/api/stellar/prepare-payment", {
      ...paymentPayload({ amount: "1.12345678" }),
    })
  );
  assert.equal(tooPrecise.status, 400);
  assert.match((await tooPrecise.json()).error, /7 decimal places/);

  const zero = await POST(
    jsonRequest("http://localhost/api/stellar/prepare-payment", {
      ...paymentPayload({ amount: "0" }),
    })
  );
  assert.equal(zero.status, 400);
  assert.match((await zero.json()).error, /greater than zero/);
});

test("prepare-payment rejects an unsupported asset", async () => {
  const { POST } = await import("../app/api/stellar/prepare-payment/route");
  const response = await POST(
    jsonRequest("http://localhost/api/stellar/prepare-payment", {
      ...paymentPayload({ assetCode: "DOGE" }),
    })
  );

  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /Unsupported asset/);
});

test("prepare-payment accepts an explicit asset contract address format", async () => {
  const { POST } = await import("../app/api/stellar/prepare-payment/route");
  const response = await POST(
    jsonRequest("http://localhost/api/stellar/prepare-payment", {
      ...paymentPayload({ assetCode: undefined, assetSac: "not-a-contract" }),
    })
  );

  assert.equal(response.status, 400);
  assert.match(
    (await response.json()).error,
    /not a valid Soroban contract id/
  );
});

test("submit-payment requires a signed envelope", async () => {
  const { POST } = await import("../app/api/stellar/submit-payment/route");

  const empty = await POST(
    jsonRequest("http://localhost/api/stellar/submit-payment", {})
  );
  assert.equal(empty.status, 400);
  assert.match((await empty.json()).error, /signed transaction envelope/);

  const malformed = await POST(
    jsonRequest("http://localhost/api/stellar/submit-payment", {
      signedXdr: "definitely-not-xdr",
    })
  );
  assert.equal(malformed.status, 400);
  assert.match((await malformed.json()).error, /could not be parsed/);
});

test("receipt route requires an id", async () => {
  const { GET } = await import("../app/api/stellar/receipt/route");
  const response = await GET(
    new Request("http://localhost/api/stellar/receipt")
  );

  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /Missing receipt id/);
});

test("ipfs route fails closed when PINATA_JWT is missing", async () => {
  delete process.env.PINATA_JWT;

  const { POST } = await import("../app/api/ipfs/route");
  const response = await POST(
    jsonRequest("http://localhost/api/ipfs", {
      receiptId: "rcpt-test-1",
      metadata: { receiptId: "rcpt-test-1", amount: "2.5" },
    })
  );

  assert.equal(response.status, 503);
  assert.match(
    (await response.json()).error,
    /IPFS pinning is not configured/
  );
});

test("account route requires an address", async () => {
  const { GET } = await import("../app/api/stellar/account/route");
  const response = await GET(
    new Request("http://localhost/api/stellar/account")
  );

  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /Missing account address/);
});
