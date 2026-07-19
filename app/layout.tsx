import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/components/WalletProvider";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ProofPal AI - Professional Onchain Crypto Receipts",
  description: "Automatically generate, naturally search, and cryptographically verify professional AI-powered payment receipts after every blockchain transaction on the Monad network.",
  openGraph: {
    title: "ProofPal AI - Professional Onchain Crypto Receipts",
    description: "Every crypto payment deserves a receipt. ProofPal AI creates professional, AI-powered receipts after every transaction, verifiable onchain.",
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
