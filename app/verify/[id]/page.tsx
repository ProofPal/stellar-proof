"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ShieldCheck,
  ArrowLeft,
  Download,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { jsPDF } from "jspdf";
import { getLocalReceipts, ReceiptData } from "@/lib/db";
import {
  STELLARPROOF_CONTRACT_ID,
  STELLAR_NETWORK,
  explorerContractUrl,
  explorerTxUrl,
  fetchReceiptFromApi,
} from "@/lib/stellar";

export default function VerifyReceiptPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<"loading" | "verified" | "not-found" | "error">("loading");
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [verifiedOnchain, setVerifiedOnchain] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !id) return;

    const runVerification = async () => {
      setStatus("loading");
      try {
        // 1. Read the receipt directly from Soroban contract storage
        const onchain = await fetchReceiptFromApi(id);

        if (onchain) {
          // 2. Enrich with the AI metadata pinned to IPFS
          let ipfsMeta: Record<string, any> = {};
          if (onchain.ipfsHash) {
            try {
              const ipfsRes = await fetch(
                `https://gateway.pinata.cloud/ipfs/${onchain.ipfsHash}`
              );
              if (ipfsRes.ok) {
                ipfsMeta = await ipfsRes.json();
              }
            } catch (ipfsErr) {
              console.warn("IPFS metadata fetch failed:", ipfsErr);
            }
          }

          setReceipt({
            id: onchain.receiptId,
            sender: onchain.sender,
            receiver: onchain.receiver,
            amount: onchain.amount,
            tokenSymbol: onchain.tokenSymbol,
            ipfsHash: onchain.ipfsHash,
            timestamp: onchain.timestamp,
            txHash: typeof ipfsMeta.txHash === "string" ? ipfsMeta.txHash : "",
            purpose: onchain.purpose,
            category: ipfsMeta.category || "General",
            notes: ipfsMeta.notes || "",
            aiTitle: ipfsMeta.aiTitle || "Onchain Verified Receipt",
            aiSummary:
              ipfsMeta.aiSummary ||
              `Onchain payment of ${onchain.amount} ${onchain.tokenSymbol} anchored in the StellarProof Soroban contract.`,
            aiExplanation:
              ipfsMeta.aiExplanation ||
              "This receipt is cryptographically secured in Soroban contract storage on the Stellar network.",
            aiTags: ipfsMeta.aiTags || ["Stellar", "Soroban", "Verified"],
          });
          setVerifiedOnchain(true);
          setStatus("verified");
          return;
        }

        // 3. Fall back to LocalStorage lookup (offline demo receipts)
        const foundLocal = getLocalReceipts().find((r) => r.id === id);

        if (foundLocal) {
          setReceipt(foundLocal);
          setVerifiedOnchain(false);
          setStatus("verified");
        } else {
          setStatus("not-found");
        }
      } catch (err) {
        console.error("Verification Page Error:", err);
        setStatus("error");
      }
    };

    runVerification();
  }, [id, mounted]);

  const handleCopyHash = () => {
    if (!receipt?.txHash) return;
    navigator.clipboard.writeText(receipt.txHash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // PDF Exporter using jsPDF (same vector output style as the dashboard)
  const exportPDF = () => {
    if (!receipt) return;
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const primaryColor = "#8A2BE2";
    const textColor = "#1A1A1A";
    const mutedColor = "#666666";

    // Header strip purple line
    doc.setDrawColor(138, 43, 226);
    doc.setLineWidth(1.5);
    doc.line(15, 15, 195, 15);

    // Title
    doc.setTextColor(primaryColor);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("StellarProof Payment Receipt", 15, 28);

    doc.setFontSize(10);
    doc.setTextColor(mutedColor);
    doc.setFont("helvetica", "normal");
    doc.text("Soroban Cryptographic Verification Protocol", 15, 33);

    // Divider line
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.5);
    doc.line(15, 38, 195, 38);

    // Receipt details overview
    doc.setTextColor(textColor);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Receipt ID: ${receipt.id}`, 15, 48);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(
      `Date: ${new Date(receipt.timestamp * 1000).toLocaleString()}`,
      15,
      54
    );
    doc.text(`Status: CONFIRMED & VERIFIED ONCHAIN`, 15, 60);

    // Amount Table block (light grey container)
    doc.setFillColor(248, 248, 250);
    doc.rect(15, 67, 180, 25, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Payment Amount", 20, 74);
    doc.text("Purpose & Scope", 95, 74);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    doc.setTextColor(primaryColor);
    doc.text(`${receipt.amount} ${receipt.tokenSymbol}`, 20, 83);

    doc.setFontSize(10);
    doc.setTextColor(textColor);
    doc.text(
      receipt.purpose.length > 40
        ? receipt.purpose.slice(0, 40) + "..."
        : receipt.purpose,
      95,
      83
    );

    // Parties involved
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Transaction Parties", 15, 104);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(mutedColor);
    doc.text("From Sender Address:", 15, 111);
    doc.setTextColor(textColor);
    doc.setFont("courier", "bold");
    doc.setFontSize(8.5);
    doc.text(receipt.sender, 15, 116);

    doc.setTextColor(mutedColor);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text("To Recipient Address:", 15, 125);
    doc.setTextColor(textColor);
    doc.setFont("courier", "bold");
    doc.setFontSize(8.5);
    doc.text(receipt.receiver, 15, 130);

    // Divider
    doc.setDrawColor(230, 230, 230);
    doc.line(15, 138, 195, 138);

    // AI generated summaries
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("AI Highlight Summary", 15, 148);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(textColor);
    const summaryLines = doc.splitTextToSize(receipt.aiSummary, 175);
    doc.text(summaryLines, 15, 155);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Detailed Transaction Scope", 15, 172);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(textColor);
    const explanationLines = doc.splitTextToSize(receipt.aiExplanation, 175);
    doc.text(explanationLines, 15, 179);

    // Divider
    doc.line(15, 205, 195, 205);

    // Onchain details
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Stellar Audit Trails", 15, 215);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(mutedColor);
    doc.text(
      receipt.txHash ? "Stellar Transaction Hash:" : "Soroban Contract:",
      15,
      222
    );
    doc.setFont("courier", "bold");
    doc.setTextColor(textColor);
    doc.text(receipt.txHash || STELLARPROOF_CONTRACT_ID, 15, 226);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(mutedColor);
    doc.text("IPFS Permanent Storage Gateway (CID Metadata):", 15, 235);
    doc.setFont("courier", "bold");
    doc.setTextColor(textColor);
    doc.text(receipt.ipfsHash, 15, 239);

    // Bottom info branding
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(mutedColor);
    doc.text("Generated securely via StellarProof on the Stellar network.", 15, 260);

    doc.save(`StellarProof-Receipt-${receipt.id}.pdf`);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-purple-500/10 border-t-purple-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[450px] h-[450px] bg-indigo-600/10 rounded-full blur-[130px]" />

      <div className="w-full max-w-2xl flex flex-col gap-6 relative z-10">
        {/* Back Button */}
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition w-fit cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to App
        </button>

        {/* Loading State */}
        {status === "loading" && (
          <div className="p-12 rounded-2xl glass-card text-center flex flex-col gap-6 items-center justify-center min-h-[400px]">
            <div className="relative flex items-center justify-center">
              <div className="w-16 h-16 rounded-full border-4 border-purple-500/10 border-t-purple-600 animate-spin" />
              <ShieldCheck className="w-6 h-6 text-purple-400 absolute animate-pulse" />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="font-bold text-lg text-white">
                Running Onchain Verification
              </h3>
              <p className="text-zinc-500 text-xs">
                Querying Stellar Testnet and IPFS gateways...
              </p>
            </div>
          </div>
        )}

        {/* Not Found State */}
        {status === "not-found" && (
          <div className="p-12 rounded-2xl glass-card text-center flex flex-col gap-6 items-center justify-center min-h-[400px]">
            <div className="w-16 h-16 bg-red-950/20 border border-red-500/20 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <div className="flex flex-col gap-2 max-w-sm">
              <h3 className="font-bold text-lg text-white">
                Receipt Verification Failed
              </h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                We could not locate receipt record <strong>#{id}</strong> in the
                StellarProof Soroban contract or local database storage.
              </p>
            </div>
            <button
              onClick={() => router.push("/")}
              className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold rounded-xl transition"
            >
              Go to Dashboard
            </button>
          </div>
        )}

        {/* Error State */}
        {status === "error" && (
          <div className="p-12 rounded-2xl glass-card text-center flex flex-col gap-6 items-center justify-center min-h-[400px]">
            <div className="w-16 h-16 bg-red-950/20 border border-red-500/20 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <div className="flex flex-col gap-2 max-w-sm">
              <h3 className="font-bold text-lg text-white">Network/System Error</h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                An error occurred while connecting to the Stellar Testnet RPC
                nodes.
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl transition"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Verified Receipt Layout */}
        {status === "verified" && receipt && (
          <>
            {/* Top Verification Header */}
            <div className="p-4 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center gap-3 animate-fade-in">
              <ShieldCheck className="w-6 h-6 shrink-0" />
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold uppercase tracking-wider">
                  Cryptographically Secure
                </span>
                <span className="text-[11px] opacity-80 leading-normal">
                  {verifiedOnchain
                    ? `Receipt ID read directly from the StellarProof contract on ${STELLAR_NETWORK.name}.`
                    : "Receipt matches a locally cached record. Connect the contract onchain to verify permanently."}
                </span>
              </div>
            </div>

            {/* Receipt Paper */}
            <div className="receipt-paper overflow-hidden flex flex-col">
              <div className="p-6 bg-zinc-50 border-b border-zinc-100 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-purple-600 flex items-center justify-center font-bold text-white text-[10px]">
                      S
                    </div>
                    <span className="font-bold text-sm text-zinc-800 tracking-tight">
                      StellarProof
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 text-[10px] font-bold bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-full">
                    Verified
                  </span>
                </div>

                <div className="flex justify-between items-end">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                      Receipt Number
                    </span>
                    <span className="font-mono font-bold text-zinc-800 text-sm">
                      #{receipt.id}
                    </span>
                  </div>
                  <span className="text-2xl font-black text-zinc-900">
                    {receipt.amount} {receipt.tokenSymbol}
                  </span>
                </div>
              </div>

              <div className="p-6 flex flex-col gap-6 bg-white">
                {/* AI Summary */}
                <div className="p-4 bg-purple-500/[0.03] border border-purple-500/10 rounded-2xl flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-purple-700 font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
                    AI Summary Highlight
                  </div>
                  <p className="text-xs text-zinc-700 leading-relaxed italic">
                    &ldquo;{receipt.aiSummary}&rdquo;
                  </p>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-xs border-b border-zinc-100 pb-5">
                  <div>
                    <span className="text-zinc-400 font-semibold block mb-0.5">
                      Sender Address
                    </span>
                    <span className="font-mono font-semibold text-zinc-700 break-all select-all">
                      {receipt.sender}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block mb-0.5 font-semibold">
                      Recipient Address
                    </span>
                    <span className="font-mono font-semibold text-zinc-700 break-all select-all">
                      {receipt.receiver}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block mb-0.5 font-semibold">
                      Purpose
                    </span>
                    <span className="text-zinc-700 font-medium">
                      {receipt.purpose}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block mb-0.5 font-semibold">
                      Timestamp
                    </span>
                    <span className="text-zinc-700 font-medium">
                      {new Date(receipt.timestamp * 1000).toLocaleString()}
                    </span>
                  </div>
                  {receipt.notes && (
                    <div className="col-span-1 sm:col-span-2">
                      <span className="text-zinc-400 block mb-0.5 font-semibold">
                        Additional Notes
                      </span>
                      <span className="text-zinc-700 font-medium leading-relaxed">
                        {receipt.notes}
                      </span>
                    </div>
                  )}
                  <div className="col-span-1 sm:col-span-2">
                    <span className="text-zinc-400 block mb-0.5 font-semibold">
                      AI Explanatory Context
                    </span>
                    <span className="text-zinc-600 font-medium leading-relaxed">
                      {receipt.aiExplanation}
                    </span>
                  </div>
                </div>

                {/* Suggestions Tags */}
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mr-1">
                    AI Suggestion Tags:
                  </span>
                  {receipt.aiTags?.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-0.5 text-[9px] font-bold bg-zinc-100 border border-zinc-200 text-zinc-600 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Audit Trail Details */}
                <div className="flex flex-col gap-3 pt-5 border-t border-zinc-100">
                  <h4 className="text-xs font-bold text-zinc-800 uppercase tracking-wide">
                    Stellar Audit Trail
                  </h4>

                  <div className="flex flex-col gap-2">
                    {/* Tx Hash (only when the metadata carried one) */}
                    {receipt.txHash && (
                      <div className="flex justify-between items-center text-[10px] bg-zinc-50 border border-zinc-100 p-2.5 rounded-xl">
                        <div className="flex flex-col gap-0.5 max-w-[82%]">
                          <span className="text-zinc-400 font-bold uppercase">
                            Stellar Tx Hash
                          </span>
                          <span className="font-mono text-zinc-700 break-all select-all font-semibold">
                            {receipt.txHash}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <a
                            href={explorerTxUrl(receipt.txHash)}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 hover:bg-zinc-200 text-zinc-500 rounded-lg transition"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={handleCopyHash}
                            className="p-1.5 hover:bg-zinc-200 text-zinc-500 rounded-lg transition"
                          >
                            {copiedHash ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Soroban contract anchor */}
                    <div className="flex justify-between items-center text-[10px] bg-zinc-50 border border-zinc-100 p-2.5 rounded-xl">
                      <div className="flex flex-col gap-0.5 max-w-[82%]">
                        <span className="text-zinc-400 font-bold uppercase">
                          Soroban Contract
                        </span>
                        <span className="font-mono text-zinc-700 break-all font-semibold">
                          {STELLARPROOF_CONTRACT_ID || "Not configured"}
                        </span>
                      </div>
                      {STELLARPROOF_CONTRACT_ID && (
                        <a
                          href={explorerContractUrl(STELLARPROOF_CONTRACT_ID)}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 hover:bg-zinc-200 text-zinc-500 rounded-lg transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>

                    {/* IPFS CID */}
                    <div className="flex justify-between items-center text-[10px] bg-zinc-50 border border-zinc-100 p-2.5 rounded-xl">
                      <div className="flex flex-col gap-0.5 max-w-[82%]">
                        <span className="text-zinc-400 font-bold uppercase">
                          IPFS CID
                        </span>
                        <span className="font-mono text-zinc-700 font-semibold break-all">
                          {receipt.ipfsHash}
                        </span>
                      </div>
                      <a
                        href={`https://gateway.pinata.cloud/ipfs/${receipt.ipfsHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 hover:bg-zinc-200 text-zinc-500 rounded-lg transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* QR and Signature Block */}
                <div className="flex flex-col sm:flex-row gap-5 items-center justify-between p-4 bg-zinc-50 border border-zinc-100 rounded-2xl">
                  <div className="flex flex-col gap-1.5 text-center sm:text-left">
                    <h4 className="text-xs font-bold text-zinc-800">
                      Scan to Verify
                    </h4>
                    <p className="text-[10px] text-zinc-400 max-w-xs leading-normal">
                      This QR code links to this public validation page, which
                      reads the receipt directly from Soroban contract storage.
                    </p>
                  </div>
                  <div className="p-2 bg-white border border-zinc-200 rounded-xl shrink-0">
                    <QRCodeSVG
                      value={
                        typeof window !== "undefined" ? window.location.href : ""
                      }
                      size={70}
                    />
                  </div>
                </div>
              </div>

              {/* Tear Details */}
              <div className="receipt-tear h-4 w-full opacity-10 bg-white" />
            </div>

            {/* Action Buttons Row */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={exportPDF}
                className="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition shadow-lg shadow-purple-500/10"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
              <button
                onClick={handleCopyLink}
                className="px-4 py-3 bg-zinc-900/40 hover:bg-zinc-900/60 border border-white/5 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition"
              >
                {copiedLink ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                Copy Share Link
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
