# Manual Curation Log — BCH Atlas Project Registry

This doc tracks user-led manual curation of `data/projects.json` and `data/campaign-overrides.json`. Context survives across sessions even if conversation memory is lost.

---

## Color Scheme (Source of Truth)

| Visual | Meaning | Driven By |
|---|---|---|
| 🟢 Green planet | Funded · project alive | `projectStatus === 'active'` |
| 🟠 Orange planet | Funded · unlinked (default) | No project match — investigate |
| 🟡 Amber planet | Funded · project dormant | `projectStatus === 'dormant'` |
| 🔴 Red planet | Funded · project died over time | `projectStatus === 'dead'` |
| 💥 Exploding red | Funded · never delivered | `delivered: 'no'` override |
| 🌑 Cracked moon | Campaign expired / didn't reach goal | Campaign `status === 'expired'` |
| 🔵 Cyan rectangle | Active fundraise | Campaign `status === 'running'` |

**Project station icons:** ISS-style (small, 1-2 campaigns) and Gundam side colony (large, 3+). Variants: green=active, amber=dormant/unknown, red+debris=dead.

---

## Current Counts (as of 2026-04-28)

- **Total projects:** 159
- **Status:** 84 active / 38 dead / 7 dormant / 30 unknown
- **Campaign overrides:** 7
- **Orphan funded campaigns:** ~157 (still need linking or `delivered:'no'` flagging)

### Per-continent breakdown

| Continent | Active | Dormant | Dead | Unknown |
|---|---|---|---|---|
| Core Infrastructure | 9 | 1 | 4 | 0 |
| Middleware & Libraries | 31 | 3 | 9 | 3 |
| Apps & Wallets | 17 | 0 | 4 | 5 |
| DeFi & Contracts | 14 | 2 | 9 | 13 |
| Ecosystem Initiatives | 9 | 1 | 0 | 4 |
| Media & Education | 6 | 0 | 9 | 1 |
| Charity & Adoption | 0 | 0 | 5 | 0 |

---

## Triage Status By Section

| Section | Reviewed? | Notes |
|---|---|---|
| Core Infrastructure | ✅ scanned, looks good | No flags |
| Middleware & Libraries | ✅ scanned, looks good | No flags |
| DeFi & Contracts | ✅ batch dead-flagged | MuesliSwap, BenSwap, MarbleVerse, prompt.cash bridge, CoinFLEX Bridge |
| Apps & Wallets | 🟡 partial | read.cash → active. Rest pending. |
| Media & Education | ✅ batch dead-flagged | Bitcoin Out Loud, Bitcoin Cash TV, Bitcoin.com Podcast, Keep Bitcoin Free, Bitcoin.com News, Satoshi's Angels (also flagged from charity convo) |
| Charity & Adoption | ✅ batch dead-flagged | BCH Please, BCH Latam, Bitcoin Cash House |
| Ecosystem Initiatives | ✅ done | r/btc & r/Bitcoincash removed (forums); PSF active; BCH Blaze active; BCH Foundation dormant; Riften Labs → defi |
| Other | ⏳ not started | |

---

## Manual Project Status Changes Applied

### Marked DEAD (manual)

- **DeFi:** muesliswap-bch, benswap, marbleverse, coinflex-bridge, prompt-cash-bridge
- **Media:** bitcoin-out-loud, bitcoin-cash-tv, bch-podcast-bitcoin-com, keep-bitcoin-free, news-bitcoin-com
- **Charity:** bch-please, bch-latam, bitcoin-cash-house
- **Apps:** paybutton (newly added)
- **Charity (cross-flagged from media):** satoshis-angels

### Marked ACTIVE (manual override of automated dead/unknown)

- read-cash (was unknown, site reachable per user)
- permissionless-software-foundation (was dead — incorrect)
- bch-blaze (was unknown)

### Marked DORMANT (manual)

- bitcoin-cash-foundation

### Removed from registry

- bch-subreddit (r/btc — forum, not a project)
- bitcoincash-subreddit (r/Bitcoincash — forum, not a project)

### Continent moves

- riften-labs: ecosystem → defi
- (Riften Labs Indexer kept under middleware — indexer infrastructure, not DeFi)

### Newly added projects

- **1kbch** (ecosystem) — 1KBCH multi-product platform by Gordon Lin
- **blockexplorer-cash** (middleware) — BCH explorer by Flowee
- **wizardconnect** (middleware) — Riften Labs wallet-connect protocol
- **paybutton** (apps, dead) — defunct payment widget

---

## Campaign Overrides Applied

In `data/campaign-overrides.json`:

