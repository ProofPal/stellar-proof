import { readFileSync } from "node:fs";
import path from "node:path";
import "dotenv/config";
import {
  Address,
  BASE_FEE,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
  hash,
  rpc,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";

const RPC_URL =
  process.env.STELLAR_RPC_URL || "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE =
  process.env.STELLAR_NETWORK_PASSPHRASE || (Networks.TESTNET as string);
const WASM_PATH =
  process.env.STELLARPROOF_WASM_PATH ||
  path.join(
    "target",
    "wasm32v1-none",
    "release",
    "stellarproof_receipts.wasm"
  );

const server = new rpc.Server(RPC_URL);

async function submit(keypair: Keypair, operation: xdr.Operation) {
  const account = await server.getAccount(keypair.publicKey());
  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(operation)
    .setTimeout(120)
    .build();

  const prepared = await server.prepareTransaction(transaction);
  prepared.sign(keypair);

  const sent = await server.sendTransaction(prepared);
  if (sent.status === "ERROR") {
    const detail = sent.errorResult
      ? sent.errorResult.toXDR("base64")
      : "unknown error";
    throw new Error(`Stellar rejected the transaction: ${detail}`);
  }

  const result = await server.pollTransaction(sent.hash, { attempts: 30 });
  if (result.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
    throw new Error(`Transaction ${sent.hash} failed with status ${result.status}`);
  }

  return result;
}

async function main() {
  const secret = process.env.STELLAR_DEPLOYER_SECRET;
  if (!secret) {
    throw new Error(
      "STELLAR_DEPLOYER_SECRET is not set. Add the secret key (S...) of a funded Stellar Testnet account to your .env file."
    );
  }

  const deployer = Keypair.fromSecret(secret);
  console.log(`Deploying StellarProof receipts contract from ${deployer.publicKey()}`);
  console.log(`RPC: ${RPC_URL}`);

  const wasm = readFileSync(path.resolve(WASM_PATH));
  console.log(`Loaded WASM: ${WASM_PATH} (${wasm.length} bytes)`);

  console.log("Installing contract WASM onchain...");
  const installResult = await submit(
    deployer,
    Operation.uploadContractWasm({ wasm })
  );
  console.log(`WASM install tx: ${installResult.txHash ?? "(see ledger)"}`);

  const wasmHash = hash(wasm);
  console.log(`WASM hash: ${Buffer.from(wasmHash).toString("hex")}`);

  console.log("Creating contract instance...");
  const deployResult = await submit(
    deployer,
    Operation.createCustomContract({
      address: new Address(deployer.publicKey()),
      wasmHash,
    })
  );

  const returnValue = deployResult.returnValue;
  const contractId = returnValue ? String(scValToNative(returnValue)) : "";

  if (!contractId.startsWith("C")) {
    throw new Error(
      "Contract deployed but the contract id could not be read from the transaction result. Check the deployer account on Stellar Expert."
    );
  }

  console.log("");
  console.log("StellarProof contract deployed successfully.");
  console.log(`Contract ID: ${contractId}`);
  console.log("");
  console.log("Add this line to your .env file:");
  console.log(`NEXT_PUBLIC_STELLARPROOF_CONTRACT_ID=${contractId}`);
  console.log(
    `Explorer: https://stellar.expert/explorer/testnet/contract/${contractId}`
  );
}

main().catch((error) => {
  console.error("Deployment failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
