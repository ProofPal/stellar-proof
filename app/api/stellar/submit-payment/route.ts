import { NextResponse } from "next/server";
import { StellarApiError, submitSignedTransaction } from "@/lib/stellar-server";

export const dynamic = "force-dynamic";

/**
 * Submits the wallet-signed envelope to Soroban RPC and waits for the
 * transaction to reach a definitive state before returning its hash.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await submitSignedTransaction(body.signedXdr);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof StellarApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("Submit payment error:", error);
    return NextResponse.json(
      {
        error:
          "The signed transaction could not be submitted to the Stellar network.",
      },
      { status: 500 }
    );
  }
}
