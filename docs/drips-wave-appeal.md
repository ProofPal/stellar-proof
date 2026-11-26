# Drips Wave appeal — StellarProof

**Repository:** https://github.com/ProofPal/stellar-proof
**Program:** Stellar Wave
**Network:** Stellar Testnet (Soroban)

## Summary

StellarProof turns a Stellar payment into a verifiable business record. A payer
sends XLM or any issued asset, and the same Soroban invocation moves the funds
through the asset's Stellar Asset Contract and writes a receipt containing the
parties, asset, amount, purpose and an IPFS metadata pointer. Anyone can verify
the record by reading contract storage with `getLedgerEntries`, without an
account, an indexer or trust in the app.

The project is Stellar-only. There is no EVM dependency, no admin key, no
upgrade path and no custody.

## Development work since the rejection

The application was already Stellar-native, but the contract did not store
enough to make the receipt self-contained: it recorded a payer-supplied symbol
instead of the asset that moved, had no way to renew expiring records, and had
no bounded way to read an account's history. That work is now implemented,
tested and deployed.

- **Asset identity is onchain.** `Receipt` stores `token: Address`, the Stellar
  Asset Contract that actually moved, not just a display symbol. The
  `ReceiptAnchored` event carries the address as well.
- **Permissionless renewal.** `bump_receipt(receipt_id)` extends a receipt and
  both user indexes to the full persistent TTL and emits `ReceiptRenewed`. Any
  address can pay to keep a public proof alive; no authorization or admin role
  is introduced.
- **Bounded history.** `get_receipts_by_user_page(user, start, limit)` returns
  at most 50 receipt ids per call, so an account's history can be read without
  exceeding the invocation budget.
- **The app uses the chain as the source of truth.** The dashboard loads the
  connected account's history from the contract index and merges it with the
  local cache. The verifier and receipt detail show the asset contract, the
  payer-reported symbol, and the storage expiry, and the receipt detail offers
  a signing flow for renewal.
- **Two new API routes:** `GET /api/stellar/receipts` and
  `POST /api/stellar/renew-receipt`; submission still goes through the existing
  Soroban submit route.

Existing functions, error codes and the atomic transfer-then-write behavior are
unchanged.

## Deployment and verification

- Contract (v0.2, Testnet):
  [`CD7JEZD2N3T25ROZ2YTG3DYMO65NWWGXSD5ZSCRIZ36PUSWVVA34JAY5`](https://stellar.expert/explorer/testnet/contract/CD7JEZD2N3T25ROZ2YTG3DYMO65NWWGXSD5ZSCRIZ36PUSWVVA34JAY5)
- WASM SHA-256:
  `e5a3031802aed64baa95484d8d777664d5de49693ceede938ab7b204b7c1d009`
- Exported functions: `create_receipt`, `get_receipt`, `verify_receipt`,
  `get_receipts_by_user`, `get_receipts_by_user_page`, `bump_receipt`.
- Live smoke test: `get_receipts_by_user_page` returned an empty page for a new
  account, and `bump_receipt` on a missing id returned `ReceiptNotFound`
  (contract error 5).

Checks that pass locally and in CI:

- `cargo test --workspace` — 15 contract tests.
- `cargo fmt --all -- --check`, `cargo clippy --workspace --all-targets`.
- `stellar contract build` with Stellar CLI 28.1.0.
- `pnpm typecheck`, `pnpm lint`, `pnpm test` (26 tests), `pnpm build`.

`change.md` in the repository describes every change in detail.

## Ready for contributions

The open issue batch is scoped for a single Wave cycle and uses the
`drips-wave` and `complexity:*` labels. It covers receiver acknowledgement,
pinning-verification of IPFS metadata, CSV export, documentation sync, the
repository name decision and required CI checks. Each issue states its
acceptance criteria, the relevant files and the validation expected.

The project remains Testnet-only and unaudited, and the README states that
plainly. The appeal is not that the product is finished; it is that the
Soroban core is now real, deployed and verifiable, with a clear queue of work
for Wave contributors.
