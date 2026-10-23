#!/usr/bin/env bash
#
# Create the planned issue batch for techAlhaji/stellar-proof.
#
# Requirements:
#   - GitHub CLI installed and authenticated (`gh auth login`)
#   - Permission to create labels and issues on the target repo
#
# Usage:
#   ./scripts/create-issues.sh
#   REPO=owner/name ./scripts/create-issues.sh
#   DRY_RUN=1 ./scripts/create-issues.sh
#
set -euo pipefail

REPO="${REPO:-techAlhaji/stellar-proof}"
DRY_RUN="${DRY_RUN:-0}"

if ! command -v gh >/dev/null 2>&1; then
  echo "gh is not installed. Install it from https://cli.github.com/ and run gh auth login." >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "gh is not authenticated. Run: gh auth login" >&2
  exit 1
fi

ensure_label() {
  local name="$1"
  local color="$2"
  local description="$3"

  if [[ "$DRY_RUN" == "1" ]]; then
    echo "label: $name"
    return
  fi

  gh label create "$name" \
    --repo "$REPO" \
    --color "$color" \
    --description "$description" \
    --force >/dev/null
}

existing_titles() {
  gh issue list \
    --repo "$REPO" \
    --state all \
    --limit 300 \
    --json title \
    --jq '.[].title'
}

EXISTING="$(existing_titles)"

create_issue() {
  local title="$1"
  local labels="$2"
  local body="$3"

  if grep -Fxq "$title" <<<"$EXISTING"; then
    echo "skip (exists): $title"
    return
  fi

  if [[ "$DRY_RUN" == "1" ]]; then
    echo "issue: $title [$labels]"
    return
  fi

  gh issue create \
    --repo "$REPO" \
    --title "$title" \
    --label "$labels" \
    --body "$body"

  EXISTING+=$'\n'"$title"
}

echo "Preparing labels on $REPO"
ensure_label "app" "1d76db" "Next.js, API routes, UI and SDK"
ensure_label "contract" "b60205" "Rust, Soroban, storage and TTL"
ensure_label "docs" "0075ca" "README, in-app docs and specifications"
ensure_label "bug" "d73a4a" "Wrong or misleading behavior"
ensure_label "enhancement" "a2eeef" "New capability"
ensure_label "priority:high" "b60205" "Blocks a submission or a live demo"
ensure_label "good first issue" "7057ff" "Scoped with a clear acceptance test"
ensure_label "blocked" "fbca04" "Depends on a deployment or an external decision"
ensure_label "decision" "d4c5f9" "Needs a product or naming decision"

echo "Creating issues on $REPO"
echo

# ---------------------------------------------------------------------------
# P0: proof integrity
# ---------------------------------------------------------------------------

BODY_IPFS="$(cat <<'EOF'
## Summary

`app/api/ipfs/route.ts` returns a simulated `Qm...` CID when `PINATA_JWT` is missing. In live mode, `components/CreatePayment.tsx` sends that value to `/api/stellar/prepare-payment`, so the fake CID is written onchain. The receipt then points to metadata that does not exist.

## Why it matters

The public verifier treats the CID as the metadata pointer. A fake CID makes the proof look complete while the metadata is missing. It also hides a configuration error from the operator.

## Acceptance criteria

- [ ] A live request with no `PINATA_JWT` returns `503` with an actionable message.
- [ ] A simulated CID is never accepted by `/api/stellar/prepare-payment`.
- [ ] Demo Mode still works without Pinata because it does not call this route.
- [ ] A test covers the missing-key response and the no-simulated-CID invariant.
- [ ] The README and `.env.example` state that live pinning requires a key.

## Tech stack

Next.js App Router, TypeScript, Pinata JSON pinning, `node:test`.
EOF
)"

create_issue \
  "fix(api): fail closed when IPFS pinning is not configured" \
  "app,bug,priority:high" \
  "$BODY_IPFS"

BODY_DEMO="$(cat <<'EOF'
## Summary

`app/page.tsx` initialises `mockMode` to `true`, so the deployed app opens in a simulated state. A reviewer can create receipts, see a PDF and verify them without any Stellar transaction. The Settings page is the only place that explains the mode.

## Why it matters

