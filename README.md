# 🚀 ProofPal AI — Onchain Crypto Receipts & Verification

> **Theme**: BuildAnything - Spark Hackathon MVP  
> **Tagline**: *Every crypto payment deserves a receipt.*

![ProofPal AI Dashboard Screenshot](public/screenshots/dashboard_mockup.png)

ProofPal AI is a production-ready application designed to solve a major personal crypto problem: transaction history tracking and tax compliance. It automatically generates AI-powered, cryptographically verifiable, and IPFS-stored professional payment receipts for transactions on the Monad Testnet, allowing users to search their payments using natural language, verify them onchain, and export beautiful, tax-ready PDF invoices.

---

## 🏗️ Tech Stack & Architecture

* **Frontend**: Next.js 14 App Router, TypeScript, TailwindCSS v3, Framer Motion
* **Wallet**: Wagmi, RainbowKit, Viem
* **Smart Contract**: Solidity, Hardhat, Monad Testnet
* **Storage & Database**: Pinata IPFS Gateway, Supabase (with offline local failover)
* **AI Service**: Google Gemini (1.5 Flash Model)

```mermaid
graph TD
    User[Web3 User] -->|1. Triggers Payment| FE[Next.js Frontend]
    FE -->|2. Web3 TX| Monad[Monad Testnet EVM]
    FE -->|3. TX Context| Gemini[Gemini AI Engine]
    Gemini -->|4. AI Metadata| FE
    FE -->|5. Pin Payload| Pinata[Pinata IPFS Gateway]
    FE -->|6. Logs CID & Receipt ID| Contract[Solidity Contract]
    FE -->|7. Indexes Receipt| Supabase[Supabase DB / Local Storage]
```

---

## 📁 Project Folder Structure

```
proofpal-ai/
├── app/                  # Next.js App Router (Layout, Page, Global CSS)
│   ├── api/              # API Serverless Routes
│   │   ├── ai/           # Gemini AI Receipt Summary Generator
│   │   ├── ai-search/    # Gemini Natural Language Query Parser
│   │   └── ipfs/         # Pinata IPFS Pinning Gateway
│   ├── verify/[id]/      # Public receipt sharing and cryptographic verification route
│   │   └── page.tsx      # Public onchain/IPFS verification view
│   ├── globals.css       # Custom design system (glassmorphic theme)
│   ├── layout.tsx        # HTML wrapper & Wallet provider
│   └── page.tsx          # Router page coordinator
├── components/           # UI Component blocks
│   ├── Landing.tsx       # Landing page (Hero, features, timelines)
│   ├── Sidebar.tsx       # Navigation drawer & wrong-network warnings
│   ├── Overview.tsx      # Metrics, Recharts volume area charts, category pie charts
│   ├── ReceiptsList.tsx  # Natural language search input, sorting filters, history card grids
│   ├── CreatePayment.tsx # Send MON form, signatures, AI / IPFS / contract writer
│   ├── ReceiptDetail.tsx # Stripe-like white receipt card, vector PDF exporter, verification QR
│   └── Settings.tsx      # Demo mode toggle, cache purging, RPC connection diagnostics
├── contracts/            # Smart contracts
│   └── ProofPalReceipts.sol # Solidity metadata registry
├── scripts/              # deployment automation scripts
│   └── deploy.ts         # Hardhat compiler/deployer script
├── lib/                  # Services and clients
│   ├── db.ts             # Offline-first local storage client & Supabase sync engine
│   └── supabase.ts       # Supabase client wrapper
├── docs/                 # Documentation deliverables
│   └── demo_script.md    # 3-minute video presentation talking points
├── hardhat.config.ts     # Solidity hardhat settings
├── tailwind.config.js    # Tailwind v3 configurations
└── package.json          # Node modules build file
```

---

## 🚀 Setup and Installation Guide

### Prerequisites
* **Node.js** version `18.x` or `20.x`
* **npm** or **pnpm** (if enabled)

### 1. Clone & Install Dependencies
```bash
cd proofpal-ai
npm install
```

