import {
  Address,
  Asset,
  BASE_FEE,
  Contract,
  Horizon,
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
  getAssetOption,
  hasDeployedContract,
  stroopsToXlm,
  xlmToStroops,
  type AccountSummary,
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
  /** Asset code offered by the app (XLM, USDC, ...). Defaults to XLM. */
  assetCode?: string;
  /** Explicit Stellar Asset Contract address, for any other asset. */
  assetSac?: string;
  tokenSymbol?: string;
}

interface ResolvedAsset {
  code: string;
  issuer?: string;
  /** Stellar Asset Contract address that holds the asset on Soroban. */
  tokenSac: string;
}

/**
 * Maps an asset code (or an explicit SAC address) to the token contract the
 * Soroban receipt registry should move funds through.
 */
export function resolveAsset(params: {
  assetCode?: string;
  assetSac?: string;
  tokenSymbol?: string;
}): ResolvedAsset {
  if (params.assetSac?.trim()) {
    const sac = params.assetSac.trim();
    if (!/^C[A-Z2-7]{55}$/.test(sac)) {
      throw new StellarApiError(
        "The provided asset contract address is not a valid Soroban contract id."
      );
    }
    return {
      code: (params.tokenSymbol || "TOKEN").trim().toUpperCase(),
      tokenSac: sac,
    };
  }

  const code = (params.assetCode || params.tokenSymbol || "XLM")
    .trim()
    .toUpperCase();

  if (code === "XLM") {
    return {
      code,
      tokenSac: Asset.native().contractId(STELLAR_NETWORK.networkPassphrase),
    };
  }

  const option = getAssetOption(code);
  if (!option?.issuer) {
    throw new StellarApiError(
      `Unsupported asset "${code}". Add its issuer to SUPPORTED_ASSETS or pass an explicit SAC address.`
    );
  }

  return {
    code,
    issuer: option.issuer,
    tokenSac: new Asset(code, option.issuer).contractId(
      STELLAR_NETWORK.networkPassphrase
    ),
  };
}

/**
 * Checks the payer's balance and trustline before building the transaction so
 * the user gets an actionable message instead of a raw simulation error.
 */
async function assertPaymentCapacity(
  sender: string,
  amountStroops: bigint,
  asset: ResolvedAsset
): Promise<void> {
  const horizon = new Horizon.Server(STELLAR_NETWORK.horizonUrl);

  let account: Horizon.AccountResponse;
  try {
    account = await horizon.loadAccount(sender);
  } catch {
    throw new StellarApiError(
      `This account is not funded on ${STELLAR_NETWORK.name}. Fund it with Friendbot (${STELLAR_NETWORK.friendbotUrl}) and try again.`
    );
  }

  if (asset.code === "XLM" && !asset.issuer) {
    const native = account.balances.find((b) => b.asset_type === "native");
    const balance = native ? xlmToStroops(native.balance) : 0n;

    if (balance < amountStroops) {
      throw new StellarApiError(
        `Insufficient XLM balance: ${stroopsToXlm(balance)} XLM available, ${stroopsToXlm(amountStroops)} XLM requested.`
      );
    }
    return;
  }

  if (!asset.issuer) {
    // The caller passed a raw SAC address, so the issuer (and therefore the
    // trustline to compare against) is unknown here. Simulation remains the
    // authoritative check for those assets.
    return;
  }

  const trustline = account.balances.find(
    (b): b is Horizon.HorizonApi.BalanceLineAsset =>
      b.asset_type !== "native" &&
      b.asset_type !== "liquidity_pool_shares" &&
      b.asset_code === asset.code &&
      b.asset_issuer === asset.issuer
  );

  if (!trustline) {
    throw new StellarApiError(
      `This account has no ${asset.code} trustline. Add a ${asset.code} trustline in your wallet before paying with ${asset.code}.`
    );
  }

  if (xlmToStroops(trustline.balance) < amountStroops) {
    throw new StellarApiError(
      `Insufficient ${asset.code} balance: ${trustline.balance} ${asset.code} available.`
    );
  }
}

