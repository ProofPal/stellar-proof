import { NextResponse } from "next/server";
import { StellarApiError, buildReceiptPayment } from "@/lib/stellar-server";

export const dynamic = "force-dynamic";
// Stellar RPC and Horizon responses must always be live (no Next data cache).
export const fetchCache = "force-no-store";

/**
 * Builds and simulates the atomic Stellar transaction (XLM payment + Soroban
 * `create_receipt`) and returns the unsigned envelope for the wallet to sign.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const prepared = await buildReceiptPayment({
      sender: body.sender,
      receiver: body.receiver,
      amount: body.amount,
      receiptId: body.receiptId,
      ipfsHash: body.ipfsHash,
      purpose: body.purpose,
      assetCode: body.assetCode,
      assetSac: body.assetSac,
      tokenSymbol: body.tokenSymbol,
    });

    return NextResponse.json({ success: true, ...prepared });
  } catch (error) {
    if (error instanceof StellarApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("Prepare payment error:", error);
    return NextResponse.json(
      { error: "Unable to prepare the Stellar transaction." },
      { status: 500 }
    );
  }
}