A Wave reviewer should see the real product first. Simulated receipts that look real are a credibility risk and make the demo video ambiguous.

## Acceptance criteria

- [ ] `mockMode` starts `false`.
- [ ] When Demo Mode is enabled, a persistent banner says no onchain payment is made.
- [ ] The toggle is session-scoped and does not silently survive into a live flow.
- [ ] The receipt detail shows a "simulated" label on demo receipts.
- [ ] Tests or a component check cover the default state and the banner.

## Tech stack

Next.js 14, React 18, TypeScript, Tailwind CSS.
EOF
)"

create_issue \
  "fix(app): default demo mode off and label simulated receipts" \
  "app,bug,priority:high" \
  "$BODY_DEMO"

BODY_LOCAL="$(cat <<'EOF'
## Summary

`app/verify/[id]/page.tsx` falls back to `localStorage` when no onchain receipt is found and still renders the green "Verified" header. `components/ReceiptDetail.tsx` shows a verified state in Demo Mode. A local record is not an onchain proof.

## Why it matters

The public verifier is the product's main claim. If it marks local data as verified, the claim is false and a reviewer cannot distinguish a real proof from a browser cache.

## Acceptance criteria

- [ ] "Verified" renders only when `getLedgerEntries` returned a receipt.
- [ ] A local-only record renders as "Local preview - not onchain" with no verified badge.
- [ ] Demo Mode verification is labelled as simulated.
- [ ] A test covers the local-only case.
- [ ] The README and the `/docs` page explain the difference.

## Tech stack

Next.js App Router, TypeScript, Soroban RPC `getLedgerEntries`.
EOF
)"

create_issue \
  "fix(app): remove local-only verified state from the public verifier" \
  "app,bug,priority:high" \
  "$BODY_LOCAL"

# ---------------------------------------------------------------------------
# P0: contract integrity
# ---------------------------------------------------------------------------

BODY_TOKEN="$(cat <<'EOF'
## Summary

`Receipt` stores `token_symbol: String`, supplied by the caller, but not `token: Address`. A caller can transfer a worthless token and write `"USDC"` as the symbol. A verifier cannot prove which asset moved.

## Why it matters

The receipt is supposed to be evidence of a payment. Without the asset contract address, the evidence is incomplete and the symbol is unverified metadata.

## Acceptance criteria

- [ ] `Receipt` includes `pub token: Address`.
- [ ] `create_receipt` persists the `token` argument.
- [ ] `get_receipt` and `get_ledger_entries` clients can read the address.
- [ ] Tests assert the stored token address.
- [ ] The migration note says v0.2 deploys as a new contract ID; v0.1 stays read-only.
- [ ] The app displays the token address and labels the symbol as payer-reported.

## Tech stack

Rust, `soroban-sdk` 29.0.1, Soroban persistent storage, `wasm32v1-none`.
EOF
)"

create_issue \
  "feat(contract): store the token contract address in receipts" \
  "contract,enhancement,priority:high" \
  "$BODY_TOKEN"

BODY_TTL="$(cat <<'EOF'
## Summary

Persistent receipt entries are extended to about 90 days at write time. There is no renewal function, and the public verifier uses `getLedgerEntries`, which cannot extend TTL. After expiry, a valid payment can fail verification.

## Why it matters

"Verify forever" is a core promise. A 90-day proof is not durable, and a reviewer will ask what happens after the TTL lapses.

## Acceptance criteria

- [ ] Add `bump_receipt(env, receipt_id) -> Result<(), Error>`.
- [ ] No auth: any address can pay to keep a public proof alive.
- [ ] Return `ReceiptNotFound` for an unknown id.
- [ ] Extend the receipt and both user index TTLs.
- [ ] A test advances the ledger, calls from an unrelated address and asserts the TTL increased.
- [ ] The app shows the expiry date and offers a renewal action.

## Tech stack

Rust, `soroban-sdk` 29.0.1, persistent storage TTL.
EOF
)"

create_issue \
  "feat(contract): add permissionless receipt TTL renewal" \
  "contract,enhancement,priority:high" \
  "$BODY_TTL"

# ---------------------------------------------------------------------------
# P1: product integrity
# ---------------------------------------------------------------------------

BODY_HISTORY="$(cat <<'EOF'
## Summary

