import {
  Address,
  Asset,
  BASE_FEE,
  Contract,
  StrKey,
  TransactionBuilder,
  nativeToScVal,
  rpc,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";
import {
  STELLARPROOF_CONTRACT_ID,
  STELLAR_NETWORK,
  hasDeployedContract,
  stroopsToXlm,
  xlmToStroops,
  type OnchainReceipt,
} from "@/lib/stellar";

/**
 * Server-side Stellar/Soroban helpers.
 *
 * Only API routes and scripts may import this module: the browser bundle never
 * needs the SDK, and wallet signing is handled client-side by Stellar Wallets
 * Kit.
 */

export class StellarApiError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "StellarApiError";
    this.status = status;
  }
}

export function requireContractId(): string {
  if (!hasDeployedContract) {
    throw new StellarApiError(
      "The StellarProof Soroban contract is not configured. Deploy it and set NEXT_PUBLIC_STELLARPROOF_CONTRACT_ID.",
      503
    );
  }
  return STELLARPROOF_CONTRACT_ID;
}

export function assertStellarAddress(address: string, label: string): string {
  try {
    if (!StrKey.isValidEd25519PublicKey(address.trim())) throw new Error();
  } catch {
    throw new StellarApiError(`${label} is not a valid Stellar account address.`);
  }
  return address.trim();
}

export interface PreparePaymentParams {
  sender: string;
  receiver: string;
  /** Human readable amount, e.g. "12.5". */
  amount: string;
  receiptId: string;
  ipfsHash: string;
  purpose: string;
  tokenSymbol?: string;
}

export interface PreparedPayment {
  xdr: string;
  networkPassphrase: string;
  amountStroops: string;
}

/**
 * Builds the Soroban `create_receipt` invocation. The contract moves the XLM
 * (through the native Stellar Asset Contract) and stores the receipt in the
 * same atomic call, so the user signs exactly one operation.
 */
export async function buildReceiptPayment(
  params: PreparePaymentParams
): Promise<PreparedPayment> {
  const contractId = requireContractId();
  const sender = assertStellarAddress(params.sender, "Sender");
  const receiver = assertStellarAddress(params.receiver, "Recipient");

  if (!params.receiptId?.trim()) {
    throw new StellarApiError("A receipt id is required.");
  }
  if (!params.ipfsHash?.trim()) {
    throw new StellarApiError("An IPFS CID is required before anchoring the receipt.");
  }
  if (!params.purpose?.trim()) {
    throw new StellarApiError("A payment purpose is required.");
  }

  let stroops: bigint;
  try {
    stroops = xlmToStroops(params.amount);
  } catch (err) {
    throw new StellarApiError(
      err instanceof Error ? err.message : "Invalid amount."
    );
  }
  if (stroops <= 0n) {
    throw new StellarApiError("Amount must be greater than zero.");
  }

  const server = new rpc.Server(STELLAR_NETWORK.rpcUrl);

  let source;
  try {
    source = await server.getAccount(sender);
  } catch {
    throw new StellarApiError(
      `This account is not funded on ${STELLAR_NETWORK.name}. Fund it with Friendbot (${STELLAR_NETWORK.friendbotUrl}) and try again.`
    );
  }

  // Native XLM is represented onchain by its Stellar Asset Contract address.
  const nativeToken = new Address(
    Asset.native().contractId(STELLAR_NETWORK.networkPassphrase)
  );

  const contract = new Contract(contractId);
  const transaction = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: STELLAR_NETWORK.networkPassphrase,
  })
    .addOperation(
      contract.call(
        "create_receipt",
        new Address(sender).toScVal(),
        nativeToScVal(params.receiptId, { type: "string" }),
        new Address(receiver).toScVal(),
        nativeToken.toScVal(),
        nativeToScVal(stroops, { type: "i128" }),
        nativeToScVal(params.tokenSymbol || STELLAR_NETWORK.nativeSymbol, {
          type: "string",
        }),
        nativeToScVal(params.ipfsHash, { type: "string" }),
        nativeToScVal(params.purpose, { type: "string" })
      )
    )
    .setTimeout(180)
    .build();

  let prepared;
  try {
    prepared = await server.prepareTransaction(transaction);
  } catch (err) {
    throw new StellarApiError(
      `Soroban simulation failed: ${
        err instanceof Error ? err.message : "unknown error"
      }`
    );
  }

  return {
    xdr: prepared.toXDR(),
    networkPassphrase: STELLAR_NETWORK.networkPassphrase,
    amountStroops: stroops.toString(),
  };
}

/** Submits a wallet-signed envelope and waits for a definitive result. */
export async function submitSignedTransaction(
  signedXdr: string
): Promise<{ txHash: string }> {
  if (!signedXdr?.trim()) {
    throw new StellarApiError("A signed transaction envelope is required.");
  }

  const server = new rpc.Server(STELLAR_NETWORK.rpcUrl);

  let transaction;
  try {
    transaction = TransactionBuilder.fromXDR(
      signedXdr,
      STELLAR_NETWORK.networkPassphrase
    );
  } catch {
    throw new StellarApiError("The signed transaction envelope could not be parsed.");
  }

  const sent = await server.sendTransaction(transaction);

  if (sent.status === "ERROR") {
    const detail = sent.errorResult
      ? sent.errorResult.toXDR("base64")
      : "unknown error";
    throw new StellarApiError(`Stellar rejected the transaction (${detail}).`);
  }

  const confirmation = await server.pollTransaction(sent.hash, { attempts: 30 });

  if (confirmation.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
    throw new StellarApiError(
      `Transaction ${sent.hash} did not succeed on ${STELLAR_NETWORK.name} (status: ${confirmation.status}).`
    );
  }

  return { txHash: sent.hash };
}

/**
 * Reads a receipt straight from Soroban contract storage.
 *
 * `getLedgerEntries` needs no funded account and no transaction simulation,
 * which keeps public verification stateless: the storage key of
 * `DataKey::Receipt(id)` is derived and requested directly from the network.
 */
export async function readReceiptOnchain(
  receiptId: string
): Promise<OnchainReceipt | null> {
  if (!hasDeployedContract || !receiptId) return null;

  try {
    const server = new rpc.Server(STELLAR_NETWORK.rpcUrl);
    const key = xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: xdr.ScAddress.scAddressTypeContract(
          new xdr.ContractId(StrKey.decodeContract(STELLARPROOF_CONTRACT_ID))
        ),
        key: xdr.ScVal.scvVec([
          xdr.ScVal.scvSymbol("Receipt"),
          nativeToScVal(receiptId, { type: "string" }),
        ]),
        durability: xdr.ContractDataDurability.persistent,
      })
    );

    const { entries } = await server.getLedgerEntries(key);
    const entry = entries[0];
    if (!entry || entry.val.type !== "contractData") return null;

    const value = scValToNative(entry.val.contractData.val) as
      | Record<string, unknown>
      | null;
    if (!value) return null;

    const stroops = BigInt((value.amount as bigint | string) ?? 0);

    return {
      receiptId: String(value.receipt_id ?? ""),
      sender: String(value.sender ?? ""),
      receiver: String(value.receiver ?? ""),
      amountStroops: stroops.toString(),
      amount: stroopsToXlm(stroops),
      tokenSymbol: String(value.token_symbol ?? STELLAR_NETWORK.nativeSymbol),
      ipfsHash: String(value.ipfs_hash ?? ""),
      timestamp: Number(value.timestamp ?? 0),
      purpose: String(value.purpose ?? ""),
    };
  } catch (error) {
    console.warn("Soroban receipt lookup failed:", error);
    return null;
  }
}
