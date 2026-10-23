# Security policy

## Status

StellarProof is a Testnet project. The contract and the app are **not audited**. Do not use them to custody real funds or to make production financial decisions.

| Version | Supported | Network |
| --- | --- | --- |
| `0.1.x` | Yes, for Testnet review | Stellar Testnet |
| `0.2.x` | Yes, after release | Stellar Testnet |
| Older | No | — |

There is no mainnet deployment and no bug bounty.

## Reporting a vulnerability

Use GitHub's private vulnerability reporting:

https://github.com/techAlhaji/stellar-proof/security/advisories/new

If private reporting is unavailable, open a minimal public issue that says a security contact is needed. Do not include exploit details, keys or user data in a public issue.

Include:

- The affected component: contract, API route, wallet flow, dependency or deployment.
- The commit or version.
- Reproduction steps or a proof of concept.
- The impact you believe it has.
- Whether Testnet funds were moved.

Do not test against other people's accounts or contracts. Use your own Testnet keys.

## Response targets

These are targets, not a contract:

- Acknowledge a report within 3 business days.
- Triage and confirm scope within 7 business days.
- Ship a fix or a mitigation as soon as the impact justifies it.
- Credit the reporter in the release notes if they want credit.

## In scope

- `contracts/stellarproof/src/lib.rs`: authorization, storage, TTL, transfer, event, error handling.
- `lib/stellar-server.ts`: transaction assembly, simulation, submission, receipt reads.
- `app/api/stellar/*`: validation, status codes, secret handling.
- `app/api/ipfs` and `app/api/ai*`: key handling, fallback behavior, injection.
- `components/WalletProvider.tsx`: signing flow, network passphrase, address handling.
- `scripts/deploy.ts`: secret handling, wasm path, transaction construction.
- Dependency vulnerabilities that are reachable from this code.

## Out of scope

- Testnet funds or Testnet downtime.
- Demo Mode. It is explicitly simulated and labelled.
- The public Stellar RPC or Horizon endpoints.
- Phishing, social engineering or wallet-extension compromise.
- Issues in third-party services (Gemini, Pinata, Supabase, Vercel) that are not caused by this code.
- Missing features, including the known limits in the README.

## Known limits that are not vulnerabilities

- The receipt is self-attested by the payer. The recipient does not sign.
- `token_symbol` is caller-supplied. v0.1 does not store the token address.
- Receipts expire after about 90 days unless renewed. v0.1 has no renewal function.
- Demo Mode is labelled and produces no onchain proof. If a simulated receipt is presented without the label, report it.
- The app has no mainnet hardening, rate limiting or abuse controls.

## Safe harbor

If you make a good-faith effort to avoid privacy violations, data loss and service disruption, and you report the issue privately, the maintainer will not pursue legal action for the research. This is not a waiver of any third party's rights.
