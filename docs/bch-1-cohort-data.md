# BCH-1 Hackcelerator Cohort — Data Spec

**Date:** 2026-04-29
**Source:** J Master Hamster (sister agent maintaining `~/.openclaw/workspace/projects/bch1-tracked/`), relayed by Joey
**Purpose:** Add the 15 BCH-1 hackcelerator cohort projects to `data/projects.json`. Data-only ingest. Architecture decisions (continent, membership model, graph render) are being handled in the live coding session — this doc only specifies the data.

---

## Context

The 15 projects are the BCH-1 hackcelerator cohort. They are **grant-funded** — none ran Flipstarter or FundMe campaigns. The existing `bch-1-hackcelerator` project entry (already in `projects.json`, currently `continent: "ecosystem"`, has 2 funded "BCH‑1: Phase 2 Booster Plan" campaigns linked via `data/campaign-overrides.json`) is the program-level anchor. The 15 are its children.

Hamster's tracker is a **deeper profile** layer (verified links, social templates, code analysis, update logs). Atlas holds the **roster** — single source of truth for which projects are in the cohort.

## Naming notes

- **Cash Markets** was previously called **Water DAO** (and before that, **Cashalyst**). The rename is final as of 2026-04-29. Aliases should preserve the old names for searchability since the GitHub repo is still `bitcoin-cashalyst`.
- All slugs use kebab-case to match existing convention.
- `x` field uses full URL form (`https://x.com/handle`) to match how recent entries (e.g. `konk`) store it.
- Five projects have no public GitHub (private or none): Fun(d) Tokens, Intents Swap, PaySats, CashToken Atelier, OpenW0rld.
- Two have no website: CashMint, TrustBCH.
- One has no socials at all: OpenW0rld.
- All `null` fields are schema-valid — existing entries already use them.

## Field rules across all 15

| Field | Value | Reason |
|---|---|---|
| `campaignIds` | `[]` | None ran flipstarters |
| `campaignMatchers` | `[]` | Empty matchers — these projects don't appear in campaign titles, so any matcher would only false-positive |
| `status` | `"unknown"` | Honest starting point; `scripts/check-project-liveness.ts` populates real values on next run |
| `statusCheckedAt` | `null` | Liveness checker will fill |
| `lastGithubCommit` | `null` | Liveness checker will fill |
| `websiteUp` | `null` | Liveness checker will fill |
| `lastContentChange` | `null` | Liveness checker will fill |
| `waybackCheckedAt` | `null` | Liveness checker will fill |
| `statusDetail` | BCH-1 track label string | Carries cohort track ("Overall Winner", "CashTokens Runner-Up", etc.) until liveness overwrites. Long-term this should move to a dedicated `cohortTrack` field — see open question below. |

## Continent assignment

The 15 are split across **functional continents** (`apps`, `defi`, `middleware`) per the existing taxonomy. They are not all clustered into `ecosystem` — that bucket is for programs/foundations, not products.

If a `bch-1` continent gets added to the `Continent` union (architectural decision being made elsewhere), all 15 entries plus the parent `bch-1-hackcelerator` should move to it. **Do not add it preemptively in this data ingest** — wait for the type to support it.

## Open question to resolve in the live coding session

`statusDetail` is being repurposed to carry the BCH-1 track label as an interim. Long-term, a dedicated `cohortTrack: string | null` field on `Project` would be cleaner. Migration path: when the field is added, sweep `statusDetail` strings starting with `"BCH-1 hackcelerator —"` into `cohortTrack` and let liveness re-write `statusDetail`. No data lost.

## The 15 entries

Append these to the end of `data/projects.json` (before the closing `]`). Each entry uses the same schema as existing entries — no schema changes required.

