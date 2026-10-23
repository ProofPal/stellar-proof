import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Boxes,
  Code2,
  FileCheck2,
  GitBranch,
  ShieldCheck,
  Wallet,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Docs — StellarProof",
  description:
    "How StellarProof turns a Stellar payment into a verifiable Soroban receipt.",
};

const sections = [
  { id: "overview", label: "Overview", icon: BookOpen },
  { id: "how-it-works", label: "How it works", icon: GitBranch },
  { id: "pay", label: "Send a payment", icon: Wallet },
  { id: "verify", label: "Verify a receipt", icon: ShieldCheck },
  { id: "contract", label: "Smart contract", icon: Boxes },
  { id: "api", label: "API", icon: Code2 },
  { id: "local-setup", label: "Local setup", icon: FileCheck2 },
  { id: "limits", label: "Limits", icon: ShieldCheck },
];

function Code({ children }: { children: string }) {
  return (
    <pre className="my-4 overflow-x-auto rounded-xl border border-white/5 bg-black/40 p-4 text-xs leading-relaxed text-zinc-300">
      <code>{children}</code>
    </pre>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 border-t border-white/5 pt-10 first:border-0 first:pt-0">
      <h2 className="mb-4 text-2xl font-bold tracking-tight text-white">{title}</h2>
      <div className="flex flex-col gap-4 text-sm leading-relaxed text-zinc-400">
        {children}
      </div>
    </section>
  );
}

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-200">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#09090b]/90 px-6 py-4 backdrop-blur md:px-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 text-lg font-bold text-white">
              S
            </span>
            <span className="font-semibold tracking-tight text-white">
              StellarProof
            </span>
            <span className="hidden text-xs font-semibold uppercase tracking-widest text-zinc-500 sm:inline">
              Docs
            </span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <a
              href="https://github.com/techAlhaji/stellar-proof"
              target="_blank"
              rel="noreferrer"
              className="hidden text-zinc-400 transition hover:text-white sm:inline"
            >
              GitHub
            </a>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:bg-white/5 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to app
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-10 px-6 py-10 md:px-10">
        <aside className="hidden w-56 shrink-0 lg:block">
          <nav className="sticky top-24 flex flex-col gap-1">
            <span className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
              Documentation
            </span>
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-white"
              >
                <section.icon className="h-4 w-4 text-zinc-600" />
                {section.label}
              </a>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mb-10">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-purple-400">
              StellarProof documentation
            </p>
            <h1 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl">
              A payment record you can verify.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-400">
              StellarProof writes a receipt in the same Soroban invocation that
              moves a Stellar payment. The payment and the record succeed or fail
              together, and anyone can read the receipt from contract storage.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-semibold">
              <span className="rounded-full border border-amber-500/20 bg-amber-950/20 px-3 py-1 text-amber-300">
                Stellar Testnet
              </span>
              <span className="rounded-full border border-red-500/20 bg-red-950/20 px-3 py-1 text-red-300">
                Unaudited
              </span>
              <span className="rounded-full border border-emerald-500/20 bg-emerald-950/20 px-3 py-1 text-emerald-300">
                No custody
              </span>
            </div>
          </div>

          <div className="mb-10 grid grid-cols-2 gap-2 sm:hidden">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-xs text-zinc-400"
              >
                {section.label}
              </a>
            ))}
          </div>

          <div className="flex flex-col gap-12">
            <Section id="overview" title="Overview">
              <p>
                A Stellar payment produces a transaction hash. The hash proves
                value moved; it does not say what was bought, who agreed, or how
                to book it. StellarProof adds the missing record at the moment of
                payment.
              </p>
              <p>
                The app is a Next.js frontend and a Soroban contract. The contract
                has one job: transfer an asset through its Stellar Asset Contract
                and store a receipt. There is no admin key, no upgrade path and no
                custody.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                  <p className="mb-1 text-xs font-bold text-white">One signature</p>
                  <p className="text-xs">
                    The wallet signs one Soroban invocation. The transfer and the
                    receipt are atomic.
                  </p>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                  <p className="mb-1 text-xs font-bold text-white">
                    No indexer required
                  </p>
                  <p className="text-xs">
                    A verifier derives the storage key and calls{" "}
                    <code className="text-zinc-300">getLedgerEntries</code>.
                  </p>
                </div>
              </div>
            </Section>

            <Section id="how-it-works" title="How it works">
              <ol className="flex flex-col gap-3">
                {[
                  "Enter the recipient, amount, asset and purpose. The app validates the address, amount precision and asset.",
                  "POST /api/stellar/prepare-payment builds create_receipt(...) and simulates it. Simulation attaches the storage footprint, auth and resource fee.",
                  "The wallet signs the envelope once through Stellar Wallets Kit.",
                  "POST /api/stellar/submit-payment sends it to Soroban RPC and polls until SUCCESS.",
                  "The contract transfers the asset through its SAC, writes the receipt, indexes both parties and emits ReceiptAnchored.",
                  "The public verifier reads the receipt from storage with getLedgerEntries.",
                ].map((step, index) => (
                  <li key={step} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-purple-500/20 bg-purple-600/10 text-[11px] font-bold text-purple-300">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <p>
                If the transfer, the storage write or the event fails, the whole
                invocation reverts. There is no state where the money moved and
                the receipt did not.
              </p>
            </Section>

            <Section id="pay" title="Send a payment">
              <p>
                Connect a Stellar wallet with Testnet XLM. Fund the account at{" "}
                <a
                  href="https://friendbot.stellar.org"
                  target="_blank"
                  rel="noreferrer"
                  className="text-purple-400 underline decoration-purple-500/30 underline-offset-4"
                >
                  Friendbot
                </a>
                . Demo Mode is off by default; when it is on, the app labels every
                simulated receipt and does not produce an onchain proof.
              </p>
              <ol className="flex list-decimal flex-col gap-2 pl-5">
                <li>Open Create Payment and connect the wallet.</li>
                <li>Enter a recipient starting with G, an amount with up to 7 decimals, an asset and a purpose.</li>
                <li>Review the balance, spendable amount after the reserve and the fee estimate.</li>
                <li>Select Pay &amp; Anchor Receipt on Stellar and approve once in the wallet.</li>
                <li>Open the receipt to see the transaction hash, IPFS CID and parties.</li>
              </ol>
              <p>
                The base network fee is 100 stroops (0.00001 XLM). Soroban adds a
                resource fee for compute and storage; simulation returns the exact
                amount. StellarProof charges no protocol fee.
              </p>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <p className="mb-2 text-xs font-bold text-white">USDC</p>
                <p className="text-xs">
                  The payer needs a USDC trustline and a balance. The USDC Stellar
                  Asset Contract must be deployed on the network. The app returns a
                  specific error for each missing step.
                </p>
              </div>
            </Section>

            <Section id="verify" title="Verify a receipt">
              <p>
                Open <code className="text-zinc-300">/verify/&lt;receipt-id&gt;</code>{" "}
                in any browser. No wallet is needed. The page derives{" "}
                <code className="text-zinc-300">[&quot;Receipt&quot;, id]</code> and
                reads it from contract storage.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-emerald-500/15 bg-emerald-950/10 p-4">
                  <p className="mb-2 text-xs font-bold text-emerald-300">
                    What it proves
                  </p>
                  <ul className="flex list-disc flex-col gap-1 pl-4 text-xs">
                    <li>A transaction wrote this receipt id.</li>
                    <li>The stored parties, amount, symbol and CID match.</li>
                    <li>The record has not been edited.</li>
                  </ul>
                </div>
                <div className="rounded-xl border border-amber-500/15 bg-amber-950/10 p-4">
                  <p className="mb-2 text-xs font-bold text-amber-300">
                    What it does not prove
                  </p>
                  <ul className="flex list-disc flex-col gap-1 pl-4 text-xs">
                    <li>That the recipient agreed; only the payer signs.</li>
                    <li>That the symbol names the asset that moved.</li>
                    <li>That the IPFS payload matches the payment.</li>
                    <li>That the record lasts forever; the TTL is ~90 days.</li>
                  </ul>
                </div>
              </div>
              <p>
                A local browser copy is not proof. The verified state requires a
                Soroban read. Demo Mode never shows it.
              </p>
            </Section>

            <Section id="contract" title="Smart contract">
              <p>
                Contract <code className="text-zinc-300">StellarProofReceipts</code>{" "}
                in <code className="text-zinc-300">contracts/stellarproof</code>.
                Rust, <code className="text-zinc-300">soroban-sdk</code> 29.0.1,
                target <code className="text-zinc-300">wasm32v1-none</code>.
              </p>
              <div className="overflow-x-auto rounded-xl border border-white/5">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.03] text-zinc-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Function</th>
                      <th className="px-4 py-3 font-semibold">Auth</th>
                      <th className="px-4 py-3 font-semibold">Purpose</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {[
                      ["create_receipt", "sender", "Transfer the asset, write the receipt and index both parties."],
                      ["get_receipt", "none", "Return a receipt or ReceiptNotFound."],
                      ["verify_receipt", "none", "Return Some(receipt) or None."],
                      ["get_receipts_by_user", "none", "Return the ids where an address was sender or receiver."],
                    ].map(([fn, auth, purpose]) => (
                      <tr key={fn}>
                        <td className="px-4 py-3 font-mono text-[11px] text-purple-300">{fn}</td>
                        <td className="px-4 py-3 text-zinc-500">{auth}</td>
                        <td className="px-4 py-3">{purpose}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>
                Storage:{" "}
                <code className="text-zinc-300">[&quot;Receipt&quot;, id]</code> and{" "}
                <code className="text-zinc-300">[&quot;UserReceipts&quot;, address]</code>{" "}
                are persistent. Both are extended to about 90 days at write time.
                Errors: <code className="text-zinc-300">EmptyReceiptId</code> (1),{" "}
                <code className="text-zinc-300">EmptyIpfsHash</code> (2),{" "}
                <code className="text-zinc-300">InvalidAmount</code> (3),{" "}
                <code className="text-zinc-300">ReceiptAlreadyExists</code> (4),{" "}
                <code className="text-zinc-300">ReceiptNotFound</code> (5).
              </p>
              <Code>{`create_receipt(sender, receipt_id, receiver, token, amount,
               token_symbol, ipfs_hash, purpose) -> Result<Receipt, Error>`}</Code>
              <p>
                v0.1 stores the payer-supplied <code className="text-zinc-300">token_symbol</code>,
                not the token address. The next contract version adds the address,
                permissionless TTL renewal and paged history.
              </p>
            </Section>

            <Section id="api" title="API">
              <div className="overflow-x-auto rounded-xl border border-white/5">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.03] text-zinc-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Route</th>
                      <th className="px-4 py-3 font-semibold">Method</th>
                      <th className="px-4 py-3 font-semibold">Returns</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {[
                      ["/api/stellar/prepare-payment", "POST", "Unsigned XDR, passphrase and amount in stroops"],
                      ["/api/stellar/submit-payment", "POST", "Transaction hash after SUCCESS"],
                      ["/api/stellar/receipt", "GET", "Receipt from contract storage, or null"],
                      ["/api/stellar/account", "GET", "Balances, reserve and fee estimate"],
                      ["/api/ipfs", "POST", "Pinned CID; 503 when PINATA_JWT is missing"],
                      ["/api/ai", "POST", "Receipt title, summary, explanation and tags"],
                      ["/api/ai-search", "POST", "Matching receipt ids"],
                    ].map(([route, method, returns]) => (
                      <tr key={route}>
                        <td className="px-4 py-3 font-mono text-[11px] text-purple-300">{route}</td>
                        <td className="px-4 py-3 text-zinc-500">{method}</td>
                        <td className="px-4 py-3">{returns}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>
                Stellar routes are uncached:{" "}
                <code className="text-zinc-300">dynamic = &quot;force-dynamic&quot;</code>{" "}
                and{" "}
                <code className="text-zinc-300">fetchCache = &quot;force-no-store&quot;</code>.
                Errors are <code className="text-zinc-300">{`{ error: string }`}</code>.
              </p>
            </Section>

            <Section id="local-setup" title="Local setup">
              <p>
                Requirements: Node 20+, pnpm 12.3.4, Rust stable with{" "}
                <code className="text-zinc-300">wasm32v1-none</code>, and Stellar
                CLI 28.1.0.
              </p>
              <Code>{`pnpm install --frozen-lockfile
cp .env.example .env
pnpm typecheck
pnpm lint
pnpm test
pnpm build`}</Code>
              <p>Contract:</p>
              <Code>{`rustup target add wasm32v1-none
stellar keys generate stellarproof-deployer --network testnet
stellar keys fund stellarproof-deployer --network testnet
pnpm contract:build
STELLAR_DEPLOYER_SECRET=$(stellar keys secret stellarproof-deployer) pnpm deploy:testnet`}</Code>
              <p>
                Put the printed contract id in{" "}
                <code className="text-zinc-300">NEXT_PUBLIC_STELLARPROOF_CONTRACT_ID</code>{" "}
                and restart the dev server. There is no initialize call.
              </p>
              <p>
                Live IPFS requires <code className="text-zinc-300">PINATA_JWT</code>.
                Optional keys: <code className="text-zinc-300">GEMINI_API_KEY</code>,{" "}
                <code className="text-zinc-300">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
                <code className="text-zinc-300">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
              </p>
            </Section>

            <Section id="limits" title="Limits">
              <ul className="flex list-disc flex-col gap-2 pl-5">
                <li>The receipt is payer-attested. The recipient does not sign.</li>
                <li>v0.1 stores a payer-supplied symbol, not the token address.</li>
                <li>Persistent entries expire after about 90 days; v0.1 has no renewal.</li>
                <li>Receipt history is per browser; there is no account indexer yet.</li>
                <li>The PDF is a payment record, not a tax document.</li>
                <li>The contract and app are unaudited. Testnet only.</li>
              </ul>
            </Section>
          </div>

          <div className="mt-12 border-t border-white/5 pt-6 text-xs text-zinc-500">
            Found a problem? Open an issue on{" "}
            <a
              href="https://github.com/techAlhaji/stellar-proof/issues"
              target="_blank"
              rel="noreferrer"
              className="text-purple-400 hover:text-purple-300"
            >
              GitHub
            </a>
            . Do not report a vulnerability publicly; see SECURITY.md.
          </div>
        </main>
      </div>
    </div>
  );
}