The dashboard lists receipts from `localStorage`. `get_receipts_by_user` exists but is not called. A new browser or device shows seed data, not the user's receipts.

## Why it matters

A receipt product that forgets a user's receipts on a new device is a demo, not a record system. The onchain data exists; the app does not read it.

## Acceptance criteria

- [ ] Add a server route that simulates `get_receipts_by_user_page(user, start, limit)`.
- [ ] Read each returned receipt and return a typed list.
- [ ] Use the route when a wallet is connected.
- [ ] Keep `localStorage` as an offline cache, clearly labelled.
- [ ] Handle an empty page and a contract with no index.
- [ ] Add tests for the empty and populated cases.

## Tech stack

Next.js API routes, `@stellar/stellar-sdk`, Soroban simulation.
EOF
)"

create_issue \
  "feat(app): load account receipt history from the contract" \
  "app,enhancement" \
  "$BODY_HISTORY"

BODY_META="$(cat <<'EOF'
## Summary

The public verifier fetches the IPFS payload but only uses it to fill missing display fields. It does not compare the payload to the onchain record. A CID can point to unrelated JSON and the page still renders.

## Why it matters

If the metadata does not match the payment, the receipt is misleading. The app should show a mismatch, not silently merge the two sources.

## Acceptance criteria

- [ ] Fetch the pinned JSON and compare `receiptId`, `sender`, `receiver`, `amount`, `tokenSymbol` and `purpose` to the onchain record.
- [ ] Show "metadata matches" or "metadata mismatch" explicitly.
- [ ] Do not claim cryptographic CID verification unless the CID is recomputed.
- [ ] Handle a gateway failure without hiding the onchain record.
- [ ] Add a test for a matching and a mismatching payload.

## Tech stack

Next.js, TypeScript, Pinata gateway, Soroban receipt data.
EOF
)"

create_issue \
  "feat(app): validate pinned metadata against the onchain receipt" \
  "app,enhancement" \
  "$BODY_META"

BODY_CSV="$(cat <<'EOF'
## Summary

The only export is a PDF. There is no CSV or accounting-friendly export, despite the product being positioned as a business record.

## Why it matters

A freelancer or small merchant needs a ledger, not a stack of PDFs. CSV is the smallest useful export and does not require an integration.

## Acceptance criteria

- [ ] Add a "Download CSV" action to the receipt list.
- [ ] Columns: receipt id, timestamp, sender, receiver, amount, symbol, token address, purpose, tx hash, IPFS CID.
- [ ] Use RFC 4180 quoting and UTF-8.
- [ ] Keep the amount as a decimal string; do not round through a float.
- [ ] Add a test for commas, quotes and newlines in the purpose.
- [ ] Update the user guide.

## Tech stack

React 18, TypeScript, browser Blob API.
EOF
)"

create_issue \
  "feat(app): add CSV export for accounting" \
  "app,enhancement,good first issue" \
  "$BODY_CSV"

# ---------------------------------------------------------------------------
# Contract tests and product decision
# ---------------------------------------------------------------------------

BODY_TESTS="$(cat <<'EOF'
## Summary

The contract tests cover the happy path and the existing error codes. They do not cover a missing sender authorization, the event payload, or a self-payment index.

## Why it matters

Authorization is the security boundary. A regression there would let one account write a receipt for another account's payment. The event is the indexer contract.

## Acceptance criteria

- [ ] Add a test that calls `try_create_receipt` without `mock_all_auths` and asserts the auth failure.
- [ ] Add a test that asserts one `ReceiptAnchored` event with the expected topics.
- [ ] Add a self-payment test that asserts the index has one id.
- [ ] Keep the existing tests passing.
- [ ] Document any SDK limitation that prevents an assertion.

## Tech stack

Rust, `soroban-sdk` testutils, `Env::default()`.
EOF
)"

create_issue \
  "test(contract): cover auth failure, event payload and self-payment" \
  "contract,enhancement,good first issue" \
  "$BODY_TESTS"

BODY_ACK="$(cat <<'EOF'
## Summary

The receipt is written by the payer only. The recipient never signs, so the record proves a transfer and a claim, not an agreement or delivery.

## Why it matters