### 2. Configure Environment Variables
Copy the `.env.example` file to `.env` in the root directory:
```bash
cp .env.example .env
```
* `GEMINI_API_KEY`: Get a free key from [Google AI Studio](https://aistudio.google.com/).
* `PINATA_JWT`: Get an IPFS pinning JWT from [Pinata](https://pinata.cloud/).
* `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Setup a quick project on [Supabase](https://supabase.com/).
* `PRIVATE_KEY`: Your Monad Testnet deployer wallet private key (keep this secret!).

> [!NOTE]
> If these variables are not configured, ProofPal AI's **resilient fallback template system** automatically boots up. This simulates high-fidelity AI summaries, IPFS pinning CIDs, and database updates to allow immediate reviewer/judge exploration without any configuration barriers.

### 3. Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📜 Monad Testnet Smart Contract Setup

### 1. MetaMask Network Settings
To connect to Monad Testnet, add the network details manually in MetaMask:
* **Network Name**: Monad Testnet
* **New RPC URL**: `https://testnet-rpc.monad.xyz`
* **Chain ID**: `10143`
* **Currency Symbol**: `MON`
* **Block Explorer URL**: `https://testnet.monadexplorer.com`

*Request test tokens from the official Monad faucet before deploying/submitting.*

### 2. Compile Solidity
```bash
npx hardhat compile
```

### 3. Deploy to Monad Testnet
```bash
npm run deploy:monad
```
Upon successful deployment, copy the contract address printed on the console and paste it as the `CONTRACT_ADDRESS` constant inside [CreatePayment.tsx](file:///c:/Users/ICT%20LASIEC/.gemini/antigravity-ide/scratch/proofpal-ai/components/CreatePayment.tsx) and [page.tsx](file:///c:/Users/ICT%20LASIEC/.gemini/antigravity-ide/app/verify/[id]/page.tsx).

---

## 🏆 Hackathon Judging Highlights

Here is how ProofPal AI checks all boxes to maximize **BuildAnything** scoring:

1. **Practical Usefulness**: Directly solves invoice management and tax logs for business owners, freelancers, and protocol teams transacting in crypto.
2. **Dynamic Public Sharing (`/verify/[id]`)**: Anyone can share a receipt QR code or URL. The public page queries the Monad blockchain directly (using a public client RPC) and fetches metadata CIDs from IPFS to execute an authentic, decentralized audit check.
3. **Resilient Offline Fallback**: Features a **Demo Mode Toggle** in Settings. Judges can bypass MetaMask signatures and API keys to experience a fast, simulated receipt generation and verification flow in 30 seconds.
4. **Premium UI/UX**: Custom responsive sidebar drawers for mobile, staggered Framer Motion slide transitions, responsive volume charts, and high-fidelity skeletons while waiting for Gemini AI outputs.
5. **Stripe-Style Export**: Vector-based PDF generation builds high-fidelity invoices complete with verification badges, ledger hashes, and layout alignment.

---

## 🛠️ Troubleshooting & Support

* **RPC Timeout Errors**: If the Monad Testnet RPC is congested or down, toggle **Demo Mode** in the dashboard Settings to simulate successful transactions immediately.
* **MetaMask Switch Issues**: RainbowKit and Wagmi handles chain checks. If you are on an unsupported chain, the app will show a clear warning banner and switch buttons in both the sidebar and transaction forms to redirect you to Monad Testnet.
* **ESLint/TypeScript Errors during Build**: Run `npm run build` to verify typings, routing path checks, and React imports.

---

## 📺 Demo Video & Presentation Resources

* **Live Demo Video**: [Watch the 3-minute Pitch & Demo Video (Placeholder)](https://www.youtube.com/watch?v=dQw4w9WgXcQ)
* **Presentation Script**: Read our [demo_script.md](file:///c:/Users/ICT%20LASIEC/.gemini/antigravity-ide/scratch/proofpal-ai/docs/demo_script.md) located in `docs/` folder for the step-by-step pitch slides and script.


