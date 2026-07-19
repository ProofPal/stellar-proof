"use client";

import React from "react";
import "@rainbow-me/rainbowkit/styles.css";
import {
  getDefaultWallets,
  RainbowKitProvider,
  darkTheme,
} from "@rainbow-me/rainbowkit";
import { configureChains, createConfig, WagmiConfig } from "wagmi";
import { publicProvider } from "wagmi/providers/public";

// Define custom Monad Testnet chain (EVM compatible)
export const monadTestnet = {
  id: 10143,
  name: "Monad Testnet",
  network: "monad-testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Monad MON",
    symbol: "MON",
  },
  rpcUrls: {
    public: { http: ["https://testnet-rpc.monad.xyz"] },
    default: { http: ["https://testnet-rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: { name: "MonadExplorer", url: "https://testnet.monadexplorer.com" },
  },
  testnet: true,
};

// Configure chains & providers using Wagmi v1 architecture
const { chains, publicClient, webSocketPublicClient } = configureChains(
  [monadTestnet],
  [publicProvider()]
);

// Get default wallets configuration for RainbowKit
const { connectors } = getDefaultWallets({
  appName: "ProofPal AI",
  projectId: "ca29e03d12fa4293bc12ab56ef8f2c3d", // Standard project ID (can be set via env later)
  chains,
});

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
  webSocketPublicClient,
});

export function WalletProvider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider
        chains={chains}
        theme={darkTheme({
          accentColor: "#8A2BE2", // Indigo / Monad theme purple
          accentColorForeground: "white",
          borderRadius: "medium",
          overlayBlur: "small",
        })}
        modalSize="compact"
      >
        {children}
      </RainbowKitProvider>
    </WagmiConfig>
  );
}
export { chains };
