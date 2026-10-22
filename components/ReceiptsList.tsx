"use client";

import React, { useState, useMemo } from "react";
import { ReceiptData } from "@/lib/db";
import { Search, Sparkles, Filter, ArrowUpDown, XCircle, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

interface ReceiptsListProps {
  receipts: ReceiptData[];
  onViewDetail: (receipt: ReceiptData) => void;
}

export function ReceiptsList({ receipts, onViewDetail }: ReceiptsListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedToken, setSelectedToken] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [aiMatchingIds, setAiMatchingIds] = useState<string[] | null>(null);

  // 1. Get Categories and Tokens for dropdown filters
  const filterOptions = useMemo(() => {
    const categories = new Set<string>();
    const tokens = new Set<string>();
    receipts.forEach((r) => {
      if (r.category) categories.add(r.category);
      if (r.tokenSymbol) tokens.add(r.tokenSymbol);
    });
    return {
      categories: Array.from(categories),
      tokens: Array.from(tokens),
    };
  }, [receipts]);

  // 2. Trigger Gemini Natural Language AI Search
  const handleAiSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setAiMatchingIds(null);
      return;
    }

    setIsAiSearching(true);
    try {
      const response = await fetch("/api/ai-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery,
          receipts: receipts.map((r) => ({
            id: r.id,
            amount: r.amount,
            tokenSymbol: r.tokenSymbol,
            purpose: r.purpose,
            category: r.category,
            aiTitle: r.aiTitle,
            aiTags: r.aiTags,
            sender: r.sender,
            receiver: r.receiver,
            timestamp: r.timestamp,
          })),
        }),
      });

      if (!response.ok) throw new Error("Search request failed");
      const data = await response.json();
      
      if (data.success && Array.isArray(data.matchingIds)) {
        setAiMatchingIds(data.matchingIds);
      }
    } catch (err) {
      console.error("AI Search Error:", err);
    } finally {
      setIsAiSearching(false);
    }
  };

  // 3. Clear AI search filters
  const clearAiSearch = () => {
    setSearchQuery("");
    setAiMatchingIds(null);
  };

  // 4. Apply Filters and Sorting
  const filteredReceipts = useMemo(() => {
    let result = [...receipts];

    // Apply AI search filter if active
    if (aiMatchingIds !== null) {
      result = result.filter((r) => aiMatchingIds.includes(r.id));
    } else if (searchQuery.trim() !== "") {
      // Standard search filter fallback
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.purpose?.toLowerCase().includes(q) ||
          r.aiTitle?.toLowerCase().includes(q) ||
          r.category?.toLowerCase().includes(q) ||
          r.aiTags?.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Apply Category filter
    if (selectedCategory !== "all") {
      result = result.filter((r) => r.category === selectedCategory);
    }

    // Apply Token filter
    if (selectedToken !== "all") {
      result = result.filter((r) => r.tokenSymbol === selectedToken);
    }

    // Apply Sorting
    result.sort((a, b) => {
      if (sortBy === "newest") return b.timestamp - a.timestamp;
      if (sortBy === "oldest") return a.timestamp - b.timestamp;
      if (sortBy === "amount-high") return parseFloat(b.amount) - parseFloat(a.amount);
      if (sortBy === "amount-low") return parseFloat(a.amount) - parseFloat(b.amount);
      return 0;
    });

    return result;
  }, [receipts, searchQuery, selectedCategory, selectedToken, sortBy, aiMatchingIds]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto py-2">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Receipt History</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Search and view all payment receipt records.
        </p>
      </div>

      {/* AI & Simple Search Form */}
      <form onSubmit={handleAiSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-3.5 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (!e.target.value) setAiMatchingIds(null);
            }}
            placeholder="Search naturally, e.g., 'Show freelance receipts for July above 5 XLM'..."
            className="w-full pl-11 pr-24 py-3 bg-zinc-900/40 border border-white/5 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition"
          />
          {aiMatchingIds !== null && (
            <button
              type="button"
              onClick={clearAiSearch}
              className="absolute right-3 top-3 px-2.5 py-1 text-xs bg-purple-900/40 hover:bg-purple-900/60 border border-purple-500/20 text-purple-400 font-semibold rounded-lg flex items-center gap-1 transition"
            >
              Clear AI Filter
              <XCircle className="w-3 h-3" />
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={isAiSearching}
          className="px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-purple-800 disabled:to-indigo-800 text-white rounded-xl text-sm font-semibold flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-500/10 transition"
        >
          {isAiSearching ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          Ask AI
        </button>
      </form>

      {/* Filter Options Bar */}
      <div className="flex flex-wrap gap-4 items-center justify-between p-4 bg-zinc-900/20 border border-white/5 rounded-2xl">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 text-xs text-zinc-400 font-medium">
            <Filter className="w-3.5 h-3.5" />
            Filters:
          </div>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 bg-zinc-900/40 border border-white/5 rounded-lg text-xs text-zinc-300 focus:outline-none focus:border-purple-600 transition cursor-pointer"
          >
            <option value="all">All Categories</option>
            {filterOptions.categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Token Dropdown */}
          <select
            value={selectedToken}
            onChange={(e) => setSelectedToken(e.target.value)}
            className="px-3 py-1.5 bg-zinc-900/40 border border-white/5 rounded-lg text-xs text-zinc-300 focus:outline-none focus:border-purple-600 transition cursor-pointer"
          >
            <option value="all">All Tokens</option>
            {filterOptions.tokens.map((tok) => (
              <option key={tok} value={tok}>
                {tok}
              </option>
            ))}
          </select>
        </div>

        {/* Sorting Dropdown */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1.5 bg-zinc-900/40 border border-white/5 rounded-lg text-xs text-zinc-300 focus:outline-none focus:border-purple-600 transition cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="amount-high">Amount: High to Low</option>
            <option value="amount-low">Amount: Low to High</option>
          </select>
        </div>
      </div>

      {/* Grid of Receipts */}
      {isAiSearching ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl border border-white/5 bg-zinc-900/20 flex flex-col gap-4 justify-between h-48 relative overflow-hidden"
            >
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-start gap-4">
                  <div className="h-5 bg-zinc-800 rounded w-1/2" />
                  <div className="h-5 bg-zinc-800 rounded w-1/4" />
                </div>
                <div className="h-3 bg-zinc-800 rounded w-3/4 mt-1" />
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="h-3 bg-zinc-800 rounded w-full" />
                <div className="h-3 bg-zinc-800 rounded w-5/6" />
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-white/5 mt-1">
                <div className="flex gap-1.5 w-1/2">
                  <div className="h-4 bg-zinc-800 rounded-full w-10" />
                  <div className="h-4 bg-zinc-800 rounded-full w-12" />
                </div>
                <div className="h-3 bg-zinc-800 rounded w-12" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {filteredReceipts.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.3 }}
              onClick={() => onViewDetail(r)}
              className="p-5 rounded-2xl glass-card flex flex-col gap-4 justify-between h-48 cursor-pointer relative overflow-hidden"
            >
              {/* Top Row: Title & Amount */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-start gap-4">
                  <h3 className="font-bold text-base text-white truncate max-w-[70%]">
                    {r.aiTitle}
                  </h3>
                  <span className="font-bold text-purple-400 shrink-0 text-sm">
                    {r.amount} {r.tokenSymbol}
                  </span>
                </div>
                <p className="text-zinc-500 text-xs truncate max-w-full">
                  {r.purpose}
                </p>
              </div>

              {/* Middle Row: AI Summary Extract */}
              <p className="text-zinc-400 text-xs line-clamp-2 leading-relaxed">
                {r.aiSummary}
              </p>

              {/* Bottom Row: Tags & Date */}
              <div className="flex justify-between items-center border-t border-white/5 pt-3 mt-1">
                <div className="flex gap-1.5 overflow-hidden max-w-[70%]">
                  {r.aiTags?.slice(0, 2).map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 text-[9px] font-bold bg-purple-950/20 text-purple-400 border border-purple-500/10 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <span className="text-[10px] text-zinc-500 shrink-0">
                  {new Date(r.timestamp * 1000).toLocaleDateString()}
                </span>
              </div>
            </motion.div>
          ))}

          {filteredReceipts.length === 0 && (
            <div className="col-span-full py-16 text-center text-zinc-500 text-sm bg-zinc-900/10 border border-dashed border-white/5 rounded-2xl">
              No receipts matched your active search or filters.
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
