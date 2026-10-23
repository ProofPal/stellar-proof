"use client";

import React from "react";
import {
  BookOpen,
  LayoutDashboard,
  FileText,
  PlusCircle,
  Settings,
  X,
} from "lucide-react";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { STELLAR_NETWORK } from "@/lib/stellar";

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  onBackToLanding: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({
  currentTab,
  onTabChange,
  onBackToLanding,
  isOpen,
  onClose,
}: SidebarProps) {
  const menuItems = [
    { id: "overview", name: "Overview", icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: "receipts", name: "Receipts", icon: <FileText className="w-5 h-5" /> },
    { id: "payment", name: "Create Payment", icon: <PlusCircle className="w-5 h-5" /> },
    { id: "settings", name: "Settings", icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
        />
      )}

      {/* Sidebar Aside */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-64 border-r border-white/5 bg-[#09090b] flex flex-col justify-between p-6 shrink-0 z-50 transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col gap-8">
          {/* Logo Row */}
          <div className="flex justify-between items-center">
            <div
              onClick={onBackToLanding}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center font-bold text-white text-lg transition-transform group-hover:scale-105">
                S
              </div>
              <span className="font-semibold text-lg tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                StellarProof
              </span>
            </div>
            {/* Mobile Close Button */}
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 border border-white/5 md:hidden rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Network Badge */}
          <div className="p-3.5 bg-purple-950/10 border border-purple-500/15 rounded-xl flex flex-col gap-1">
            <span className="text-xs text-purple-300 font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {STELLAR_NETWORK.name}
            </span>
            <span className="text-[10px] text-zinc-500 leading-normal">
              Soroban receipts are anchored on Stellar&apos;s smart contract
              runtime.
            </span>
          </div>

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
            <a
              href="/docs"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-zinc-400 hover:bg-white/5 hover:text-white border border-transparent transition duration-150"
            >
              <BookOpen className="w-5 h-5" />
              Documentation
            </a>
          </nav>
        </div>

        {/* Wallet Box / Footer */}
        <div className="flex flex-col gap-4 border-t border-white/5 pt-4">
          <ConnectWalletButton />
          <a
            href={STELLAR_NETWORK.friendbotUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[10px] text-zinc-500 hover:text-zinc-300 transition text-center"
          >
            Need testnet XLM? Use Friendbot
          </a>
        </div>
      </aside>
    </>
  );
}
