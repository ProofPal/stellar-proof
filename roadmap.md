# Roadmap

Testnet only. Unaudited. Updated 2026-11-26, after the v0.3 deployment.

## Shipped

- **v0.1** — atomic XLM payment + Soroban receipt with IPFS pointer.
- **v0.2** — token contract address in `Receipt`, paged user history, permissionless `bump_receipt`, onchain-first dashboard, verifier and receipt detail.
- **v0.3** — SEP-41 `symbol()` read at write time (payer label only as fallback), recipient acknowledgement (`acknowledge_receipt`, `get_acknowledgement`, `NotReceiver`/`AlreadyAcknowledged`), acknowledgement read through `getLedgerEntries`, receipt-detail signing flow, deployed on Testnet as `CAKJZYIMOMWO72KMJCQ7VJR37IIZXZDXTJRAALLCKGX4U3YB5JGQZCZO`.

## Next

1. Validate pinned IPFS metadata against the onchain receipt and show match/mismatch explicitly.
2. Load beyond the first page of onchain history with a cursor-aware "Load more".
3. Surface failed history reads instead of an empty list.
4. Refresh the displayed expiry after a successful renewal.
5. CSV export using RFC 4180 quoting and decimal strings.
6. Issue and pull request templates.
7. Remove the tax-record wording from the landing page and align other unsupported claims.
8. Keep the in-app docs and README in sync as the interface changes.
9. Require the `app` and `contract` checks plus one approval on `main`.

## Decisions needed

- **Name collision.** Resolve the `StellarProof` name against the other approved Wave repo before renaming anything user-facing.
- **Acknowledgement posture.** Today it is opt-in and clearly labelled as not proof of delivery. Mandatory acknowledgement would change the payment flow and is not planned.

## Deployment gap

- The hosted app still points at v0.2 until it is redeployed with `NEXT_PUBLIC_STELLARPROOF_CONTRACT_ID` set to the v0.3 contract. `NEXT_PUBLIC_*` values are inlined at build time.
- v0.3 is a new contract ID; earlier receipts remain readable only in their old deployments and are not migrated.