This is the difference between a receipt generator and a settlement record. It is also the strongest differentiation identified in the review.

## Decision needed

Choose one before implementation:

1. Keep payer-only receipts and say so in every user-facing description.
2. Add `acknowledge_receipt(receiver, receipt_id)` with `receiver.require_auth()` and a separate acknowledgement key.
3. Make acknowledgement mandatory, which changes the payment flow and leaves unacknowledged payments unresolved.

## Acceptance criteria (option 2 only)

- [ ] `receiver.require_auth()`.
- [ ] `NotReceiver` for the wrong address; `AlreadyAcknowledged` on a second call.
- [ ] Store `DataKey::Acknowledgement(receipt_id)` without changing `Receipt`.
- [ ] Emit `ReceiptAcknowledged`.
- [ ] Tests for success, wrong receiver, duplicate and missing auth.
- [ ] UI shows anchored, acknowledged and unacknowledged states.
- [ ] Docs explain what an unacknowledged receipt means.

## Tech stack

Rust, `soroban-sdk` 29.0.1, Soroban auth, Next.js.
EOF
)"

create_issue \
  "feat(contract): add receiver acknowledgement to receipts" \
  "contract,enhancement,decision" \
  "$BODY_ACK"

# ---------------------------------------------------------------------------
# Submission blockers
# ---------------------------------------------------------------------------

BODY_NAME="$(cat <<'EOF'
## Summary

`Tybravo/StellarProof` is an approved repo in the Wave program with a different product. This repo is also called StellarProof, and the live URL is `proofpal-ai.vercel.app`. Reviewers and contributors cannot tell the projects apart.

## Why it matters

A name collision in the same ecosystem is a positioning problem, not a cosmetic one. It affects search, contributor applications and reviewer trust. A half-rename is worse than either name.

## Decision needed

- [ ] Choose a final name and check GitHub, npm and the domain.
- [ ] Rename the repo, app title, PDF header, package name, crate name, env vars and live URL in one pass.
- [ ] Keep redirects from the old URL if possible.
- [ ] Update this repo's description and GitHub topics.
- [ ] Record the decision in the README and the in-app docs page.

## Tech stack

GitHub, Vercel, Next.js metadata, Cargo package metadata.
EOF
)"

create_issue \
  "decision: resolve the StellarProof name collision" \
  "decision,priority:high,docs" \
  "$BODY_NAME"

BODY_DOCS="$(cat <<'EOF'
## Summary

The in-app documentation page at `/docs` is linked from the landing navbar. It needs to stay in sync with the contract interface, API routes and known limits.

## Why it matters

A reviewer should not have to read the source to understand the lifecycle, the TTL or the verification model. Stale docs are worse than no docs.

## Acceptance criteria

- [ ] Every contract function on `/docs` matches `contracts/stellarproof/src/lib.rs`.
- [ ] Every API route on `/docs` matches `app/api/`.
- [ ] The local setup commands work from a clean checkout.
- [ ] The page states Testnet, unaudited and the 90-day TTL.
- [ ] The landing navbar and dashboard sidebar link to `/docs`.
- [ ] The README points to `/docs` instead of duplicating it.

## Tech stack

Next.js App Router, React, Tailwind CSS.
EOF
)"

create_issue \
  "docs: keep the in-app documentation in sync" \
  "docs,good first issue" \
  "$BODY_DOCS"

BODY_CI="$(cat <<'EOF'
## Summary

The repo has no required checks on `main`. CI now runs `app` and `contract`, but branch protection is a GitHub setting, not a file.

## Why it matters

A Wave repo is expected to take pull requests safely. Without required checks, a broken contract or a failing build can merge.

## Acceptance criteria

- [ ] Require a pull request before merging.
- [ ] Require one approval.
- [ ] Require the `app` and `contract` checks.
- [ ] Require conversation resolution.
- [ ] Block force pushes and deletions on `main`.
- [ ] Document the settings in `README.md`.

## Tech stack

GitHub branch protection, GitHub Actions.
EOF
)"

create_issue \
  "chore(ci): protect main with required app and contract checks" \
  "app,contract,docs" \
  "$BODY_CI"

echo
echo "Done. Review the created issues, then add them to the next Wave cycle."
echo "Dry run: DRY_RUN=1 $0"
