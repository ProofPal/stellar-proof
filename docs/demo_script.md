# 🎙️ StellarProof: 3-Minute Demo Video Script

This script outlines the flow, visual transitions, and key talking points for the project's video demonstration.

---

## ⏱️ 0:00 - 0:45: The Problem & The Hook

* **Visual**: Show the **StellarProof** landing page, scrolling through the hero section with floating orbs and modern dark-mode aesthetics.
* **Speaker**:
  > "Hi everyone, I'm the founder of StellarProof. Let's talk about a problem every builder on Stellar knows.
  >
  > When you get paid in XLM, all you receive is a transaction hash on an explorer. You forget who it was for, why it was sent, and you lose your business record trail.
  >
  > Stellar payments settle in seconds, but they don't generate invoices. That's why we built **StellarProof** — Stripe-style receipts, AI summaries and natural language search, entirely on Stellar and Soroban."

---

## ⏱️ 0:45 - 1:30: Connecting & Making a Payment

* **Visual**: Click "Launch App". Show the dashboard overview, then navigate to "Create Payment". Click "Connect Wallet", choose Freighter, then enter a recipient address, set amount to `2.5 XLM`, purpose `Soroban Contract Security Audit`, category `Security`. Click "Pay & Anchor Receipt on Stellar" and approve the wallet prompt.
* **Speaker**:
  > "StellarProof connects to any Stellar wallet through the Stellar Wallets Kit — Freighter here, but xBull, Albedo, Lobstr and hardware wallets work too.
  >
  > I'm paying 2.5 XLM to our auditor for a Soroban contract review. One signature covers everything: the payment itself and the receipt that gets anchored onchain."

---

## ⏱️ 1:30 - 2:15: AI Processing, IPFS, & Soroban Anchoring

* **Visual**: Show the step-by-step loader: AI Summary ➔ IPFS Pinned ➔ Settling on Stellar. Then the final white Stripe-style receipt with the QR code and a verified badge.
* **Speaker**:
  > "Behind the scenes, Gemini AI writes a professional title, a two-sentence summary, tags and a customer-friendly explanation.
  >
  > That payload is pinned to IPFS. Then one signed Soroban invocation does both jobs atomically: our Rust contract moves the XLM through Stellar's native asset contract and stores the receipt id, both addresses, the amount and the IPFS CID.
  >
  > Here is the result: a clean receipt with the Stellar audit trail, an explorer link, a verification QR code and a PDF download."

---

## ⏱️ 2:15 - 2:45: Public Verification & Natural Language Search

* **Visual**: Click "Verify Receipt" (show the green onchain confirmation), then "Copy Share Link" and open `/verify/[id]` in a new tab. Show the "Verified" badge. Back in the dashboard, type *"Show security audit receipts above 1 XLM"* into the AI search and click "Ask AI".
* **Speaker**:
  > "Anyone can verify a receipt without trusting our servers. The public page derives the receipt's storage key and reads it straight out of Soroban contract storage with `getLedgerEntries` — no indexer, no wallet, no backend.
  >
  > And finding old payments is just as easy. I search naturally and Gemini returns the matching receipts instantly."

---

## ⏱️ 2:45 - 3:00: Closing Pitch

* **Visual**: Zoom in on the "Verified" badge, then show Stellar Expert with the contract and the transaction, ending on the landing page footer.
* **Speaker**:
  > "StellarProof combines Stellar's fast, cheap settlement with Soroban's verifiable state and modern AI bookkeeping.
  >
  > It's open source, it runs on testnet today, and it makes every Stellar payment a proper business record.
  >
  > Thank you — let's make onchain payments clear."
