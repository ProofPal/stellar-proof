"use client";

import React from "react";
import { LayoutDashboard, FileText, PlusCircle, Settings, LogOut, Wallet } from "lucide-react";
import { useAccount, useDisconnect, useNetwork, useSwitchNetwork } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  onBackToLanding: () => void;
}

export function Sidebar({ currentTab, onTabChange, onBackToLanding }: SidebarProps) {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { chain } = useNetwork();
  const { switchNetwork } = useSwitchNetwork();

  // Monad chain ID is 10143
  const isWrongNetwork = isConnected && chain && chain.id !== 10143;

  const menuItems = [
    { id: "overview", name: "Overview", icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: "receipts", name: "Receipts", icon: <FileText className="w-5 h-5" /> },
    { id: "payment", name: "Create Payment", icon: <PlusCircle className="w-5 h-5" /> },
    { id: "settings", name: "Settings", icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <aside className="w-64 border-r border-white/5 bg-[#09090b] flex flex-col justify-between p-6 shrink-0 h-screen sticky top-0">
      <div className="flex flex-col gap-8">
        {/* Logo */}
        <div 
          onClick={onBackToLanding} 
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center font-bold text-white text-lg transition-transform group-hover:scale-105">
            P
          </div>
          <span className="font-semibold text-lg tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
            ProofPal AI
          </span>
        </div>

        {/* Network Warning Box */}
        {isWrongNetwork && (
          <div className="p-3.5 bg-red-950/20 border border-red-500/20 rounded-xl flex flex-col gap-2">
            <p className="text-xs text-red-400 font-medium">Wrong Network Connected</p>
            <p className="text-[10px] text-zinc-500 leading-normal">
              Please switch to Monad Testnet to submit transactions.
            </p>
            {switchNetwork && (
              <button
                onClick={() => switchNetwork(10143)}
                className="w-full text-center py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition"
              >
                Switch Network
              </button>
            )}
          </div>
        )}

        {/* Menu Items */}
        <nav className="flex flex-col gap-1.5">
          {menuItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition duration-150 text-left ${
                  isActive
                    ? "bg-purple-600/15 border border-purple-500/20 text-purple-400"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white border border-transparent"
                }`}
              >
                {item.icon}
                {item.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Wallet Box / Footer */}
      <div className="flex flex-col gap-4 border-t border-white/5 pt-4">
        {isConnected ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 px-1">
              <Wallet className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-mono text-zinc-400">
                {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ""}
              </span>
            </div>
            <button
              onClick={() => disconnect()}
              className="flex items-center justify-center gap-2 w-full py-2 border border-white/5 hover:bg-white/5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              Disconnect
            </button>
          </div>
        ) : (
          <div className="flex justify-center">
            <ConnectButton chainStatus="none" showBalance={false} />
          </div>
        )}
      </div>
    </aside>
  );
}
