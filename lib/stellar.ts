/**
 * Shared Stellar configuration and helpers.
 *
 * This module intentionally has **no** dependency on `@stellar/stellar-sdk`:
 * it is imported by client components, and the SDK is reserved for server-side
 * transaction assembly (`lib/stellar-server.ts`) and API routes.
 */

/**
 * Everything in StellarProof targets the Stellar network. Soroban (Stellar's
 * smart contract runtime) holds the receipt registry, and payments settle
 * natively in XLM.
 */
export const STELLAR_NETWORK = {
  name: "Stellar Testnet",
  networkPassphrase: "Test SDF Network ; September 2015",
  rpcUrl:
    process.env.NEXT_PUBLIC_STELLAR_RPC_URL || "https://soroban-testnet.stellar.org",
  horizonUrl:
    process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL ||
    "https://horizon-testnet.stellar.org",
  explorerUrl: "https://stellar.expert/explorer/testnet",
  friendbotUrl: "https://friendbot.stellar.org",
  nativeSymbol: "XLM",
};

/** Deployed Soroban contract id (`C...`). Read from the environment at build time. */
export const STELLARPROOF_CONTRACT_ID =
  process.env.NEXT_PUBLIC_STELLARPROOF_CONTRACT_ID || "";

/** True when a contract id is configured, so onchain reads/writes are possible. */
export const hasDeployedContract = /^C[A-Z2-7]{55}$/.test(
  STELLARPROOF_CONTRACT_ID
);

/** Stellar assets have 7 decimal places (1 XLM = 10,000,000 stroops). */
export const STROOPS_PER_UNIT = 10_000_000n;

/** Circle's USDC issuer on Stellar Testnet. */
export const TESTNET_USDC_ISSUER =
  process.env.NEXT_PUBLIC_USDC_ISSUER ||
  "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

export interface AssetOption {
  code: string;
  label: string;
  /** Undefined for the native asset (XLM). */
  issuer?: string;
}

/** Assets offered in the payment form. */
export const SUPPORTED_ASSETS: AssetOption[] = [
  { code: "XLM", label: "Stellar Lumens" },
  { code: "USDC", label: "USD Coin", issuer: TESTNET_USDC_ISSUER },
];

export function getAssetOption(code: string): AssetOption | undefined {
  return SUPPORTED_ASSETS.find(
    (asset) => asset.code === code.trim().toUpperCase()
  );
}

export interface AccountAssetBalance {
  code: string;
  balance: string;
  issuer?: string;
}

export interface AccountSummary {
  address: string;
  balanceXlm: string;
  spendableXlm: string;
  reserveXlm: string;
  assets: AccountAssetBalance[];
  feeEstimateXlm: string;
  feeEstimateStroops: string;
}

/** Fetches balances and a network fee estimate for the connected account. */
export async function fetchAccountSummary(
  address: string
): Promise<AccountSummary | null> {
  try {
    const response = await fetch(
      `/api/stellar/account?address=${encodeURIComponent(address)}`,
      { cache: "no-store" }
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data.account ?? null;
  } catch (error) {
    console.warn("Stellar account summary failed:", error);
    return null;
  }
}

export interface OnchainReceipt {
  receiptId: string;
  sender: string;
  receiver: string;
  /** Amount in stroops, string encoded for safe transport. */
  amountStroops: string;
  amount: string;
  tokenSymbol: string;
  ipfsHash: string;
  timestamp: number;
  purpose: string;
}

/**
 * Format-level check for a Stellar account address.
 * The API routes re-validate with `StrKey` before touching the network.
 */
export function isValidStellarAddress(address: string): boolean {
  return /^G[A-Z2-7]{55}$/.test(address.trim());
}

export function truncateAddress(address: string, visible = 4): string {
  if (address.length <= visible * 2 + 3) return address;
  return `${address.slice(0, visible + 1)}...${address.slice(-visible)}`;
}

/** Converts a human readable amount into stroops, rejecting bad precision. */
export function xlmToStroops(amount: string): bigint {
  const normalized = amount.trim();
  if (!/^\d+(\.\d{1,7})?$/.test(normalized)) {
    throw new Error(
      "Amount must be a positive number with at most 7 decimal places."
    );
  }

  const [whole, fraction = ""] = normalized.split(".");
  const padded = (fraction + "0000000").slice(0, 7);
  return BigInt(whole) * STROOPS_PER_UNIT + BigInt(padded);
}

/** Converts stroops into a display amount, trimming trailing zeroes. */
export function stroopsToXlm(stroops: bigint | number | string): string {
  const value = BigInt(stroops);
  const whole = value / STROOPS_PER_UNIT;
  const fraction = (value % STROOPS_PER_UNIT)
    .toString()
    .padStart(7, "0")
    .replace(/0+$/, "");

  return fraction ? `${whole}.${fraction}` : whole.toString();
}

/**
 * Asks the server to read the receipt from Soroban contract storage. Returns
 * `null` when the contract is not configured or the receipt is not anchored.
 */
export async function fetchReceiptFromApi(
  receiptId: string
): Promise<OnchainReceipt | null> {
  try {
    const response = await fetch(
      `/api/stellar/receipt?id=${encodeURIComponent(receiptId)}`,
      { cache: "no-store" }
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data.receipt ?? null;
  } catch (error) {
    console.warn("Soroban receipt lookup failed:", error);
    return null;
  }
}

export function explorerTxUrl(txHash: string): string {
  return `${STELLAR_NETWORK.explorerUrl}/tx/${txHash}`;
}

export function explorerAccountUrl(address: string): string {
  return `${STELLAR_NETWORK.explorerUrl}/account/${address}`;
}

export function explorerContractUrl(contractId: string): string {
  return `${STELLAR_NETWORK.explorerUrl}/contract/${contractId}`;
}
