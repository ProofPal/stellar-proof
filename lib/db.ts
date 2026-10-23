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
  if (!stored) return []; // Never seed fake receipts into a live dashboard
  try {
    return JSON.parse(stored);
  } catch (e) {
    console.error("Failed to parse local receipts:", e);
    return [];
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