export interface PreparedPayment {
  xdr: string;
  networkPassphrase: string;
  amountStroops: string;
}

/**
 * Builds the Soroban `create_receipt` invocation. The contract moves the asset
 * (native XLM by default, through its Stellar Asset Contract) and stores the
 * receipt in the same atomic call, so the user signs exactly one operation.
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

  // Resolve the asset (native XLM by default) to its Stellar Asset Contract.
  const asset = resolveAsset(params);
  await assertPaymentCapacity(sender, stroops, asset);

  const server = new rpc.Server(STELLAR_NETWORK.rpcUrl);

  let source;
  try {
    source = await server.getAccount(sender);
  } catch {
    throw new StellarApiError(
      `This account is not funded on ${STELLAR_NETWORK.name}. Fund it with Friendbot (${STELLAR_NETWORK.friendbotUrl}) and try again.`
    );
  }

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
        new Address(asset.tokenSac).toScVal(),
        nativeToScVal(stroops, { type: "i128" }),
        nativeToScVal(asset.code, { type: "string" }),
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
    const detail = err instanceof Error ? err.message : "unknown error";

    // A Stellar Asset Contract only exists once it has been deployed on the
    // network; the host reports that as a missing contract instance.
    if (/MissingValue|non-existing value for contract instance/.test(detail)) {
      throw new StellarApiError(
        `The ${asset.code} Stellar Asset Contract is not deployed on ${STELLAR_NETWORK.name}. Deploy it (stellar contract asset deploy --asset ${asset.code}:${asset.issuer ?? "<issuer>"}) and try again.`
      );
    }

    throw new StellarApiError(`Soroban simulation failed: ${detail}`);
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
 * Returns the payer's balances plus a network fee estimate for the form.
 */
export async function getAccountSummary(
  address: string
): Promise<AccountSummary> {
  const account = assertStellarAddress(address, "Account");
  const horizon = new Horizon.Server(STELLAR_NETWORK.horizonUrl);

  let horizonAccount: Horizon.AccountResponse;
  try {
    horizonAccount = await horizon.loadAccount(account);
  } catch {
    throw new StellarApiError(
      `This account is not funded on ${STELLAR_NETWORK.name}. Fund it with Friendbot (${STELLAR_NETWORK.friendbotUrl}) and try again.`,
      404
    );
  }

  const native = horizonAccount.balances.find(
    (b) => b.asset_type === "native"
  );
  const balance = native ? xlmToStroops(native.balance) : 0n;

  // Base reserve is 0.5 XLM per entry: 2 for the account, 1 per subentry.
  const reserve =
    BigInt(2 + (horizonAccount.subentry_count ?? 0)) * 5_000_000n;
  const spendable = balance > reserve ? balance - reserve : 0n;

  const assets = horizonAccount.balances
    .filter(
      (b): b is Horizon.HorizonApi.BalanceLineAsset =>
        b.asset_type !== "native" && b.asset_type !== "liquidity_pool_shares"
    )
    .map((b) => ({
      code: b.asset_code,
      balance: b.balance,
      issuer: b.asset_issuer,
    }));

  let inclusionFee = 0n;
  try {
    const feeStats = await new rpc.Server(
      STELLAR_NETWORK.rpcUrl
    ).getFeeStats();
    inclusionFee = BigInt(feeStats.sorobanInclusionFee.p50 || "0");
  } catch {
    // Fee stats are best effort; the wallet shows the final fee anyway.
  }

  const feeEstimate = BigInt(BASE_FEE) + inclusionFee;

  return {
    address: account,
    balanceXlm: stroopsToXlm(balance),
    spendableXlm: stroopsToXlm(spendable),
    reserveXlm: stroopsToXlm(reserve),
    assets,
    feeEstimateXlm: stroopsToXlm(feeEstimate),
    feeEstimateStroops: feeEstimate.toString(),
  };
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
