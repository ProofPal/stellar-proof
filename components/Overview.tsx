"use client";

import React, { useMemo } from "react";
import { ReceiptData } from "@/lib/db";
import { FileText, TrendingUp, DollarSign, Wallet, ArrowUpRight } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface OverviewProps {
  receipts: ReceiptData[];
  onViewDetail: (receipt: ReceiptData) => void;
}

export function Overview({ receipts, onViewDetail }: OverviewProps) {
  // 1. Calculate Analytics Metrics
  const stats = useMemo(() => {
    const totalCount = receipts.length;
    let totalVal = 0;
    let businessVal = 0;
    let personalVal = 0;

    receipts.forEach((r) => {
      const amt = parseFloat(r.amount) || 0;
      totalVal += amt;
      const isBusiness =
        r.category?.toLowerCase() === "business" ||
        r.category?.toLowerCase() === "security" ||
        r.category?.toLowerCase() === "design" ||
        r.category?.toLowerCase() === "saas" ||
        r.aiTags?.some(t => t.toLowerCase() === "business" || t.toLowerCase() === "freelance");

      if (isBusiness) {
        businessVal += amt;
      } else {
        personalVal += amt;
      }
    });

    const avg = totalCount > 0 ? (totalVal / totalCount).toFixed(2) : "0.00";

    return {
      totalCount,
      totalVolume: totalVal.toFixed(2),
      businessVolume: businessVal.toFixed(2),
      personalVolume: personalVal.toFixed(2),
      average: avg,
    };
  }, [receipts]);

  // 2. Prepare Data for Volume Chart (Grouped by date)
  const chartData = useMemo(() => {
    const grouped: { [key: string]: number } = {};
    
    // Seed some dates if receipts are low
    const sorted = [...receipts].sort((a, b) => a.timestamp - b.timestamp);
    
    sorted.forEach((r) => {
      const date = new Date(r.timestamp * 1000).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      grouped[date] = (grouped[date] || 0) + parseFloat(r.amount);
    });

    return Object.keys(grouped).map((key) => ({
      name: key,
      value: parseFloat(grouped[key].toFixed(2)),
    }));
  }, [receipts]);

  // 3. Prepare Data for Category Pie Chart
  const categoryData = useMemo(() => {
    const counts: { [key: string]: number } = {};
    receipts.forEach((r) => {
      const cat = r.category || "General";
      counts[cat] = (counts[cat] || 0) + 1;
    });

    return Object.keys(counts).map((key) => ({
      name: key,
      value: counts[key],
    }));
  }, [receipts]);

  const COLORS = ["#8A2BE2", "#a855f7", "#3b82f6", "#ec4899", "#f59e0b", "#10b981"];

  return (
    <div className="flex flex-col gap-8 w-full max-w-6xl mx-auto py-2">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Overview</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Cryptographically secure audit trails and payment dashboards.
        </p>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Receipts */}
        <div className="p-5 bg-zinc-900/40 border border-white/5 rounded-2xl flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-zinc-500 font-semibold tracking-wider uppercase">
              Total Receipts
            </span>
            <span className="text-2xl font-bold text-white">{stats.totalCount}</span>
          </div>
          <div className="p-3 bg-purple-600/10 text-purple-400 rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {/* Total Volume */}
        <div className="p-5 bg-zinc-900/40 border border-white/5 rounded-2xl flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-zinc-500 font-semibold tracking-wider uppercase">
              Total Volume
            </span>
            <span className="text-2xl font-bold text-white">{stats.totalVolume} MON</span>
          </div>
          <div className="p-3 bg-indigo-600/10 text-indigo-400 rounded-xl">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Business Share */}
        <div className="p-5 bg-zinc-900/40 border border-white/5 rounded-2xl flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-zinc-500 font-semibold tracking-wider uppercase">
              Business Payments
            </span>
            <span className="text-2xl font-bold text-white">{stats.businessVolume} MON</span>
          </div>
          <div className="p-3 bg-emerald-600/10 text-emerald-400 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Average Value */}
        <div className="p-5 bg-zinc-900/40 border border-white/5 rounded-2xl flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-zinc-500 font-semibold tracking-wider uppercase">
              Avg Payment
            </span>
            <span className="text-2xl font-bold text-white">{stats.average} MON</span>
          </div>
          <div className="p-3 bg-amber-600/10 text-amber-400 rounded-xl">
            <Wallet className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Area Chart */}
        <div className="p-6 bg-zinc-900/40 border border-white/5 rounded-2xl lg:col-span-2 flex flex-col gap-4">
          <div>
            <h3 className="font-bold text-base text-white">Payment Volume History</h3>
            <p className="text-zinc-500 text-xs mt-0.5">Aggregate values indexed from blockchain txs.</p>
          </div>
          <div className="h-64 w-full">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-500 text-sm">
                No transactions recorded yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8A2BE2" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8A2BE2" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#52525b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#52525b" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "10px",
                      color: "white",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#8A2BE2"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorVal)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Pie Chart */}
        <div className="p-6 bg-zinc-900/40 border border-white/5 rounded-2xl flex flex-col gap-4">
          <div>
            <h3 className="font-bold text-base text-white">Categories Breakdown</h3>
            <p className="text-zinc-500 text-xs mt-0.5">Percentage share across payments.</p>
          </div>
          <div className="h-64 w-full flex items-center justify-center relative">
            {categoryData.length === 0 ? (
              <div className="text-zinc-500 text-sm">No categories indexed</div>
            ) : (
              <div className="w-full h-full relative flex flex-col justify-center items-center">
                <ResponsiveContainer width="100%" height="80%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#18181b",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "10px",
                        color: "white",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Legend */}
                <div className="flex flex-wrap gap-2 justify-center mt-2 px-4 max-h-[20%] overflow-y-auto w-full">
                  {categoryData.map((entry, index) => (
                    <div key={index} className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span>{entry.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="p-6 bg-zinc-900/40 border border-white/5 rounded-2xl flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-bold text-base text-white">Recent Receipts</h3>
            <p className="text-zinc-500 text-xs mt-0.5">Latest receipts saved and logged on Monad.</p>
          </div>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/5 text-zinc-500 font-medium">
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">Recipient</th>
                <th className="py-3 px-4">Purpose</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {receipts.slice(0, 5).map((r) => (
                <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.02] transition">
                  <td className="py-3.5 px-4 font-semibold text-white">{r.aiTitle}</td>
                  <td className="py-3.5 px-4 font-mono text-zinc-400">
                    {r.receiver.slice(0, 6)}...{r.receiver.slice(-4)}
                  </td>
                  <td className="py-3.5 px-4 text-zinc-400 truncate max-w-[150px]">{r.purpose}</td>
                  <td className="py-3.5 px-4 font-bold text-white">
                    {r.amount} {r.tokenSymbol}
                  </td>
                  <td className="py-3.5 px-4 text-zinc-400">
                    {new Date(r.timestamp * 1000).toLocaleDateString()}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => onViewDetail(r)}
                      className="inline-flex items-center gap-1 text-xs text-purple-400 font-semibold hover:text-purple-300 transition"
                    >
                      View Receipt
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {receipts.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-500 text-sm">
                    No receipts recorded yet. Create a payment to generate one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
