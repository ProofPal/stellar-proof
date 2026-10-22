"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { STELLAR_NETWORK } from "@/lib/stellar";

type Kit = typeof import("@creit.tech/stellar-wallets-kit/sdk").StellarWalletsKit;

interface WalletContextValue {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signTransaction: (xdr: string) => Promise<string>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

/**
 * Stellar Wallets Kit is browser-only, so it is loaded lazily the first time a
 * wallet interaction is needed instead of at module scope (which would break
 * server rendering).
 */
let kitPromise: Promise<Kit> | null = null;

function getKit(): Promise<Kit> {
  if (!kitPromise) {
    kitPromise = (async () => {
      const [{ StellarWalletsKit }, { defaultModules }, { Networks }] =
        await Promise.all([
          import("@creit.tech/stellar-wallets-kit/sdk"),
          import("@creit.tech/stellar-wallets-kit/modules/utils"),
          import("@creit.tech/stellar-wallets-kit/types"),
        ]);

      StellarWalletsKit.init({
        modules: defaultModules(),
        network: Networks.TESTNET,
      });

      return StellarWalletsKit;
    })();
  }

  return kitPromise;
}

function describeError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string") return error;
  return "The Stellar wallet request failed. Please try again.";
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore an existing wallet session and follow wallet-driven state changes.
  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    (async () => {
      try {
        const kit = await getKit();
        const { KitEventType } = await import(
          "@creit.tech/stellar-wallets-kit/types"
        );

        unsubscribe = kit.on(KitEventType.STATE_UPDATED, (event) => {
          setAddress(event.payload.address ?? null);
        });

        const stored = await kit.getAddress();
        if (!cancelled && stored.address) setAddress(stored.address);
      } catch {
        // No wallet session yet: the user will connect manually.
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const kit = await getKit();
      const { address: connected } = await kit.authModal();
      if (!connected) {
        throw new Error("The wallet did not return an address.");
      }
      setAddress(connected);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      const kit = await getKit();
      await kit.disconnect();
    } catch (err) {
      console.warn("Wallet disconnect failed:", err);
    } finally {
      setAddress(null);
    }
  }, []);

  const signTransaction = useCallback(
    async (xdr: string) => {
      const kit = await getKit();
      if (!address) {
        throw new Error("Connect a Stellar wallet before signing.");
      }

      const { signedTxXdr } = await kit.signTransaction(xdr, {
        networkPassphrase: STELLAR_NETWORK.networkPassphrase,
        address,
      });

      return signedTxXdr;
    },
    [address]
  );

  const value = useMemo<WalletContextValue>(
    () => ({
      address,
      isConnected: Boolean(address),
      isConnecting,
      error,
      connect,
      disconnect,
      signTransaction,
    }),
    [address, isConnecting, error, connect, disconnect, signTransaction]
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useStellarWallet(): WalletContextValue {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useStellarWallet must be used inside a WalletProvider.");
  }
  return context;
}
