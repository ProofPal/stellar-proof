"use client";

import React from "react";
import { motion } from "framer-motion";
import { Shield, Brain, Search, FileText, HardDrive, Zap, ArrowRight, CheckCircle2 } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";

interface LandingProps {
  onLaunchApp: () => void;
}

export function Landing({ onLaunchApp }: LandingProps) {
  const { isConnected } = useAccount();

  const features = [
    {
      icon: <Brain className="w-6 h-6 text-purple-400" />,
      title: "AI-Powered Receipts",
      description: "Generates smart invoice titles, professional transaction summaries, friendly explanations, and tags automatically."
    },
    {
      icon: <Shield className="w-6 h-6 text-emerald-400" />,
      title: "Cryptographic Verification",
      description: "Creates verifiable proofs. Anyone can confirm receipt validity, sender/receiver keys, and blockchain blocks."
    },
    {
      icon: <Search className="w-6 h-6 text-blue-400" />,
      title: "Natural Language Search",
      description: "Search all payment histories naturally. Query: 'Show freelance receipts for July above 5 MON'."
    },
    {
      icon: <FileText className="w-6 h-6 text-pink-400" />,
      title: "PDF Export",
      description: "Download beautiful, Stripe-style PDF receipts optimized for professional business invoicing and tax records."
    },
    {
      icon: <HardDrive className="w-6 h-6 text-amber-400" />,
      title: "Permanent IPFS Storage",
      description: "Receipt metadata is permanently pinned to IPFS, ensuring database decentralization and immutable tracking."
    },
    {
      icon: <Zap className="w-6 h-6 text-violet-400" />,
      title: "Monad Powered",
      description: "Built on Monad Testnet for sub-second confirmations, high-throughput, and extremely low gas fee transactions."
    }
  ];

  const steps = [
    {
      num: "01",
      title: "Connect Wallet",
      desc: "Connect your Web3 wallet securely to the Monad Testnet."
    },
    {
      num: "02",
      title: "Send Payment",
      desc: "Fill in recipient details, amount, purpose, and trigger the transaction."
    },
    {
      num: "03",
      title: "AI Generates Receipt",
      desc: "Gemini AI generates summary metadata while files are pinned to IPFS."
    },
    {
      num: "04",
      title: "Verified Onchain",
      desc: "The transaction receipt ID and IPFS CID are committed permanently onchain."
    }
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#09090b]">
      {/* Background Glowing Orbs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] animate-orb" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[450px] h-[450px] bg-indigo-600/10 rounded-full blur-[130px] animate-orb-delayed" />

      {/* Navigation Header */}
      <header className="fixed top-0 left-0 right-0 z-50 py-4 px-6 md:px-12 flex justify-between items-center border-b border-white/5 glass">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center font-bold text-white text-lg">
            P
          </div>
          <span className="font-semibold text-lg tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
            ProofPal AI
          </span>
        </div>
        <div className="flex items-center gap-4">
          <ConnectButton chainStatus="none" showBalance={false} />
          {isConnected && (
            <button
              onClick={onLaunchApp}
              className="px-4 py-2 text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition duration-200"
            >
              Go to Dashboard
            </button>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 max-w-6xl mx-auto text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-purple-400 bg-purple-900/20 border border-purple-500/20 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            Built for Monad Testnet
          </span>
          <h1 className="text-4xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
            Every crypto payment <br className="hidden md:inline" />
            deserves a{" "}
            <span className="bg-gradient-to-r from-purple-500 via-indigo-400 to-pink-500 bg-clip-text text-transparent">
              receipt.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-zinc-400 max-w-3xl mx-auto mb-10 leading-relaxed">
            ProofPal AI automatically generates professional, cryptographically verifiable, and
            IPFS-stored payment receipts after blockchain transactions, searchable with natural language.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={onLaunchApp}
              className="group flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium rounded-xl shadow-lg shadow-purple-500/20 transition-all duration-200 cursor-pointer text-base"
            >
              Generate Your First Onchain Receipt
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </motion.div>
      </section>

      {/* Feature Showcase Grid */}
      <section className="py-20 px-6 max-w-6xl mx-auto relative z-10 border-t border-white/5">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Packed with Elite Features</h2>
          <p className="text-zinc-400 max-w-xl mx-auto">
            Everything you expect from modern enterprise payment platforms, built directly onchain.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05, duration: 0.5 }}
              className="p-6 rounded-2xl glass-card flex flex-col gap-4"
            >
              <div className="p-3 bg-white/5 rounded-xl w-fit">{feat.icon}</div>
              <h3 className="font-bold text-lg text-white">{feat.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{feat.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-20 px-6 max-w-6xl mx-auto relative z-10 border-t border-white/5">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Seamless Flow</h2>
          <p className="text-zinc-400 max-w-xl mx-auto">
            Create professional documents in seconds with AI metadata generation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
          {steps.map((step, i) => (
            <div key={i} className="flex flex-col gap-4 relative">
              <div className="flex items-center gap-4">
                <span className="text-4xl font-extrabold text-white/10 tracking-widest font-mono">
                  {step.num}
                </span>
                {i < 3 && (
                  <div className="hidden md:block absolute left-[30%] right-[-70%] top-6 h-[1px] bg-gradient-to-r from-purple-500/30 to-transparent" />
                )}
              </div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-purple-500 shrink-0" />
                {step.title}
              </h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 md:px-12 border-t border-white/5 bg-[#070709] relative z-10 text-sm text-zinc-500">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-purple-600 flex items-center justify-center font-bold text-white text-xs">
              P
            </div>
            <span className="font-semibold text-zinc-300">ProofPal AI</span>
          </div>
          <div className="flex gap-6">
            <a href="https://github.com/techAlhaji/proofpal-ai" target="_blank" rel="noreferrer" className="hover:text-white transition">GitHub</a>
            <a href="https://github.com/techAlhaji/proofpal-ai#readme" target="_blank" rel="noreferrer" className="hover:text-white transition">Docs</a>
            <a href="#" className="hover:text-white transition">Privacy</a>
            <a href="#" className="hover:text-white transition">Terms</a>
          </div>
          <div>© {new Date().getFullYear()} ProofPal AI. Built for BuildAnything Hackathon.</div>
        </div>
      </footer>
    </div>
  );
}
