"use client";

import React, { useState, useEffect } from "react";
import { Landing } from "@/components/Landing";
import { Sidebar } from "@/components/Sidebar";
import { Overview } from "@/components/Overview";
import { ReceiptsList } from "@/components/ReceiptsList";
import { CreatePayment } from "@/components/CreatePayment";
import { ReceiptDetail } from "@/components/ReceiptDetail";
import { Settings } from "@/components/Settings";
import { getLocalReceipts, ReceiptData } from "@/lib/db";
import { Menu } from "lucide-react";

export default function Home() {
  // Prevent Next.js hydration mismatches on mount
  const [mounted, setMounted] = useState(false);
  
  // Dashboard routing states
  const [activeView, setActiveView] = useState<"landing" | "dashboard">("landing");
  const [currentTab, setCurrentTab] = useState<string>("overview");
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);
  
  // Mobile drawer state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Storage and Mode States
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [mockMode, setMockMode] = useState<boolean>(false); // Live Testnet is the default; Demo Mode is opt-in

  useEffect(() => {
    setMounted(true);
    setReceipts(getLocalReceipts());
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-purple-500/10 border-t-purple-600 animate-spin" />
      </div>
    );
  }

  // Render Landing Page View
  if (activeView === "landing") {
    return <Landing onLaunchApp={() => setActiveView("dashboard")} />;
  }

  // Render Dashboard Layout View
  return (
    <div className="flex min-h-screen bg-[#09090b] text-[#f4f4f5]">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={(tab) => {
          setSelectedReceipt(null); // Clear active detail view on tab switch
          setCurrentTab(tab);
          setIsMobileMenuOpen(false); // Close mobile drawer
        }}
        onBackToLanding={() => {
          setSelectedReceipt(null);
          setActiveView("landing");
          setIsMobileMenuOpen(false);
        }}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Panel Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Top Navbar */}
        <header className="flex md:hidden items-center justify-between px-6 py-4 border-b border-white/5 bg-[#09090b]/80 backdrop-blur sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center font-bold text-white text-sm">
              S
            </div>
            <span className="font-semibold text-sm tracking-tight text-white">
              StellarProof
            </span>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 border border-white/5 rounded-lg transition"
          >
            <Menu className="w-4 h-4" />
          </button>
        </header>

        <main className="flex-1 p-6 md:p-12 overflow-y-auto h-[calc(100vh-60px)] md:h-screen relative">
          {mockMode && (
            <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-950/20 px-4 py-3 text-xs text-amber-300 leading-relaxed">
              Demo Mode is on. Receipts are simulated: no wallet signature, no
              Stellar transaction and no onchain proof. Turn it off in Settings
              to use Testnet.
            </div>
          )}
          {selectedReceipt ? (
            /* Receipt detail overrides current view if a receipt is selected */
            <ReceiptDetail
              receipt={selectedReceipt}
              onBack={() => {
                setSelectedReceipt(null);
                setReceipts(getLocalReceipts()); // Refresh receipts list
              }}
              mockMode={mockMode}
            />
          ) : (
            /* Render Active Tab Component */
            <>
              {currentTab === "overview" && (
                <Overview
                  receipts={receipts}
                  onViewDetail={(r) => setSelectedReceipt(r)}
                />
              )}
              {currentTab === "receipts" && (
                <ReceiptsList
                  receipts={receipts}
                  onViewDetail={(r) => setSelectedReceipt(r)}
                />
              )}
              {currentTab === "payment" && (
                <CreatePayment
                  mockMode={mockMode}
                  onSuccess={(r) => {
                    setReceipts(getLocalReceipts());
                    setSelectedReceipt(r);
                  }}
                />
              )}
              {currentTab === "settings" && (
                <Settings
                  mockMode={mockMode}
                  onToggleMockMode={() => setMockMode(!mockMode)}
                  onClearReceipts={() => setReceipts([])}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