```json
[
  {
    "slug": "nexops",
    "name": "NexOps",
    "aliases": [
      "nexops",
      "nexops cash"
    ],
    "description": "BCH operations platform / infrastructure tools. BCH-1 hackcelerator Overall Winner.",
    "continent": "middleware",
    "github": "https://github.com/nexops-cash",
    "website": "https://nexops.cash",
    "x": "https://x.com/nexopsbch",
    "telegram": null,
    "reddit": null,
    "campaignIds": [],
    "campaignMatchers": [],
    "status": "unknown",
    "statusCheckedAt": null,
    "statusDetail": "BCH-1 hackcelerator — Overall Winner",
    "lastGithubCommit": null,
    "websiteUp": null,
    "lastContentChange": null,
    "waybackCheckedAt": null
  },
  {
    "slug": "payonce-cash",
    "name": "Payonce.Cash",
    "aliases": [
      "payonce",
      "payonce cash",
      "payonce.cash"
    ],
    "description": "One-time BCH payments. BCH-1 hackcelerator project.",
    "continent": "apps",
    "github": "https://github.com/saleemm1/payonce-cash",
    "website": "https://payonce.cash",
    "x": "https://x.com/PayOnceCash",
    "telegram": null,
    "reddit": null,
    "campaignIds": [],
    "campaignMatchers": [],
    "status": "unknown",
    "statusCheckedAt": null,
    "statusDetail": "BCH-1 hackcelerator — Active Development",
    "lastGithubCommit": null,
    "websiteUp": null,
    "lastContentChange": null,
    "waybackCheckedAt": null
  },
  {
    "slug": "cash-markets",
    "name": "Cash Markets",
    "aliases": [
      "cash markets",
      "cash-markets",
      "water dao",
      "cashalyst",
      "bcashalyst",
      "bitcoin cashalyst"
    ],
    "description": "Prediction markets / DAO treasury tooling on BCH (formerly Water DAO / Cashalyst). BCH-1 hackcelerator project.",
    "continent": "defi",
    "github": "https://github.com/bitcoincashalyst/bitcoin-cashalyst",
    "website": "https://bcashalyst.xyz",
    "x": "https://x.com/bch_cashalys",
    "telegram": null,
    "reddit": null,
    "campaignIds": [],
    "campaignMatchers": [],
    "status": "unknown",
    "statusCheckedAt": null,
    "statusDetail": "BCH-1 hackcelerator — Active Development",
    "lastGithubCommit": null,
    "websiteUp": null,
    "lastContentChange": null,
    "waybackCheckedAt": null
  },
  {
    "slug": "flowguard",
    "name": "FlowGuard",
    "aliases": [
      "flowguard",
      "flow-guard",
      "flow guard"
    ],
    "description": "Payment streaming / recurring BCH payments. BCH-1 hackcelerator CashTokens Runner-Up.",
    "continent": "apps",
    "github": "https://github.com/winsznx/flow-guard",
    "website": "https://flowguard.cash",
    "x": "https://x.com/flowguard_",
    "telegram": null,
    "reddit": null,
    "campaignIds": [],
    "campaignMatchers": [],
    "status": "unknown",
    "statusCheckedAt": null,
    "statusDetail": "BCH-1 hackcelerator — CashTokens Runner-Up",
    "lastGithubCommit": null,
    "websiteUp": null,
    "lastContentChange": null,
    "waybackCheckedAt": null
  },
  {
    "slug": "optn-labs",
    "name": "OPTN Labs",
    "aliases": [
      "optn labs",
      "optn-labs",
      "optnlabs",
      "optn wallet",
      "optnwallet"
    ],
    "description": "Smart contracts and financial use-cases on BCH. BCH-1 hackcelerator Tech Track Runner-Up.",
    "continent": "defi",
    "github": "https://github.com/OPTNLabs/OPTNWallet",
    "website": "https://optnlabs.com",
    "x": "https://x.com/OPTNLabs",
    "telegram": null,
    "reddit": null,
    "campaignIds": [],
    "campaignMatchers": [],
    "status": "unknown",
    "statusCheckedAt": null,
    "statusDetail": "BCH-1 hackcelerator — Tech Track Runner-Up",
    "lastGithubCommit": null,
    "websiteUp": null,
    "lastContentChange": null,
    "waybackCheckedAt": null
  },
  {
    "slug": "fund-tokens",
    "name": "Fun(d) Tokens",
    "aliases": [
      "fund tokens",
      "fund-tokens",
      "fundtokens",
      "fun(d) tokens"
    ],
    "description": "Token systems / fundraising on BCH. BCH-1 hackcelerator CashTokens Runner-Up.",
    "continent": "defi",
    "github": null,
    "website": "https://chipnet.fundtokens.cash",
    "x": "https://x.com/FundTokens_Cash",
    "telegram": null,
    "reddit": null,
    "campaignIds": [],
    "campaignMatchers": [],
    "status": "unknown",
    "statusCheckedAt": null,
    "statusDetail": "BCH-1 hackcelerator — CashTokens Runner-Up. GitHub private; chipnet-only website.",
    "lastGithubCommit": null,
    "websiteUp": null,
    "lastContentChange": null,
    "waybackCheckedAt": null
  },
  {
    "slug": "cashmint",
    "name": "CashMint",
    "aliases": [
      "cashmint",
      "cash mint"
    ],
    "description": "NFT marketplace on BCH. BCH-1 hackcelerator project.",
    "continent": "apps",
    "github": "https://github.com/Nilupul-byte/CashMint",
    "website": null,
    "x": "https://x.com/BCHcash_mint",
    "telegram": null,
    "reddit": null,
    "campaignIds": [],
    "campaignMatchers": [],
    "status": "unknown",
    "statusCheckedAt": null,
    "statusDetail": "BCH-1 hackcelerator — Active Development. No website yet.",
    "lastGithubCommit": null,
    "websiteUp": null,
    "lastContentChange": null,
    "waybackCheckedAt": null
  },
  {
    "slug": "tripfi",
    "name": "TripFi",
    "aliases": [
      "tripfi",
      "trip-fi"
    ],
    "description": "Travel booking with BCH. BCH-1 hackcelerator Application Runner-Up.",
    "continent": "apps",
    "github": "https://github.com/ashraf402/tripfi",
    "website": "https://tripfi.app",
    "x": "https://x.com/tripfiapp",
    "telegram": null,
    "reddit": null,
    "campaignIds": [],
    "campaignMatchers": [],
    "status": "unknown",
    "statusCheckedAt": null,
    "statusDetail": "BCH-1 hackcelerator — Application Track Runner-Up",
    "lastGithubCommit": null,
    "websiteUp": null,
    "lastContentChange": null,
    "waybackCheckedAt": null
  },
  {
    "slug": "rabbit-explorer",
    "name": "RabbitExplorer",
    "aliases": [
      "rabbitexplorer",
      "rabbit explorer",
      "rabbitexp",
      "ghost rabbit",
      "ghostrabbit"
    ],
    "description": "CashToken block explorer. BCH-1 hackcelerator Tech Track Winner.",
    "continent": "middleware",
    "github": "https://github.com/denkhultch/GhostRabbit",
    "website": "https://rabbitexp.xyz",
    "x": "https://x.com/rabbitexp_bch",
    "telegram": null,
    "reddit": null,
    "campaignIds": [],
    "campaignMatchers": [],
    "status": "unknown",
    "statusCheckedAt": null,
    "statusDetail": "BCH-1 hackcelerator — Tech Track Winner",
    "lastGithubCommit": null,
    "websiteUp": null,
    "lastContentChange": null,
    "waybackCheckedAt": null
  },
  {
    "slug": "intents-swap",
    "name": "Intents Swap",
    "aliases": [
      "intents swap",
      "intents-swap",
      "intents.exchange"
    ],
    "description": "CashToken cross-chain swap. BCH-1 hackcelerator CashTokens Track Winner.",
    "continent": "defi",
    "github": null,
    "website": "https://intents.exchange",
    "x": "https://x.com/intents_swap",
    "telegram": null,
    "reddit": null,
    "campaignIds": [],
    "campaignMatchers": [],
    "status": "unknown",
    "statusCheckedAt": null,
    "statusDetail": "BCH-1 hackcelerator — CashTokens Track Winner. GitHub private.",
    "lastGithubCommit": null,
    "websiteUp": null,
    "lastContentChange": null,
    "waybackCheckedAt": null
  },
  {
    "slug": "milestara",
    "name": "Milestara",
    "aliases": [
      "milestara"
    ],
    "description": "Milestone-based release / funding tooling on BCH. BCH-1 hackcelerator project.",
    "continent": "defi",
    "github": "https://github.com/jeevansridharan/bch1",
    "website": "https://milestara.com",
    "x": "https://x.com/jovan_0406",
    "telegram": null,
    "reddit": null,
    "campaignIds": [],
    "campaignMatchers": [],
    "status": "unknown",
    "statusCheckedAt": null,
    "statusDetail": "BCH-1 hackcelerator — Active Development. X handle is personal (@jovan_0406).",
    "lastGithubCommit": null,
    "websiteUp": null,
    "lastContentChange": null,
    "waybackCheckedAt": null
  },
  {
    "slug": "paysats",
    "name": "PaySats",
    "aliases": [
      "paysats",
      "pay sats",
      "trypaysats"
    ],
    "description": "Bill payments with BCH. BCH-1 hackcelerator project.",
    "continent": "apps",
    "github": null,
    "website": "https://paysats.io",
    "x": "https://x.com/trypaysats",
    "telegram": null,
    "reddit": null,
    "campaignIds": [],
    "campaignMatchers": [],
    "status": "unknown",
    "statusCheckedAt": null,
    "statusDetail": "BCH-1 hackcelerator — Active Development. GitHub private.",
    "lastGithubCommit": null,
    "websiteUp": null,
    "lastContentChange": null,
    "waybackCheckedAt": null
  },
  {
    "slug": "cashtoken-atelier",
    "name": "CashToken Atelier",
    "aliases": [
      "cashtoken atelier",
      "cashtoken-atelier",
      "cashtokenatelier"
    ],
    "description": "CashToken swaps / DEX. BCH-1 hackcelerator project.",
    "continent": "defi",
    "github": null,
    "website": "https://cashtokenatelier.vercel.app",
    "x": "https://x.com/CashTokenATL",
    "telegram": null,
    "reddit": null,
    "campaignIds": [],
    "campaignMatchers": [],
    "status": "unknown",
    "statusCheckedAt": null,
    "statusDetail": "BCH-1 hackcelerator — Active Development. No public repo; vercel-hosted.",
    "lastGithubCommit": null,
    "websiteUp": null,
    "lastContentChange": null,
    "waybackCheckedAt": null
  },
  {
    "slug": "trust-bch",
    "name": "TrustBCH",
    "aliases": [
      "trustbch",
      "trust-bch",
      "trust bch"
    ],
    "description": "Escrow / trust system for BCH. BCH-1 hackcelerator Application Track Runner-Up.",
    "continent": "apps",
    "github": "https://github.com/opa1/trust-bch",
    "website": null,
    "x": "https://x.com/trustbch1",
    "telegram": null,
    "reddit": null,
    "campaignIds": [],
    "campaignMatchers": [],
    "status": "unknown",
    "statusCheckedAt": null,
    "statusDetail": "BCH-1 hackcelerator — Application Track Runner-Up. No website yet.",
    "lastGithubCommit": null,
    "websiteUp": null,
    "lastContentChange": null,
    "waybackCheckedAt": null
  },
  {
    "slug": "openw0rld",
    "name": "OpenW0rld",
    "aliases": [
      "openw0rld",
      "open w0rld",
      "openworld",
      "0penw0rld"
    ],
    "description": "Open world / metaverse on BCH. BCH-1 hackcelerator project.",
    "continent": "apps",
    "github": null,
    "website": "https://0penw0rld.com",
    "x": null,
    "telegram": null,
    "reddit": null,
    "campaignIds": [],
    "campaignMatchers": [],
    "status": "unknown",
    "statusCheckedAt": null,
    "statusDetail": "BCH-1 hackcelerator — Active Development. No public repo, no socials.",
    "lastGithubCommit": null,
    "websiteUp": null,
    "lastContentChange": null,
    "waybackCheckedAt": null
  }
]
```

