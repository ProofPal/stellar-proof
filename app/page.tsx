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

export default function Home() {
  // Prevent Next.js hydration mismatches on mount
  const [mounted, setMounted] = useState(false);
  
  // Dashboard routing states
  const [activeView, setActiveView] = useState<"landing" | "dashboard">("landing");
  const [currentTab, setCurrentTab] = useState<string>("overview");
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);
  
  // Storage and Mode States
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [mockMode, setMockMode] = useState<boolean>(true); // Default to mock mode for seamless reviewer setup

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
        }}
        onBackToLanding={() => {
          setSelectedReceipt(null);
          setActiveView("landing");
        }}
      />

      {/* Main Panel Content Area */}
      <main className="flex-1 p-8 md:p-12 overflow-y-auto h-screen relative">
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
  );
}
