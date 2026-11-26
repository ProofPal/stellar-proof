import { NextResponse } from "next/server";
import {
  StellarApiError,
  buildReceiptAcknowledgement,
} from "@/lib/stellar-server";

export const dynamic = "force-dynamic";
// Stellar RPC responses must always be live (no Next data cache).
export const fetchCache = "force-no-store";

/**
 * Builds and simulates `acknowledge_receipt` for the recorded recipient. The
 * connected account signs the envelope and submits it through
 * `/api/stellar/submit-payment`, so there is one signing and submission path.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const prepared = await buildReceiptAcknowledgement({
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

    console.error("Prepare acknowledgement error:", error);
    return NextResponse.json(
      { error: "Unable to prepare the receipt acknowledgement." },
      { status: 500 }
    );
  }
}
