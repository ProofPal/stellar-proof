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

# NOTE (v0.2): these items were implemented before the next Wave cycle and are
# intentionally not re-filed: IPFS fail-closed, demo mode off by default, no
# local-only verified state, token address in receipts, permissionless TTL
# renewal, paged history, and contract auth/event/self-payment tests.

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
ensure_label "drips-wave" "6c4df6" "Tracked in a Drips Wave program"
ensure_label "complexity:trivial" "bfe9f0" "Drips Wave - small, well-bounded task"
ensure_label "complexity:medium" "d7f94b" "Drips Wave - moderate scope, some design"
ensure_label "complexity:high" "ff8a3c" "Drips Wave - large or cross-cutting task"
ensure_label "blocked" "fbca04" "Depends on a deployment or an external decision"
ensure_label "decision" "d4c5f9" "Needs a product or naming decision"

echo "Creating issues on $REPO"
echo

# ---------------------------------------------------------------------------
# P0: proof integrity
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# P1: product integrity
# ---------------------------------------------------------------------------

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
