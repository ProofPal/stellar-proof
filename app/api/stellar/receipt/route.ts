import { NextResponse } from "next/server";
import { readReceiptOnchain } from "@/lib/stellar-server";

export const dynamic = "force-dynamic";
// Stellar RPC and Horizon responses must always be live (no Next data cache).
export const fetchCache = "force-no-store";

/**
 * Reads `DataKey::Receipt(id)` directly from Soroban contract storage using
 * `getLedgerEntries`. No wallet, account or indexer is involved.
 */
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing receipt id." }, { status: 400 });
  }

  try {
    const receipt = await readReceiptOnchain(id);
    return NextResponse.json({ success: true, receipt });
  } catch (error) {
    console.error("Soroban receipt read error:", error);
    return NextResponse.json(
      { error: "Unable to read the receipt from Stellar." },
      { status: 500 }
    );
  }
}
