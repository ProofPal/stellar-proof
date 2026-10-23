# Contributing

StellarProof is a Next.js app plus one Soroban contract. Contributions are welcome in both layers, but they have different rules and different review needs.

Read this before opening a pull request. If something here is wrong or missing, open an issue with the `docs` label.

## Ground rules

- Be specific. "It does not work" is not a bug report. Include the command, the error text, the network and the contract ID (or say that it is not configured).
- Do not commit secrets. No `S...` keys, no API keys, no `.env` files.
- Do not claim a receipt is verified onchain unless it was read from Soroban storage.
- Do not add an EVM dependency. This project is Stellar-only.
- Do not weaken a check to make CI pass. Fix the cause.
- One logical change per pull request. If it spans the contract and the app, link the two PRs and say which one must merge first.

## Setup

Prerequisites: Node 20+, pnpm, Rust stable, the `wasm32v1-none` target and Stellar CLI 28.1.0.

```bash
pnpm install --frozen-lockfile
cp .env.example .env
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Contract:

```bash
rustup target add wasm32v1-none
cargo test --workspace
cargo build --workspace --release --target wasm32v1-none
```

You do not need a deployed contract to run the app. Demo Mode is available from Settings. It simulates payments and must never be used to claim a live transaction.

## Repository layout

| Path | Responsibility |
| --- | --- |
| `app/` | Next.js pages and API routes. Server code only in `app/api/`. |
| `components/` | Client UI. Wallet access goes through `WalletProvider`. |
| `lib/stellar.ts` | Client-safe config, asset metadata, stroop math. No SDK import. |
| `lib/stellar-server.ts` | Server-only SDK: transaction assembly, submission, ledger reads. |
| `lib/db.ts` | Local-first receipt cache and optional Supabase sync. |
| `contracts/stellarproof/` | Rust contract and tests. |
| `tests/` | `node:test` suites through `tsx`. |
| `scripts/deploy.ts` | Wasm install and contract creation. |
| `app/docs/` | In-app documentation page, linked from the landing navbar. |
| `docs/demo_script.md` | Demo recording script. |

## Git workflow

1. Fork the repository or create a branch from `main`.
2. Name the branch by intent: `fix/ipfs-fail-closed`, `feat/receipt-history`, `docs/hosting`.
3. Commit in small logical units using Conventional Commits:
   - `feat(app): add csv export`
   - `fix(api): return 503 when pinata is not configured`
   - `test(contract): cover ttl renewal`
   - `docs: explain the 90 day ttl`
4. Stage specific files. **Never run `git add .`.**
5. Push after each commit. Do not batch a week of work into one push.
6. Open a pull request against `main`.

A commit that changes behavior needs a test in the same PR. A contract change needs the contract section in `app/docs/page.tsx` and the README updated.

## App standards

- TypeScript is strict. New code must not add `any`; use `unknown` and narrow it.
- Money is `bigint` in stroops. Do not use floats for ledger amounts.
- Validate Stellar addresses with `StrKey`, not a regex alone.
- Keep `@stellar/stellar-sdk` out of client components and `lib/stellar-server.ts` out of the browser bundle.
- Stellar routes keep `dynamic = "force-dynamic"` and `fetchCache = "force-no-store"`.
- Do not read `window` or `localStorage` during render. Use an effect and a mounted guard.
- A failed live operation must show an error. Do not fall back to a simulated success.
- New API routes need a test for validation and at least one failure path.

## Contract standards

- `#![no_std]`. No `std` imports, no `unsafe`.
- No `unwrap()` or `expect()` outside tests.
- Amounts are `i128`. No floats.
- `require_auth()` on the address whose funds or state are affected.
- Extend TTL on every persistent write.
- Keep error codes stable. New codes go at the end.
- Do not change a `DataKey` encoding in place. Deploy a new contract or add a versioned key.
- Tests cover the happy path, every error, auth failure and TTL.
- Run `cargo fmt` and `cargo clippy` before opening the PR.

## Documentation standards

- Short sentences. Concrete commands. Real numbers.
- State Testnet and "unaudited" where they apply.
- Do not describe a planned feature as shipped.
- If a claim depends on a live figure, link the source and date it.
- Update the README, the in-app docs page and the contract section together when an interface changes.

## Review and merge

`main` is protected. A pull request needs:

- A passing `app` check (typecheck, lint, test, build).
- A passing `contract` check (format, clippy, test, wasm build).
- One maintainer approval.
- No unresolved review threads.
- A merge commit or squash that keeps the Conventional Commit subject.

The maintainer may ask for a smaller PR. That is normal. Split it rather than argue.

## Labels

| Label | Meaning |
| --- | --- |
| `app` | Next.js, API routes, UI, SDK. |
| `contract` | Rust, Soroban, storage, TTL. |
| `docs` | README, in-app docs and specifications. |
| `bug` | Behavior that is wrong or misleading. |
| `enhancement` | New capability. |
| `priority:high` | Blocks a submission or a live demo. |
| `good first issue` | Scoped, with a clear acceptance test. |
| `blocked` | Depends on a contract deployment or an external decision. |
| `decision` | Needs a product or naming decision before code. |

## Security

Do not open a public issue for a vulnerability. Follow `SECURITY.md`.

## License

By contributing, you agree that your contribution is licensed under the MIT License in `LICENSE`.
