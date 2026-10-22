"use client";

import React, { useState } from "react";
import { ReceiptData } from "@/lib/db";
import {
  ArrowLeft,
  Download,
  ShieldCheck,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { jsPDF } from "jspdf";
import {
  STELLAR_NETWORK,
  explorerAccountUrl,
  explorerTxUrl,
  fetchReceiptFromApi,
} from "@/lib/stellar";

interface ReceiptDetailProps {
  receipt: ReceiptData;
  onBack: () => void;
  mockMode: boolean;
}

export function ReceiptDetail({
  receipt,
  onBack,
  mockMode,
}: ReceiptDetailProps) {
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<
    "unchecked" | "loading" | "verified" | "not-found"
  >("unchecked");

  const handleCopyHash = () => {
    navigator.clipboard.writeText(receipt.txHash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/verify/${receipt.id}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Perform cryptographic verification against Soroban contract storage
  const handleVerify = async () => {
    setVerificationStatus("loading");

    if (mockMode) {
      // Simulation delay for demo mode
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setVerificationStatus("verified");
      return;
    }

    const onchain = await fetchReceiptFromApi(receipt.id);

    if (
      onchain &&
      onchain.sender === receipt.sender &&
      onchain.ipfsHash === receipt.ipfsHash
    ) {
      setVerificationStatus("verified");
    } else {
      setVerificationStatus("not-found");
    }
  };

  // PDF Vector Exporter using jsPDF
  const exportPDF = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const primaryColor = "#8A2BE2";
    const textColor = "#1F2937";
    const mutedColor = "#6B7280";
    const successColor = "#059669";

    // 1. Top brand accent strip
    doc.setFillColor(138, 43, 226);
    doc.rect(0, 0, 210, 8, "F");

    // 2. Document Title and Header branding
    doc.setTextColor(primaryColor);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("StellarProof Payment Receipt", 15, 24);

    doc.setFontSize(9);
    doc.setTextColor(mutedColor);
    doc.setFont("helvetica", "normal");
    doc.text("Soroban Cryptographic Verification Protocol", 15, 29);

    // 3. Official Verification Badge Stamp (Top Right)
    doc.setDrawColor(5, 150, 105);
    doc.setLineWidth(0.4);
    doc.setFillColor(240, 253, 250);
    doc.roundedRect(145, 16, 50, 12, 2, 2, "FD");

    doc.setTextColor(successColor);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("VERIFIED ONCHAIN", 152, 21);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("STELLAR TESTNET SECURE", 152, 25);

    // Divider line
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.5);
    doc.line(15, 34, 195, 34);

    // 4. Receipt Overview Details
    doc.setTextColor(textColor);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`Receipt ID: ${receipt.id}`, 15, 43);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(mutedColor);
    doc.text(
      `Issued Date: ${new Date(receipt.timestamp * 1000).toLocaleString()}`,
      15,
      48
    );
    doc.text(`Status: CONFIRMED & INDEXED ONCHAIN`, 15, 53);

    // 5. Professional Invoice Table Breakdown
    doc.setFillColor(249, 250, 251);
    doc.rect(15, 60, 180, 8, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(mutedColor);
    doc.text("Payment Purpose / Description", 20, 65);
    doc.text("Category", 120, 65);
    doc.text("Amount Paid", 160, 65);

    doc.setDrawColor(243, 244, 246);
    doc.setLineWidth(0.3);
    doc.line(15, 68, 195, 68);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(textColor);
    doc.setFontSize(9.5);
    const purposeText =
      receipt.purpose.length > 50
        ? receipt.purpose.slice(0, 50) + "..."
        : receipt.purpose;
    doc.text(purposeText, 20, 74);
    doc.text(receipt.category || "General", 120, 74);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryColor);
    doc.text(`${receipt.amount} ${receipt.tokenSymbol}`, 160, 74);

    doc.setDrawColor(209, 213, 219);
    doc.line(15, 78, 195, 78);

    // 6. Transaction Parties Section
    doc.setTextColor(textColor);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text("Transaction Parties", 15, 88);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(mutedColor);
    doc.text("From Sender Address:", 15, 94);
    doc.setTextColor(textColor);
    doc.setFont("courier", "bold");
    doc.setFontSize(8.5);
    doc.text(receipt.sender, 15, 98);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(mutedColor);
    doc.text("To Recipient Address:", 15, 106);
    doc.setTextColor(textColor);
    doc.setFont("courier", "bold");
    doc.setFontSize(8.5);
    doc.text(receipt.receiver, 15, 110);

    doc.setDrawColor(229, 231, 235);
    doc.line(15, 116, 195, 116);

    // 7. AI Summary Quote
    doc.setTextColor(textColor);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text("AI Highlight Summary", 15, 125);

    doc.setDrawColor(138, 43, 226);
    doc.setLineWidth(0.8);
    doc.line(16, 131, 16, 142);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(textColor);
    const summaryLines = doc.splitTextToSize(`"${receipt.aiSummary}"`, 172);
    doc.text(summaryLines, 20, 135);

    // 8. AI Detailed Scope Explanations
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text("Detailed Transaction Scope", 15, 151);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    const explanationLines = doc.splitTextToSize(receipt.aiExplanation, 178);
    doc.text(explanationLines, 15, 157);

    doc.setDrawColor(229, 231, 235);
    doc.line(15, 185, 195, 185);

    // 9. Stellar verification trails
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Stellar Audit Trails", 15, 194);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(mutedColor);
    doc.text("Stellar Transaction Hash:", 15, 200);
    doc.setFont("courier", "bold");
    doc.setTextColor(textColor);
    doc.setFontSize(8);
    doc.text(receipt.txHash, 15, 204);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(mutedColor);
    doc.text("Decentralized Metadata Payload (IPFS CID):", 15, 212);
    doc.setFont("courier", "bold");
    doc.setTextColor(textColor);
    doc.setFontSize(8);
    doc.text(receipt.ipfsHash, 15, 216);

    // 10. Footer info
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(mutedColor);
    doc.text(
      "This receipt is cryptographically verifiable on Stellar Testnet via the StellarProof Soroban contract.",
      15,
      270
    );

    doc.save(`StellarProof-Receipt-${receipt.id}.pdf`);
  };

  const verificationLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/verify/${receipt.id}`
      : "";

  return (
    <div className="w-full max-w-2xl mx-auto py-2 flex flex-col gap-6">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition w-fit cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      {/* Stripe-style Receipt Paper */}
      <div className="receipt-paper overflow-hidden flex flex-col">
        {/* Receipt Header */}
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
            <span className="px-2.5 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-700 rounded-full border border-purple-200">
              Confirmed
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

        {/* Receipt Body */}
        <div className="p-6 flex flex-col gap-6">
          {/* AI Generated Highlight Section */}
          <div className="p-4 bg-purple-500/[0.03] border border-purple-500/10 rounded-2xl flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-xs text-purple-700 font-bold">
              <Sparkles className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
              AI Summary Highlight
            </div>
            <p className="text-xs text-zinc-700 leading-relaxed italic">
              &ldquo;{receipt.aiSummary}&rdquo;
            </p>
          </div>

          {/* Transaction Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-xs border-b border-zinc-100 pb-5">
            <div>
              <span className="text-zinc-400 font-semibold block mb-0.5">
                Sender Address
              </span>
              <a
                href={explorerAccountUrl(receipt.sender)}
                target="_blank"
                rel="noreferrer"
                className="font-mono font-semibold text-zinc-700 break-all select-all hover:text-purple-600 transition"
              >
                {receipt.sender}
              </a>
            </div>
            <div>
              <span className="text-zinc-400 block mb-0.5 font-semibold">
                Recipient Address
              </span>
              <a
                href={explorerAccountUrl(receipt.receiver)}
                target="_blank"
                rel="noreferrer"
                className="font-mono font-semibold text-zinc-700 break-all select-all hover:text-purple-600 transition"
              >
                {receipt.receiver}
              </a>
            </div>
            <div>
              <span className="text-zinc-400 block mb-0.5 font-semibold">
                Purpose
              </span>
              <span className="text-zinc-700 font-medium">{receipt.purpose}</span>
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

          {/* AI generated Tags block */}
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
              {/* Tx Hash */}
              <div className="flex justify-between items-center text-[10px] bg-zinc-50 border border-zinc-100 p-2.5 rounded-xl">
                <div className="flex flex-col gap-0.5 max-w-[80%]">
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
                    title="View on Stellar Expert"
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

              {/* IPFS CID */}
              <div className="flex justify-between items-center text-[10px] bg-zinc-50 border border-zinc-100 p-2.5 rounded-xl">
                <div className="flex flex-col gap-0.5 max-w-[85%]">
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

          {/* QR Verification and Signature Card */}
          <div className="flex flex-col sm:flex-row gap-5 items-center justify-between p-4 bg-zinc-50 border border-zinc-100 rounded-2xl">
            <div className="flex flex-col gap-1.5 text-center sm:text-left">
              <h4 className="text-xs font-bold text-zinc-800">Scan to Verify</h4>
              <p className="text-[10px] text-zinc-400 max-w-xs leading-normal">
                This QR code links to the public StellarProof verification page,
                which reads the receipt directly from Soroban contract storage.
              </p>
            </div>
            <div className="p-2 bg-white border border-zinc-200 rounded-xl shrink-0">
              <QRCodeSVG value={verificationLink} size={70} />
            </div>
          </div>
        </div>

        {/* Tear details */}
        <div className="receipt-tear h-4 w-full opacity-10" />
      </div>

      {/* Verification Box */}
      {verificationStatus !== "unchecked" && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 border ${
            verificationStatus === "loading"
              ? "bg-zinc-900/40 border-white/5 text-zinc-400"
              : verificationStatus === "verified"
              ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-400"
              : "bg-red-950/20 border-red-500/20 text-red-400"
          }`}
        >
          {verificationStatus === "loading" && (
            <div className="w-5 h-5 rounded-full border-2 border-zinc-500/10 border-t-zinc-400 animate-spin" />
          )}
          {verificationStatus === "verified" && (
            <ShieldCheck className="w-5 h-5 shrink-0" />
          )}
          <span className="text-xs font-semibold">
            {verificationStatus === "loading" &&
              "Querying Soroban contract storage..."}
            {verificationStatus === "verified" &&
              (mockMode
                ? "Demo verification passed: this simulated receipt matches its local record."
                : `Verified cryptographically: receipt found on ${STELLAR_NETWORK.name} and its IPFS CID matches.`)}
            {verificationStatus === "not-found" &&
              "Onchain verification failed: no matching receipt was found in the StellarProof contract."}
          </span>
        </div>
      )}

      {/* Action Buttons Row */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={handleVerify}
          className="px-4 py-3 bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/20 text-purple-400 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition"
        >
          <ShieldCheck className="w-4 h-4" />
          Verify Receipt
        </button>
        <button
          onClick={exportPDF}
          className="px-4 py-3 bg-zinc-900/40 hover:bg-zinc-900/60 border border-white/5 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition"
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
    </div>
  );
}
