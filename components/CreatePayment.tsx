"use client";

import React, { useState } from "react";
import { useAccount, useSendTransaction, useContractWrite, usePrepareContractWrite, useNetwork, useSwitchNetwork } from "wagmi";
import { parseEther } from "viem";
import { parseUnits } from "viem";
import { Sparkles, ArrowRight, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { saveReceipt, ReceiptData } from "@/lib/db";

// Minimal ABI containing only createReceipt for the contract call
const CONTRACT_ABI = [
  {
    inputs: [
      { internalType: "string", name: "_receiptId", type: "string" },
      { internalType: "address", name: "_receiver", type: "address" },
      { internalType: "uint256", name: "_amount", type: "uint256" },
      { internalType: "string", name: "_tokenSymbol", type: "string" },
      { internalType: "string", name: "_ipfsHash", type: "string" },
      { internalType: "string", name: "_purpose", type: "string" }
    ],
    name: "createReceipt",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
];

// Contract Address from Hardhat deployment
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

interface CreatePaymentProps {
  onSuccess: (receipt: ReceiptData) => void;
  mockMode: boolean;
}

export function CreatePayment({ onSuccess, mockMode }: CreatePaymentProps) {
  const { address: userAddress, isConnected } = useAccount();
  const { chain } = useNetwork();
  const { switchNetwork } = useSwitchNetwork();
  const isWrongNetwork = isConnected && chain && chain.id !== 10143;
  
  // Form State
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("MON");
  const [purpose, setPurpose] = useState("");
  const [category, setCategory] = useState("Freelance");
  const [notes, setNotes] = useState("");

  // UI Flow State
  const [status, setStatus] = useState<"idle" | "sending-payment" | "generating-ai" | "uploading-ipfs" | "registering-onchain" | "complete" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [currentProgressText, setCurrentProgressText] = useState("");

  // Wagmi hooks for transaction
  const { sendTransactionAsync } = useSendTransaction();

  // Custom contract call hook
  const { writeAsync } = useContractWrite({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "createReceipt",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      setErrorMessage("Please connect your wallet first.");
      setStatus("error");
      return;
    }
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!ethAddressRegex.test(recipient)) {
      setErrorMessage("Invalid recipient wallet address. Must be a valid 42-character Hex address starting with 0x.");
      setStatus("error");
      return;
    }
    if (parseFloat(amount) <= 0 || isNaN(parseFloat(amount))) {
      setErrorMessage("Please enter a valid amount.");
      setStatus("error");
      return;
    }
    if (!purpose.trim()) {
      setErrorMessage("Please enter a payment purpose.");
      setStatus("error");
      return;
    }
    if (!mockMode && isWrongNetwork) {
      setErrorMessage("Please switch your network to Monad Testnet before sending a payment.");
      setStatus("error");
      return;
    }

    // Sanitize user inputs to prevent XSS
    const cleanPurpose = purpose.replace(/<\/?[^>]+(>|$)/g, "").trim();
    const cleanNotes = notes.replace(/<\/?[^>]+(>|$)/g, "").trim();

    setStatus("sending-payment");
    setErrorMessage("");
    setCurrentProgressText("Sign transaction in your wallet...");

    const receiptId = `rcpt-${Math.random().toString(36).substring(2, 10)}`;
    let txHash = "0x" + "0".repeat(64);

    try {
      // 1. Submit Blockchain Payment
      if (mockMode) {
        // Simulate payment hash
        await new Promise((resolve) => setTimeout(resolve, 2000));
        txHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;
      } else {
        const tx = await sendTransactionAsync({
          to: recipient as `0x${string}`,
          value: parseEther(amount),
        });
        txHash = tx.hash;
        setCurrentProgressText("Waiting for transaction confirmation...");
        // In real network, we'd wait for confirming receipt here, but for testnet demo 1-2s delay works best
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      // 2. Fetch AI Metadata & Summaries
      setStatus("generating-ai");
      setCurrentProgressText("Gemini AI is analyzing transaction and compiling summaries...");
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

      // 3. Upload Metadata to IPFS
      setStatus("uploading-ipfs");
      setCurrentProgressText("Pinning receipt metadata payload permanently to IPFS...");
      const metadataPayload = {
        receiptId,
        sender: userAddress,
        receiver: recipient,
        amount,
        tokenSymbol,
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

      const ipfsResponse = await fetch("/api/ipfs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiptId,
          metadata: metadataPayload,
        }),
      });

      if (!ipfsResponse.ok) throw new Error("IPFS upload pinning failed");
      const ipfsData = await ipfsResponse.json();
      const ipfsHash = ipfsData.ipfsHash;

      // 4. Record Receipt details onchain
      setStatus("registering-onchain");
      setCurrentProgressText("Writing Receipt ID and IPFS CID onchain...");
      if (mockMode) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } else {
        // Prepare and execute contract write
        const amountWei = parseEther(amount);
        const onchainTx = await writeAsync({
          args: [receiptId, recipient as `0x${string}`, amountWei, tokenSymbol, ipfsHash, cleanPurpose],
        });
        await new Promise((resolve) => setTimeout(resolve, 2000)); // wait for indexing
      }

      // 5. Save Receipt database record
      const fullReceipt: ReceiptData = {
        id: receiptId,
        sender: userAddress || "0x00",
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
      // Success delay, then open the receipt detail
      setTimeout(() => {
        onSuccess(fullReceipt);
      }, 1500);

    } catch (err: any) {
      console.error("Payment Submission Error:", err);
      setErrorMessage(err.message || "An unexpected error occurred during processing.");
      setStatus("error");
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto py-2">
      {/* Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Create Payment</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Send cryptocurrency and automatically generate a professional receipt.
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
              {status === "sending-payment" && "Processing Blockchain Payment"}
              {status === "generating-ai" && "AI Analysis & Summarization"}
              {status === "uploading-ipfs" && "Pinning Payload to IPFS"}
              {status === "registering-onchain" && "Committing Details Onchain"}
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
            <p className="text-zinc-500 text-xs">Opening Stripe-style receipt page...</p>
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
                Recipient Address
              </label>
              <input
                type="text"
                required
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="0x71C7656EC7ab88b098defB751B7401B..."
                className="w-full px-4 py-3 bg-zinc-900/50 border border-white/5 rounded-xl text-sm text-white focus:outline-none focus:border-purple-600 transition placeholder-zinc-600 font-mono"
              />
            </div>

            {/* Amount and Token Row */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 flex flex-col gap-2">
                <label className="text-xs text-zinc-400 font-semibold tracking-wide uppercase">
                  Amount
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.05"
                  className="w-full px-4 py-3 bg-zinc-900/50 border border-white/5 rounded-xl text-sm text-white focus:outline-none focus:border-purple-600 transition placeholder-zinc-600 font-semibold"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs text-zinc-400 font-semibold tracking-wide uppercase">
                  Token
                </label>
                <select
                  value={tokenSymbol}
                  onChange={(e) => setTokenSymbol(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-900/50 border border-white/5 rounded-xl text-sm text-white focus:outline-none focus:border-purple-600 transition cursor-pointer font-bold"
                >
                  <option value="MON">MON</option>
                  <option value="USDC">USDC</option>
                  <option value="USDT">USDT</option>
                </select>
              </div>
            </div>

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
                placeholder="e.g., Q3 Design workshop wireframes"
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
                placeholder="e.g., Delivered v1 landing page wires in Figma."
                rows={3}
                className="w-full px-4 py-3 bg-zinc-900/50 border border-white/5 rounded-xl text-sm text-white focus:outline-none focus:border-purple-600 transition placeholder-zinc-600"
              />
            </div>
          </div>

          {/* Submit Button */}
          {!mockMode && isWrongNetwork ? (
            <button
              type="button"
              onClick={() => switchNetwork?.(10143)}
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl shadow-lg shadow-red-500/10 cursor-pointer transition duration-150 text-sm"
            >
              Switch Network to Monad Testnet
              <RefreshCw className="w-4 h-4 animate-spin" style={{ animationDuration: '3s' }} />
            </button>
          ) : (
            <button
              type="submit"
              className="group flex items-center justify-center gap-2 w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/10 cursor-pointer transition duration-150 text-sm"
            >
              Generate Receipt & Onchain Proof
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          )}
        </form>
      )}
    </div>
  );
}
