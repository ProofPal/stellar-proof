import { NextResponse } from "next/server";
import { StellarApiError, getAccountSummary } from "@/lib/stellar-server";

export const dynamic = "force-dynamic";
// Stellar RPC and Horizon responses must always be live (no Next data cache).
export const fetchCache = "force-no-store";

/**
 * Returns the account's XLM balance, any asset balances (USDC, ...), the
 * spendable amount after the base reserve, and a network fee estimate for the
 * payment form.
 */
export async function GET(request: Request) {
  const address = new URL(request.url).searchParams.get("address");

  if (!address) {
    return NextResponse.json(
      { error: "Missing account address." },
      { status: 400 }
    );
  }

  try {
    const account = await getAccountSummary(address);
    return NextResponse.json({ success: true, account });
  } catch (error) {
    if (error instanceof StellarApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("Account summary error:", error);
    return NextResponse.json(
      { error: "Unable to load the Stellar account." },
      { status: 500 }
    );
  }
}
