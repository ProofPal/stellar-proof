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
- **The symbol comes from the asset.** v0.3 reads SEP-41 `symbol()` from the
  token contract at write time and keeps the payer label only as a fallback for
  tokens without metadata. The native SAC's `native` symbol is shown as `XLM`
  by the server; the stored token address stays authoritative.
- **Recipients can acknowledge.** v0.3 adds `acknowledge_receipt`, which
  requires the recorded receiver's signature, stores a separate acknowledgement
  entry with its timestamp, and emits `ReceiptAcknowledged`. It adds no admin
  role and does not alter the receipt itself; a receipt and an acknowledgement
  remain separately verifiable.
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
  contract-derived symbol, the acknowledgement state and the storage expiry, and
  the receipt detail offers signing flows for acknowledgement and renewal.
- **New API routes:** `GET /api/stellar/receipts`, `POST /api/stellar/renew-receipt`
  and `POST /api/stellar/acknowledge-receipt`; submission still goes through the
  existing Soroban submit route.

Existing functions, error codes and the atomic transfer-then-write behavior are
unchanged.

## Deployment and verification

- Contract (v0.3, Testnet):
  [`CAKJZYIMOMWO72KMJCQ7VJR37IIZXZDXTJRAALLCKGX4U3YB5JGQZCZO`](https://stellar.expert/explorer/testnet/contract/CAKJZYIMOMWO72KMJCQ7VJR37IIZXZDXTJRAALLCKGX4U3YB5JGQZCZO)
- WASM SHA-256:
  `cd3f3e64cf456235536cdbf97e76b97ec9ca0b6f1131a6bb5ba02b3e5ac78edc`
- Exported functions: `create_receipt`, `get_receipt`, `verify_receipt`,
  `get_receipts_by_user`, `get_receipts_by_user_page`, `acknowledge_receipt`,
  `get_acknowledgement`, `bump_receipt`.
- Live smoke test with a real 0.005 XLM payment: the receipt stored the native
  SAC address and the SAC's own symbol, the recipient's acknowledgement
  transaction succeeded and its timestamp was read back from storage, and the
  receiver's paged history returned the new receipt id.

Checks that pass locally and in CI:

- `cargo test --workspace` — 23 contract tests.
- `cargo fmt --all -- --check`, `cargo clippy --workspace --all-targets`.
- `stellar contract build` with Stellar CLI 28.1.0.
- `pnpm typecheck`, `pnpm lint`, `pnpm test` (29 tests), `pnpm build`.

`change.md` in the repository describes every change in detail.

## Ready for contributions

The open issue batch is scoped for a single Wave cycle and uses the
`drips-wave` and `complexity:*` labels. It covers pinning-verification of IPFS
metadata, CSV export, history paging and failure states, refreshing expiry after
renewal, contributor templates, documentation sync, the repository name
decision, required CI checks and copy honesty. Each issue states its
acceptance criteria, the relevant files and the validation expected.

The project remains Testnet-only and unaudited, and the README states that
plainly. The appeal is not that the product is finished; it is that the
Soroban core is now real, deployed and verifiable, with a clear queue of work
for Wave contributors.
