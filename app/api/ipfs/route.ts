import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { receiptId, metadata } = body;

    if (!receiptId || !metadata) {
      return NextResponse.json(
        { error: "Missing receiptId or metadata" },
        { status: 400 }
      );
    }

    const pinataJwt = process.env.PINATA_JWT;

    if (!pinataJwt) {
      // Live mode must never anchor a CID that does not resolve to pinned JSON.
      return NextResponse.json(
        {
          error:
            "IPFS pinning is not configured. Set PINATA_JWT before using live mode.",
        },
        { status: 503 }
      );
    }

    const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${pinataJwt}`,
      },
      body: JSON.stringify({
        pinataContent: metadata,
        pinataMetadata: {
          name: `StellarProof-Receipt-${receiptId}`,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { error: `Pinata API error: ${errText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      ipfsHash: data.IpfsHash,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`
    });

  } catch (error: any) {
    console.error("IPFS Route Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
