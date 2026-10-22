// Simulate a deployment without NEXT_PUBLIC_STELLARPROOF_CONTRACT_ID set.
process.env.NEXT_PUBLIC_STELLARPROOF_CONTRACT_ID = "";

import test from "node:test";
import assert from "node:assert/strict";

const SENDER = "GAXJ2ZSRTYP5233UYEBUOSDLYBJ65Q3XH2Z5UMAJ46SA26NEXATJ3SLV";
const RECEIVER = "GAE6JHVF7TOZ3SDQHT5JMIKP67BLBP3NOSNRL5GSOL2NJZNU7UNCIUMC";

test("prepare-payment reports an unconfigured contract", async () => {
  const { POST } = await import("../app/api/stellar/prepare-payment/route");
  const response = await POST(
    new Request("http://localhost/api/stellar/prepare-payment", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sender: SENDER,
        receiver: RECEIVER,
        amount: "2.5",
        receiptId: "rcpt-test-1",
        ipfsHash: "QmTestCid",
        purpose: "Unit test payment",
        assetCode: "XLM",
      }),
    })
  );

  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /not configured/i);
});

test("receipt route returns null without a contract id", async () => {
  const { GET } = await import("../app/api/stellar/receipt/route");
  const response = await GET(
    new Request("http://localhost/api/stellar/receipt?id=rcpt-missing")
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, receipt: null });
});

test("account route rejects an invalid address before any network call", async () => {
  const { GET } = await import("../app/api/stellar/account/route");
  const response = await GET(
    new Request("http://localhost/api/stellar/account?address=0xdeadbeef")
  );

  assert.equal(response.status, 400);
  assert.match(
    (await response.json()).error,
    /not a valid Stellar account address/
  );
});
