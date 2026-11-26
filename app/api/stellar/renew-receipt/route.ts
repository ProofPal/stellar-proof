import { NextResponse } from "next/server";
import { StellarApiError, buildReceiptRenewal } from "@/lib/stellar-server";

export const dynamic = "force-dynamic";
// Stellar RPC responses must always be live (no Next data cache).
export const fetchCache = "force-no-store";

/**
 * Builds and simulates the permissionless `bump_receipt` call that extends a
 * receipt's persistent storage. The connected account signs the envelope and
 * submits it through `/api/stellar/submit-payment`.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const prepared = await buildReceiptRenewal({
      account: body.account,
      receiptId: body.receiptId,
    });

    return NextResponse.json({ success: true, ...prepared });
  } catch (error) {
    if (error instanceof StellarApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("Prepare renewal error:", error);
    return NextResponse.json(
      { error: "Unable to prepare the receipt renewal." },
      { status: 500 }
    );
  }
}
