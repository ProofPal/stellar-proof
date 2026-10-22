import { supabase } from "./supabase";

export interface ReceiptData {
  id: string;
  sender: string;
  receiver: string;
  amount: string;
  tokenSymbol: string;
  ipfsHash: string;
  timestamp: number; // UNIX timestamp
  txHash: string;
  purpose: string;
  category: string;
  notes?: string;
  aiTitle: string;
  aiSummary: string;
  aiExplanation: string;
  aiTags: string[];
}

const LOCAL_STORAGE_KEY = "stellarproof_receipts";

/**
 * Gets all receipts from localStorage (offline storage).
 */
export function getLocalReceipts(): ReceiptData[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!stored) return getMockReceipts(); // Seed the dashboard on first load
  try {
    return JSON.parse(stored);
  } catch (e) {
    console.error("Failed to parse local receipts:", e);
    return getMockReceipts();
  }
}

/**
 * Saves a new receipt to offline storage and syncs it to Supabase if credentials exist.
 */
export async function saveReceipt(receipt: ReceiptData): Promise<boolean> {
  if (typeof window === "undefined") return false;

  // 1. Save to localStorage
  const local = getLocalReceipts().filter((r) => r.id !== receipt.id);
  local.unshift(receipt); // Add to beginning of list
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(local));

  // 2. Sync to Supabase in background
  try {
    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://your-project.supabase.co";

    if (isSupabaseConfigured) {
      const { error } = await supabase.from("receipts").insert([
        {
          id: receipt.id,
          sender: receipt.sender,
          receiver: receipt.receiver,
          amount: parseFloat(receipt.amount),
          token_symbol: receipt.tokenSymbol,
          ipfs_hash: receipt.ipfsHash,
          timestamp: new Date(receipt.timestamp * 1000).toISOString(),
          tx_hash: receipt.txHash,
          purpose: receipt.purpose,
          category: receipt.category,
          notes: receipt.notes || "",
          ai_title: receipt.aiTitle,
          ai_summary: receipt.aiSummary,
          ai_explanation: receipt.aiExplanation,
          ai_tags: receipt.aiTags,
        },
      ]);

      if (error) {
        console.error("Supabase sync failed:", error.message);
        return false;
      }
      console.log("Supabase sync successful!");
    }
  } catch (err) {
    console.error("Error during Supabase sync:", err);
  }

  return true;
}

/**
 * Reset local storage cache.
 */
export function clearLocalCache() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }
}

/**
 * Sample Stellar Testnet receipts so the dashboard is populated on first launch.
 */
function getMockReceipts(): ReceiptData[] {
  return [
    {
      id: "rcpt-55a29f8a",
      sender: "GAXJ2ZSRTYP5233UYEBUOSDLYBJ65Q3XH2Z5UMAJ46SA26NEXATJ3SLV",
      receiver: "GAXSFFU2UVEO2V2EXXPMCQGG5U3TPAYP36IBYNBM37Y3UPT2VCEQC427",
      amount: "15.5",
      tokenSymbol: "XLM",
      ipfsHash: "QmYwAPzwh35SBaoafuiQQgNmoNd6STvtc6OcCcx5nBR51",
      timestamp: Math.floor(Date.now() / 1000) - 86400 * 2, // 2 days ago
      txHash:
        "8f2d5a3f12ab56ef8f2c3d5a1098ef7ca5b678de0987f65eaef43a21bc98ef76",
      purpose: "Soroban Contract Audit Service",
      category: "Security",
      notes: "Audit report completed for the receipts contract.",
      aiTitle: "Soroban Contract Audit",
      aiSummary:
        "Payment of 15.5 XLM for a Soroban smart contract security audit.",
      aiExplanation:
        "This payment covers the review of the StellarProof Rust contracts. Security review completed with zero critical findings outstanding.",
      aiTags: ["Security", "Audit", "Soroban", "Business"],
    },
    {
      id: "rcpt-c19b8823",
      sender: "GAXJ2ZSRTYP5233UYEBUOSDLYBJ65Q3XH2Z5UMAJ46SA26NEXATJ3SLV",
      receiver: "GAE6JHVF7TOZ3SDQHT5JMIKP67BLBP3NOSNRL5GSOL2NJZNU7UNCIUMC",
      amount: "3.2",
      tokenSymbol: "XLM",
      ipfsHash: "QmYwAPzwh35SBaoafuiQQgNmoNd6STvtc6OcCcx5nBR52",
      timestamp: Math.floor(Date.now() / 1000) - 86400 * 5, // 5 days ago
      txHash:
        "3bc98ea76ef543a21bc98ef76a8f2d5a3f12ab56ef8f2c3d5a1098ef7ca5b678",
      purpose: "UX/UI Design Consultation",
      category: "Design",
      notes: "Figma workshop and landing page wireframes.",
      aiTitle: "Design Consultation",
      aiSummary: "Payment for a 2-hour Figma wireframing and design session.",
      aiExplanation:
        "Covers the standard consultation rate for landing page user flow optimizations and visual style system creation.",
      aiTags: ["Design", "UX", "Freelance", "Figma"],
    },
    {
      id: "rcpt-d492aa7f",
      sender: "GAE6JHVF7TOZ3SDQHT5JMIKP67BLBP3NOSNRL5GSOL2NJZNU7UNCIUMC",
      receiver: "GAXJ2ZSRTYP5233UYEBUOSDLYBJ65Q3XH2Z5UMAJ46SA26NEXATJ3SLV",
      amount: "25.0",
      tokenSymbol: "XLM",
      ipfsHash: "QmYwAPzwh35SBaoafuiQQgNmoNd6STvtc6OcCcx5nBR53",
      timestamp: Math.floor(Date.now() / 1000) - 86400 * 12, // 12 days ago
      txHash:
        "12ab56ef8f2c3d5a1098ef7ca5b678de0987f65eaef43a21bc98ef76a8f2d5a",
      purpose: "Soroban RPC Infrastructure Credits",
      category: "SaaS",
      notes: "Monthly subscription package.",
      aiTitle: "RPC Infrastructure Credits",
      aiSummary:
        "Payment of 25.0 XLM for Soroban RPC infrastructure credits.",
      aiExplanation:
        "Refills the RPC quota used by StellarProof receipt generation and natural language query services.",
      aiTags: ["SaaS", "Soroban", "Infrastructure"],
    },
  ];
}
