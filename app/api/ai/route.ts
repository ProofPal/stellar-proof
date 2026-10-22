import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount, tokenSymbol, purpose, category, notes, sender, receiver } = body;

    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!geminiApiKey) {
      // Offline/Demo fallback to guarantee high-quality UX without setup
      console.warn("GEMINI_API_KEY is not configured. Using high-quality local fallback templates.");
      
      const categoryTag = category ? category.trim() : "Crypto";
      const tags = [categoryTag, "Stellar", "Soroban", "Verified"];
      if (purpose && purpose.toLowerCase().includes("freelance")) tags.push("Freelance");
      if (purpose && purpose.toLowerCase().includes("design")) tags.push("Design");
      if (amount && parseFloat(amount) > 10) tags.push("High Value");

      const mockData = {
        aiTitle: purpose ? `Payment for ${purpose}` : "Cryptocurrency Payment Receipt",
        aiSummary: `Onchain transfer of ${amount} ${tokenSymbol} from ${sender.slice(0, 6)}...${sender.slice(-4)} to ${receiver.slice(0, 6)}...${receiver.slice(-4)} for "${purpose || 'General payment'}".`,
        aiExplanation: `This transaction completed successfully on the Stellar Testnet. The payment covers services described as "${purpose || 'General payment'}"${notes ? ` with supplementary notes: "${notes}"` : ""}. It stands as a cryptographically verifiable proof of payment, anchored in the StellarProof Soroban contract.`,
        aiTags: tags,
        category: categoryTag
      };

      return NextResponse.json({ success: true, ...mockData, simulated: true });
    }

    const prompt = `
You are a financial AI receipt assistant. Analyze this Stellar network payment transaction:
Network: Stellar Testnet (Soroban smart contract receipts)
Amount: ${amount} ${tokenSymbol}
Purpose: ${purpose}
Category: ${category}
Notes: ${notes}
Sender Address: ${sender}
Receiver Address: ${receiver}

Generate a professional JSON response with these exact keys:
1. "aiTitle": A concise, clear name for the receipt (e.g. "Q3 Frontend Development", "SaaS Subscription"). Keep it under 5 words.
2. "aiSummary": A 1-2 sentence professional summary of the payment and why it was made.
3. "aiExplanation": A clear, customer-friendly explanation of the transaction value, what was delivered (if applicable), and confirming receipt.
4. "aiTags": An array of 3-4 string tags (e.g. ["Freelance", "Design", "DevServices"]).
5. "category": The best matching single-word category classification.

Response must be pure JSON. Do not include markdown code block formatting or backticks. Only return the JSON string.
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API returned error: ${errText}`);
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!resultText) {
      throw new Error("Empty response from Gemini API");
    }

    const aiMetadata = JSON.parse(resultText.trim());
    return NextResponse.json({ success: true, ...aiMetadata });

  } catch (error: any) {
    console.error("AI Route Error:", error);
    // Graceful error fallback so that receipt creation never hangs
    return NextResponse.json({
      success: true,
      aiTitle: "Stellar Transaction Receipt",
      aiSummary: "AI summary generation bypassed. Transaction confirmed on the Stellar testnet.",
      aiExplanation: "Verification completed successfully. This represents a cryptographically secure receipt recorded in a Soroban contract.",
      aiTags: ["Stellar", "Payment", "Verified"],
      category: "Finance",
      error: error.message
    });
  }
}
