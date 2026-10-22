import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/components/WalletProvider";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StellarProof - Professional Onchain Stellar Receipts",
  description: "Automatically generate, naturally search, and cryptographically verify professional AI-powered payment receipts for every Stellar payment, anchored in a Soroban smart contract.",
  openGraph: {
    title: "StellarProof - Professional Onchain Stellar Receipts",
    description: "Every Stellar payment deserves a receipt. StellarProof creates professional, AI-powered receipts after every transaction, verifiable onchain with Soroban.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.className} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#09090b] text-[#f4f4f5]">
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}