## Verification after ingest

1. `npx tsc --noEmit` — passes (no schema changes, all fields match `Project` interface).
2. `npm run lint` — no new warnings.
3. `npm run build` — passes.
4. `npm run dev`, visit `http://localhost:3000/projects` — confirm:
   - "tracked" stat tile increased by 15
   - All 15 appear in `Apps & Wallets` (7), `DeFi & Contracts` (6), `Middleware & Libraries` (2)
   - Each shows status badge (`unknown` / grey until liveness runs), description, link icons
   - "no campaigns linked" text shows in place of BCH stats (correct — they didn't run Flipstarters)
5. Spot-check a few `/projects/[slug]` pages: `nexops`, `cash-markets`, `flowguard`.
6. **Optional follow-up**: `npx tsx scripts/check-project-liveness.ts` to populate real status fields. Five entries with `null` GitHub will rely on website + Wayback signals only.

## What this ingest does NOT do

- Does **not** add a `members` field, `parentSlug`, or `bch-1` continent. Those are architectural decisions for the live coding session.
- Does **not** modify the existing `bch-1-hackcelerator` parent entry. Its 2 linked Booster campaigns and `ecosystem` continent stay as-is.
- Does **not** render the 15 on the main graph. The current builder filter at `src/lib/graph/builder.ts:14` (`p.campaigns.length > 0`) excludes them. They'll show up only on `/projects` until graph integration is decided separately.
- Does **not** create `project-member` edges between the parent and the 15. That's the membership-model question being handled elsewhere.
