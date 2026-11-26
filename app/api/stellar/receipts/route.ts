import { NextResponse } from "next/server";
import { StellarApiError, readReceiptsByUser } from "@/lib/stellar-server";

export const dynamic = "force-dynamic";
// Stellar RPC responses must always be live (no Next data cache).
export const fetchCache = "force-no-store";

/**
 * Reads a page of an account's receipt history from the Soroban index instead
 * of the browser cache, so a new device sees the same records.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const address = params.get("address");

  if (!address) {
    return NextResponse.json(
      { error: "Missing account address." },
      { status: 400 }
    );
  }

  const start = Number(params.get("start") ?? "0");
  const limit = Number(params.get("limit") ?? "20");

  try {
    const history = await readReceiptsByUser(address, start, limit);
    return NextResponse.json({ success: true, ...history });
  } catch (error) {
    if (error instanceof StellarApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("Soroban history error:", error);
    return NextResponse.json(
      { error: "Unable to read the receipt history from Stellar." },
      { status: 500 }
    );
  }
}
