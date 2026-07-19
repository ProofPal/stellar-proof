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
      // Fallback/Simulated CID for offline/unconfigured key scenario to ensure MVP never breaks
      console.warn("PINATA_JWT is not configured. Using simulated IPFS upload.");
      const mockCid = `QmYwAPzwh35SBaoafuiQQgNmoNd6STvtc6OcCcx5nBR5${Math.floor(Math.random() * 10)}`;
      return NextResponse.json({
        success: true,
        ipfsHash: mockCid,
        simulated: true,
        gatewayUrl: `https://gateway.pinata.cloud/ipfs/${mockCid}`
      });
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
          name: `ProofPal-Receipt-${receiptId}`,
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
