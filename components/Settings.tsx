"use client";

import React from "react";
import { useAccount, useNetwork } from "wagmi";
import { ShieldAlert, Trash2, Eye, Info, Database } from "lucide-react";
import { clearLocalCache } from "@/lib/db";

interface SettingsProps {
  mockMode: boolean;
  onToggleMockMode: () => void;
  onClearReceipts: () => void;
}

export function Settings({ mockMode, onToggleMockMode, onClearReceipts }: SettingsProps) {
  const { address, isConnected } = useAccount();
  const { chain } = useNetwork();

  const handleClearCache = () => {
    if (confirm("Are you sure you want to clear all locally cached receipts? This action is permanent (though IPFS items and onchain records will remain intact).")) {
      clearLocalCache();
      onClearReceipts();
      alert("Local cache cleared successfully.");
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto py-2 flex flex-col gap-6">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Settings</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Manage system behavior, active networks, and cached local records.
        </p>
      </div>

      <div className="flex flex-col gap-5">
        {/* Mock Mode Configuration */}
        <div className="p-6 bg-zinc-900/20 border border-white/5 rounded-2xl flex items-start gap-4 justify-between">
          <div className="flex flex-col gap-1.5 max-w-[80%]">
            <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-purple-400" />
              Demo Mode (Simulated Txs)
            </h3>
            <p className="text-xs text-zinc-500 leading-normal">
              Bypasses real MetaMask signatures and Monad transaction confirmations. It uses Gemini local metadata fallbacks to let you test the entire generation flow immediately without needing gas.
            </p>
          </div>
          <button
            onClick={onToggleMockMode}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
              mockMode
                ? "bg-purple-600 hover:bg-purple-700 text-white"
                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
            }`}
          >
            {mockMode ? "Enabled" : "Disabled"}
          </button>
        </div>

        {/* Database Sync Info */}
        <div className="p-6 bg-zinc-900/20 border border-white/5 rounded-2xl flex flex-col gap-4">
          <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
            <Database className="w-4 h-4 text-purple-400" />
            Backend Database Sync
          </h3>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs border-b border-white/5 py-2">
              <span className="text-zinc-500 font-semibold">Supabase Schema Status</span>
              <span className="font-medium text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active (Local Failover)
              </span>
            </div>
            <div className="flex justify-between items-center text-xs py-1">
              <span className="text-zinc-500 font-semibold">IPFS Storage Provider</span>
              <span className="font-medium text-white">Pinata Gateway</span>
            </div>
          </div>
        </div>

        {/* Network Connections */}
        <div className="p-6 bg-zinc-900/20 border border-white/5 rounded-2xl flex flex-col gap-4">
          <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
            <Info className="w-4 h-4 text-purple-400" />
            Active Connection Details
          </h3>
          <div className="flex flex-col gap-2 text-xs">
            <div className="flex justify-between border-b border-white/5 py-2">
              <span className="text-zinc-500 font-semibold">Wallet Status</span>
              <span className="font-semibold text-zinc-300">
                {isConnected ? "Connected" : "Not Connected"}
              </span>
            </div>
            <div className="flex justify-between border-b border-white/5 py-2">
              <span className="text-zinc-500 font-semibold">Wallet Address</span>
              <span className="font-mono text-zinc-400 text-[10px] break-all">
                {isConnected && address ? address : "—"}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-zinc-500 font-semibold">Active Chain</span>
              <span className="font-semibold text-zinc-300">
                {isConnected && chain ? `${chain.name} (${chain.id})` : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Reset Cache Block */}
        <div className="p-6 bg-red-950/5 border border-red-500/10 rounded-2xl flex items-center gap-4 justify-between">
          <div className="flex flex-col gap-1 max-w-[80%]">
            <h3 className="font-bold text-sm text-red-400 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-red-500" />
              Purge Local Cache
            </h3>
            <p className="text-xs text-zinc-500 leading-normal">
              Deletes all local receipt items stored in your browser. This will restore the mock seed data on the dashboard overview.
            </p>
          </div>
          <button
            onClick={handleClearCache}
            className="p-3 bg-red-950/20 hover:bg-red-950/40 border border-red-500/20 text-red-400 rounded-xl transition shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
