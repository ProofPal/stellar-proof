import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query, receipts } = body;

    if (!query || !receipts || !Array.isArray(receipts)) {
      return NextResponse.json(
        { error: "Missing query or receipts list" },
        { status: 400 }
      );
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!geminiApiKey) {
      // Local keyword matching fallback for offline/demo scenario
      console.warn("GEMINI_API_KEY is not configured. Running regex-based search filter.");
      
      const q = query.toLowerCase();
      const filtered = receipts.filter((r: any) => {
        // Match simple keywords
        const purposeMatch = r.purpose?.toLowerCase().includes(q) || r.aiTitle?.toLowerCase().includes(q);
        const categoryMatch = r.category?.toLowerCase().includes(q);
        const tagMatch = r.aiTags?.some((t: string) => t.toLowerCase().includes(q));
        const addressMatch = r.sender?.toLowerCase().includes(q) || r.receiver?.toLowerCase().includes(q);
        
        // Match approximate amount
        let amountMatch = false;
        const amountNum = parseFloat(r.amount);
        
        // e.g. "above 5" -> amount > 5
        const aboveMatch = q.match(/above\s+(\d+(\.\d+)?)/) || q.match(/more\s+than\s+(\d+(\.\d+)?)/) || q.match(/>\s*(\d+(\.\d+)?)/);
        const belowMatch = q.match(/below\s+(\d+(\.\d+)?)/) || q.match(/less\s+than\s+(\d+(\.\d+)?)/) || q.match(/<\s*(\d+(\.\d+)?)/);
        
        if (aboveMatch) {
          const limit = parseFloat(aboveMatch[1]);
          amountMatch = amountNum > limit;
        } else if (belowMatch) {
          const limit = parseFloat(belowMatch[1]);
          amountMatch = amountNum < limit;
        }

        // Match approximate date (e.g. "july", "june", "2026")
        let dateMatch = false;
        const dateStr = new Date(r.timestamp * 1000).toLocaleString('en-US', { month: 'long', year: 'numeric' }).toLowerCase();
        if (dateStr.includes(q) || q.includes(dateStr.split(' ')[0])) {
          dateMatch = true;
        }

        return purposeMatch || categoryMatch || tagMatch || addressMatch || amountMatch || dateMatch;
      });

      return NextResponse.json({
        success: true,
        matchingIds: filtered.map((r: any) => r.id),
        simulated: true
      });
    }

    // Call Gemini to match receipts using Natural Language
    const receiptsShortList = receipts.map((r: any) => ({
      id: r.id,
      amount: r.amount,
      tokenSymbol: r.tokenSymbol,
      purpose: r.purpose,
      category: r.category,
      aiTitle: r.aiTitle,
      aiTags: r.aiTags,
      sender: r.sender,
      receiver: r.receiver,
      date: new Date(r.timestamp * 1000).toLocaleDateString()
    }));

    const prompt = `
Given a user natural language search query and a list of cryptocurrency receipts, return the array of receipt IDs that match the search criteria.
Search query: "${query}"
Receipts data:
${JSON.stringify(receiptsShortList, null, 2)}

Match criteria can include amounts (e.g. "above 5 MON"), dates (e.g. "in July", "yesterday"), categories, tags, sender/receiver, or purpose keywords.
Return only a JSON array of strings containing the matching receipt IDs.
Example output format:
["receipt-uuid-1", "receipt-uuid-2"]

Response must be pure JSON. Do not include markdown code block formatting or backticks. Only return the JSON array.
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

    const matchingIds = JSON.parse(resultText.trim());
    return NextResponse.json({ success: true, matchingIds });

  } catch (error: any) {
    console.error("AI Search Route Error:", error);
    // Simple fallback to returning all IDs on critical failure so dashboard doesn't blank out
    return NextResponse.json({
      success: true,
      matchingIds: receipts.map((r: any) => r.id),
      error: error.message
    });
  }
}
