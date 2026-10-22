"use client";

import React from "react";
import { Loader2, LogOut, Wallet } from "lucide-react";
import { useStellarWallet } from "@/components/WalletProvider";
import { truncateAddress } from "@/lib/stellar";

export function ConnectWalletButton() {
  const { address, isConnected, isConnecting, error, connect, disconnect } =
    useStellarWallet();

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900/60 border border-white/10 rounded-xl">
          <Wallet className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-mono text-zinc-300">
            {truncateAddress(address)}
          </span>
        </div>
        <button
          type="button"
          onClick={() => disconnect()}
          title="Disconnect wallet"
          className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 border border-white/5 rounded-xl transition"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-stretch gap-1.5">
      <button
        type="button"
        onClick={() => connect()}
        disabled={isConnecting}
        className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-wait text-white text-sm font-semibold rounded-xl transition"
      >
        {isConnecting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Wallet className="w-4 h-4" />
        )}
        {isConnecting ? "Connecting..." : "Connect Wallet"}
      </button>
      {error && (
        <span className="text-[10px] text-red-400 leading-normal max-w-[220px]">
          {error}
        </span>
      )}
    </div>
  );
}
