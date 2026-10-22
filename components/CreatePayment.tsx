"use client";

import React, { useEffect, useState } from "react";
import {
  Sparkles,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Wallet,
} from "lucide-react";
import { saveReceipt, ReceiptData } from "@/lib/db";
import {
  STELLAR_NETWORK,
  SUPPORTED_ASSETS,
  hasDeployedContract,
  isValidStellarAddress,
  xlmToStroops,
  fetchAccountSummary,
  type AccountSummary,
} from "@/lib/stellar";
import { useStellarWallet } from "@/components/WalletProvider";

type FlowStatus =
  | "idle"
  | "generating-ai"
  | "uploading-ipfs"
  | "submitting"
  | "complete"
  | "error";

interface CreatePaymentProps {
  onSuccess: (receipt: ReceiptData) => void;
  mockMode: boolean;
}

export function CreatePayment({ onSuccess, mockMode }: CreatePaymentProps) {
  const { address: userAddress, isConnected, connect, signTransaction } =
    useStellarWallet();

  // Form State
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [assetCode, setAssetCode] = useState("XLM");
  const [summary, setSummary] = useState<AccountSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [purpose, setPurpose] = useState("");
  const [category, setCategory] = useState("Freelance");
  const [notes, setNotes] = useState("");

  // UI Flow State
  const [status, setStatus] = useState<FlowStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [currentProgressText, setCurrentProgressText] = useState("");

  const tokenSymbol = assetCode;

  // Load the payer's balances and the current network fee estimate.
  useEffect(() => {
    let cancelled = false;

    if (!userAddress) {
      setSummary(null);
      return;
    }

    setSummaryLoading(true);
    fetchAccountSummary(userAddress)
      .then((result) => {
        if (!cancelled) setSummary(result);
      })
      .finally(() => {
        if (!cancelled) setSummaryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userAddress]);

  const selectedAssetBalance = summary?.assets.find(
    (asset) => asset.code === assetCode
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected || !userAddress) {
      setErrorMessage("Connect a Stellar wallet before sending a payment.");
      setStatus("error");
      return;
    }
    if (!isValidStellarAddress(recipient)) {
      setErrorMessage(
        "Invalid recipient address. A Stellar account address starts with G and is 56 characters long."
      );
      setStatus("error");
      return;
    }
    if (recipient.trim() === userAddress) {
      setErrorMessage("The recipient must be a different Stellar account.");
      setStatus("error");
      return;
    }

    let amountStroops: bigint;
    try {
      amountStroops = xlmToStroops(amount);
    } catch (err: any) {
      setErrorMessage(err.message || "Please enter a valid amount.");
      setStatus("error");
      return;
    }
    if (amountStroops <= 0n) {
      setErrorMessage("Please enter an amount greater than zero.");
      setStatus("error");
      return;
    }
    if (!purpose.trim()) {
      setErrorMessage("Please enter a payment purpose.");
      setStatus("error");
      return;
    }
    if (!mockMode && !hasDeployedContract) {
      setErrorMessage(
        "The StellarProof Soroban contract is not configured. Deploy it and set NEXT_PUBLIC_STELLARPROOF_CONTRACT_ID, or enable Demo Mode in Settings."
      );
      setStatus("error");
      return;
    }

    // Sanitize user inputs to prevent XSS
    const cleanPurpose = purpose.replace(/<\/?[^>]+(>|$)/g, "").trim();
    const cleanNotes = notes.replace(/<\/?[^>]+(>|$)/g, "").trim();

    setErrorMessage("");
    setStatus("generating-ai");
    setCurrentProgressText(
      "Gemini AI is analyzing the payment and compiling the receipt summary..."
    );

    const receiptId = `rcpt-${Math.random().toString(36).substring(2, 10)}`;

    try {
      // 1. Fetch AI Metadata & Summaries
      const aiResponse = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          tokenSymbol,
          purpose: cleanPurpose,
          category,
          notes: cleanNotes,
          sender: userAddress,
          receiver: recipient,
        }),
      });

      if (!aiResponse.ok) throw new Error("AI metadata generation failed");
      const aiData = await aiResponse.json();

      // 2. Pin the metadata payload to IPFS so the CID can go onchain
      setStatus("uploading-ipfs");
      setCurrentProgressText(
        "Pinning the receipt metadata payload permanently to IPFS..."
      );

      const metadataPayload = {
        receiptId,
        network: STELLAR_NETWORK.name,
        sender: userAddress,
        receiver: recipient,
        amount,
        tokenSymbol,
        timestamp: Math.floor(Date.now() / 1000),
        purpose: cleanPurpose,
        category: aiData.category || category,
        notes: cleanNotes,
        aiTitle: aiData.aiTitle,
        aiSummary: aiData.aiSummary,
        aiExplanation: aiData.aiExplanation,
        aiTags: aiData.aiTags || [],
      };

      let ipfsHash = "";
      let txHash = "";

      if (mockMode) {
        await new Promise((resolve) => setTimeout(resolve, 900));
        ipfsHash = `QmYwAPzwh35SBaoafuiQQgNmoNd6STvtc6OcCcx5nBR5${Math.floor(
          Math.random() * 10
        )}`;
      } else {
        const ipfsResponse = await fetch("/api/ipfs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ receiptId, metadata: metadataPayload }),
        });

        if (!ipfsResponse.ok) throw new Error("IPFS upload pinning failed");
        const ipfsData = await ipfsResponse.json();
        ipfsHash = ipfsData.ipfsHash;
      }

      // 3. Send the XLM payment and anchor the receipt on Soroban
      setStatus("submitting");
      setCurrentProgressText(
        mockMode
          ? "Simulating the Stellar transaction..."
          : "Sign the transaction in your wallet to pay and anchor the receipt..."
      );

      if (mockMode) {
        await new Promise((resolve) => setTimeout(resolve, 1400));
        txHash = Array.from({ length: 64 }, () =>
          Math.floor(Math.random() * 16).toString(16)
        ).join("");
      } else {
        // 3a. The server assembles and simulates the atomic Stellar transaction
        const prepareResponse = await fetch("/api/stellar/prepare-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sender: userAddress,
            receiver: recipient,
            amount,
            receiptId,
            ipfsHash,
            purpose: cleanPurpose,
            tokenSymbol,
            assetCode,
          }),
        });

        const prepared = await prepareResponse.json();
        if (!prepareResponse.ok) {
          throw new Error(
            prepared.error || "Unable to prepare the Stellar transaction."
          );
        }

        // 3b. The wallet signs the XLM payment and the Soroban invocation at once
        setCurrentProgressText(
          "Approve the payment and receipt anchoring in your Stellar wallet..."
        );
        const signedXdr = await signTransaction(prepared.xdr);

        // 3c. Submit the signed envelope and wait for confirmation
        setCurrentProgressText(
          "Submitting the signed transaction to Stellar Testnet..."
        );
        const submitResponse = await fetch("/api/stellar/submit-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ signedXdr }),
        });

        const submitted = await submitResponse.json();
        if (!submitResponse.ok) {
          throw new Error(
            submitted.error ||
              "The signed transaction could not be submitted to Stellar."
          );
        }

        txHash = submitted.txHash;
      }

      // 4. Persist the receipt locally (and to Supabase when configured)
      const fullReceipt: ReceiptData = {
        id: receiptId,
        sender: userAddress,
        receiver: recipient,
        amount,
        tokenSymbol,
        ipfsHash,
        timestamp: Math.floor(Date.now() / 1000),
        txHash,
        purpose: cleanPurpose,
        category: aiData.category || category,
        notes: cleanNotes,
        aiTitle: aiData.aiTitle,
        aiSummary: aiData.aiSummary,
        aiExplanation: aiData.aiExplanation,
        aiTags: aiData.aiTags || [],
      };

      await saveReceipt(fullReceipt);

      setStatus("complete");
      setTimeout(() => {
        onSuccess(fullReceipt);
      }, 1200);
    } catch (err: any) {
      console.error("Payment Submission Error:", err);
      setErrorMessage(
        err?.message || "An unexpected error occurred during processing."
      );
      setStatus("error");
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto py-2">
      {/* Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Create Payment</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Send XLM on the Stellar network and anchor a verifiable receipt on
          Soroban in the same transaction.
        </p>
      </div>

      {/* Progress Overlays / Loading View */}
      {status !== "idle" && status !== "complete" && status !== "error" && (
        <div className="p-8 rounded-2xl glass-card text-center flex flex-col gap-6 items-center justify-center min-h-[350px]">
          <div className="relative flex items-center justify-center">
            <div className="w-16 h-16 rounded-full border-4 border-purple-500/10 border-t-purple-600 animate-spin" />
            <Sparkles className="w-6 h-6 text-purple-400 absolute animate-pulse" />
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="font-bold text-lg text-white">
              {status === "generating-ai" && "AI Analysis & Summarization"}
              {status === "uploading-ipfs" && "Pinning Payload to IPFS"}
              {status === "submitting" && "Settling on Stellar"}
            </h3>
            <p className="text-zinc-400 text-xs max-w-sm leading-relaxed">
              {currentProgressText}
            </p>
          </div>
        </div>
      )}

      {/* Success View */}
      {status === "complete" && (
        <div className="p-8 rounded-2xl glass-card text-center flex flex-col gap-5 items-center justify-center min-h-[350px]">
          <div className="w-16 h-16 bg-purple-600/15 border border-purple-500/30 rounded-full flex items-center justify-center animate-bounce">
            <CheckCircle2 className="w-8 h-8 text-purple-400" />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="font-bold text-lg text-white">Receipt Generated!</h3>
            <p className="text-zinc-500 text-xs">Opening your receipt page...</p>
          </div>
        </div>
      )}

      {/* Error View */}
      {status === "error" && (
        <div className="p-8 rounded-2xl glass-card flex flex-col gap-5 items-center justify-center min-h-[350px]">
          <div className="w-14 h-14 bg-red-950/20 border border-red-500/20 rounded-full flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <div className="text-center flex flex-col gap-2 max-w-sm">
            <h3 className="font-bold text-lg text-white">Process Failed</h3>
            <p className="text-zinc-400 text-xs leading-relaxed">{errorMessage}</p>
          </div>
          <button
            onClick={() => setStatus("idle")}
            className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold rounded-xl transition"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Form View */}
      {status === "idle" && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-5 p-6 bg-zinc-900/20 border border-white/5 rounded-2xl">
            {/* Recipient */}
            <div className="flex flex-col gap-2">
              <label className="text-xs text-zinc-400 font-semibold tracking-wide uppercase">
                Recipient Stellar Address
              </label>
              <input
                type="text"
                required
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="GAXJ2ZSRTYP5233UYEBUOSDLYBJ65Q3XH2Z5UMAJ46SA26NEXATJ3SLV"
                className="w-full px-4 py-3 bg-zinc-900/50 border border-white/5 rounded-xl text-sm text-white focus:outline-none focus:border-purple-600 transition placeholder-zinc-600 font-mono"
              />
            </div>

            {/* Amount and Asset Row */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 flex flex-col gap-2">
                <label className="text-xs text-zinc-400 font-semibold tracking-wide uppercase">
                  Amount
                </label>
                <input
                  type="number"
                  step="0.0000001"
                  min="0.0000001"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="2.5"
                  className="w-full px-4 py-3 bg-zinc-900/50 border border-white/5 rounded-xl text-sm text-white focus:outline-none focus:border-purple-600 transition placeholder-zinc-600 font-semibold"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs text-zinc-400 font-semibold tracking-wide uppercase">
                  Asset
                </label>
                <select
                  value={assetCode}
                  onChange={(e) => setAssetCode(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-900/50 border border-white/5 rounded-xl text-sm text-white focus:outline-none focus:border-purple-600 transition cursor-pointer font-bold"
                >
                  {SUPPORTED_ASSETS.map((asset) => (
                    <option key={asset.code} value={asset.code}>
                      {asset.code}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Balance + fee summary */}
            {isConnected && (
              <div className="flex flex-col gap-1.5 p-3.5 bg-purple-950/10 border border-purple-500/15 rounded-xl text-[11px] text-zinc-400">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-zinc-300">
                    {tokenSymbol} balance
                  </span>
                  <span className="font-mono text-white">
                    {assetCode === "XLM"
                      ? summary
                        ? `${summary.balanceXlm} XLM`
                        : summaryLoading
                        ? "loading..."
                        : "unavailable"
                      : selectedAssetBalance
                      ? `${selectedAssetBalance.balance} ${assetCode}`
                      : "no trustline"}
                  </span>
                </div>
                {assetCode === "XLM" && summary && (
                  <div className="flex items-center justify-between gap-3">
                    <span>Spendable after reserve ({summary.reserveXlm} XLM)</span>
                    <span className="font-mono text-zinc-300">
                      {summary.spendableXlm} XLM
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3">
                  <span>Est. network fee</span>
                  <span className="font-mono text-zinc-300">
                    {summary ? `≈ ${summary.feeEstimateXlm} XLM` : "—"}
                  </span>
                </div>
                {assetCode !== "XLM" && !selectedAssetBalance && (
                  <p className="text-[10px] text-amber-300 leading-normal">
                    Add a {assetCode} trustline in your wallet before paying with
                    {` ${assetCode}`}.
                  </p>
                )}
              </div>
            )}

            {/* Purpose */}
            <div className="flex flex-col gap-2">
              <label className="text-xs text-zinc-400 font-semibold tracking-wide uppercase">
                Purpose
              </label>
              <input
                type="text"
                required
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="e.g., Soroban contract security audit"
                className="w-full px-4 py-3 bg-zinc-900/50 border border-white/5 rounded-xl text-sm text-white focus:outline-none focus:border-purple-600 transition placeholder-zinc-600"
              />
            </div>

            {/* Category selection */}
            <div className="flex flex-col gap-2">
              <label className="text-xs text-zinc-400 font-semibold tracking-wide uppercase">
                Base Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-900/50 border border-white/5 rounded-xl text-sm text-white focus:outline-none focus:border-purple-600 transition cursor-pointer"
              >
                <option value="Freelance">Freelance</option>
                <option value="Design">Design</option>
                <option value="Development">Development</option>
                <option value="SaaS">SaaS Subscription</option>
                <option value="Security">Security Audit</option>
                <option value="Infrastructure">Infrastructure</option>
              </select>
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-2">
              <label className="text-xs text-zinc-400 font-semibold tracking-wide uppercase">
                Additional Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Audit report delivered for the receipts contract."
                rows={3}
                className="w-full px-4 py-3 bg-zinc-900/50 border border-white/5 rounded-xl text-sm text-white focus:outline-none focus:border-purple-600 transition placeholder-zinc-600"
              />
            </div>
          </div>

          {!mockMode && !hasDeployedContract && (
            <div className="p-3.5 bg-amber-950/20 border border-amber-500/20 rounded-xl text-[11px] text-amber-300 leading-relaxed">
              No Soroban contract id is configured, so live mode cannot anchor the
              receipt onchain. Deploy the contract with{" "}
              <code className="font-mono">pnpm deploy:testnet</code> and set{" "}
              <code className="font-mono">
                NEXT_PUBLIC_STELLARPROOF_CONTRACT_ID
              </code>
              .
            </div>
          )}

          {/* Submit Button */}
          {!isConnected ? (
            <button
              type="button"
              onClick={() => connect()}
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/10 cursor-pointer transition duration-150 text-sm"
            >
              <Wallet className="w-4 h-4" />
              Connect a Stellar Wallet
            </button>
          ) : (
            <button
              type="submit"
              className="group flex items-center justify-center gap-2 w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/10 cursor-pointer transition duration-150 text-sm"
            >
              {mockMode ? "Simulate Payment & Generate Receipt" : "Pay & Anchor Receipt on Stellar"}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          )}

          {mockMode && (
            <p className="text-[11px] text-zinc-500 text-center leading-relaxed">
              Demo Mode is enabled: no wallet signature or network fee is used.
            </p>
          )}
        </form>
      )}
    </div>
  );
}