| Campaign ID | Title | Type | Reason |
|---|---|---|---|
| `ac566c75e59abc74` | mainnet.cash | link → mainnet-js | matcher missed |
| `52fb481bc473d44d` | Satoshi's Angels Year 2022 | link → satoshis-angels | matcher missed |
| `84eed4e438825033` | Satoshi's Angels Flipstarter | link → satoshis-angels | matcher missed |
| `fc353ccb0c26a44f` | Smart Bitcoin Cash | delivered: 'no' | 1000 BCH funded, didn't deliver |
| `8fa3a68c041d0cbb` | 2022 BCH Marketing & Content | delivered: 'no' | 823 BCH funded, didn't deliver |
| `7ae8d215a9c0857b` | 500k YouTube Channel BCH Series | delivered: 'no' | 300 BCH funded, didn't deliver |
| `50263de63f29d465` | Breaking Bitcoin | delivered: 'no' | 299.5 BCH funded, didn't deliver |

---

## Known Outstanding Issues

### 1. FundMe campaign dating (CRITICAL — currently being fixed)

**Symptom:** Bitcoin Cash Podcast project page shows all 6 FundMe rounds with date `2024-05-14`. Same problem affects 23 recipient addresses (50+ campaigns) including:

- BCH Podcast (6 rounds, all stamped 2024-05-14)
- BitcoinCash Nigeria (6 rounds, all 2024-12-01)
- Vox.cash (4 rounds, all 2025-02-23)
- Bitcoin Out Loud, La Economía P2P, etc.

**Root cause:** FundMe API has no campaign creation date. Original fetcher stamps every campaign with the fetch date. Existing backfill queries chain for "earliest tx to recipient address" — works for unique addresses, but for reused addresses every campaign claims the same first tx.

**Fix in progress:** walk on-chain pledges chronologically per address, match clusters to campaigns by FundMe numeric ID order. Each campaign gets its first-pledge timestamp.

### 2. Orphan funded campaigns (157)

**Where to triage:** http://localhost:3000/projects/orphans — sorted by BCH amount, copy-paste IDs into `data/campaign-overrides.json`.

**Pattern to look for:**
- Title or description matches an existing project? → add `projectSlug` override
- Project doesn't exist in registry yet? → add to `data/projects.json` first
- Funded but never delivered? → `delivered: 'no'` override
- Otherwise leaves as orange (default — fine)

### 3. Wayback false negatives

Some highly-dynamic dead pages (e.g. Satoshi's Angels with live donation counter) can't be detected by Wayback's content-hash check. These need manual flagging — that's why all the section-by-section triage above exists.

### 4. Reddit/X/Telegram/news.bitcoin.com

These hosts block deep Wayback archiving. The liveness checker now skips them by default (otherwise their truncated histories trigger false-positive "stale" detection). r/btc and r/Bitcoincash were already removed (forums, not projects).

---

## How to Add Manual Curation

### To mark a project dead/dormant/active

```bash
node -e "
const fs = require('fs');
const projects = JSON.parse(fs.readFileSync('data/projects.json', 'utf-8'));
const p = projects.find(x => x.slug === 'YOUR-SLUG');
p.status = 'dead'; // or 'dormant', 'active'
p.statusCheckedAt = null; // null preserves manual flag from automated runs
p.statusDetail = 'manually marked X — REASON';
fs.writeFileSync('data/projects.json', JSON.stringify(projects, null, 2) + '\n');
"
```

### To link a campaign to a project

Edit `data/campaign-overrides.json`:

```json
{
  "overrides": {
    "<campaign-id>": { "projectSlug": "<project-slug>", "note": "why" }
  }
}
```

### To mark a campaign as not-delivered

```json
{
  "overrides": {
    "<campaign-id>": { "delivered": "no", "note": "took the BCH, never shipped" }
  }
}
```

### To run the automated liveness checker

```bash
GITHUB_TOKEN="$(gh auth token)" npx tsx scripts/check-project-liveness.ts
```

(Takes ~15-20 minutes for 159 projects with Wayback checks. Token brings GitHub from 60/hr → 5000/hr.)

### To find orphan campaigns to curate

```bash
npm run dev
# then visit http://localhost:3000/projects/orphans
```

---

## Workflow Diagram

```
Automated Liveness Checker (scripts/check-project-liveness.ts)
  ↓
data/projects.json (159 entries with status, github, wayback fields)
  ↓
Project Resolver (matches campaigns by ID + matchers + override slugs)
  ↓
data/campaign-overrides.json (7 manual flags)
  ↓
Graph Builder (assigns campaign nodes effective project status)
  ↓
GraphVisualization.tsx (renders 7-color planet scheme)
```
