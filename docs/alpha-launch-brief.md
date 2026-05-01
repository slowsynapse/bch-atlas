# BCH Atlas — Alpha Launch Brief

**Live:** https://atlas.bch-1.org
**Stage:** Alpha — recommended on desktop only
**Status as of:** 2026-05-01

---

## What it is

**BCH Atlas (Archive & Tracking Ledger for Assurance Schemes)** is an interactive map of every Bitcoin Cash crowdfunding campaign ever publicly recorded.

It preserves the history of how the BCH community has self-funded its development — pulling together six years of Flipstarter and FundMe.cash campaigns, the projects they funded, the recipient addresses on chain, and the editorial signals that show whether those projects are still alive today.

The hero feature is a **node-link graph** where every funded campaign becomes a "planet" orbiting one of eight functional continents (Core Infrastructure, Middleware, Apps, DeFi, Media, Charity, Ecosystem, Other). Projects that ran multiple campaigns appear as space stations linking their planets. Recipient addresses that funded multiple campaigns appear as diamond strands threading through the graph — revealing teams that crowdfunded under different brand names but the same BCH wallet.

It's a **research and history tool**, not a fundraising platform. Nothing is for sale, no campaigns are running through this site. It's a record.

---

## Numbers (live as of 2026-05-01)

### Campaign archive
- **333** total campaigns archived
- **225** Flipstarter campaigns
- **108** FundMe.cash campaigns
- **229** successfully funded
- **93** expired without funding
- **10** currently running
- **17,395 BCH** raised across all successful campaigns
- **~$6.35M USD** total at-the-time value (using historical BCH/USD prices for each campaign's date)
- **319 / 333** campaigns dated to a specific day (96% — the rest are pre-Wayback or unindexed)
- **3** campaigns flagged as funded-but-undelivered (curated)

### Time span
- Oldest campaign: **March 2020**
- Newest campaign: **April 29, 2026**
- Six years of continuous BCH crowdfunding history

### BCH raised by year (success only)
| Year | BCH | Notable era |
|---|---|---|
| 2020 | 5,964 | Flipstarter explosion |
| 2021 | 4,200 | Peak campaign activity |
| 2022 | 3,255 | Marketing & adoption push |
| 2023 | 708 | Slow year |
| 2024 | 2,618 | FundMe.cash era begins |
| 2025 | 481 | (in progress) |
| 2026 | 118 | (Q1) |

### Project registry
- **181** projects tracked
- **95** marked active (recent code commits + live website)
- **9** dormant (slow but not dead)
- **49** marked dead (abandoned)
- **28** unknown (data inconclusive)

### Project continents
| Continent | Count |
|---|---|
| Middleware & Libraries | 50 |
| DeFi & Contracts | 41 |
| Apps & Wallets | 31 |
| Media & Education | 18 |
| Core Infrastructure | 16 |
| Ecosystem Initiatives | 15 |
| Charity & Adoption | 8 |
| Other | 2 |

### Source code coverage
- **130 repos** tracked across multiple hosts:
  - GitHub: 111
  - GitLab: 13
  - Codeberg: 2
  - Self-hosted Forgejo (e.g. git.xulu.tech for Selene Wallet): 1
- Liveness checked weekly via API + Wayback Machine

### BCH-1 hackcelerator cohort
- **6 of 15** cohort projects added (more rolling in):
  NexOps · CashMint · FlowGuard · Cash Market · Rabbit Explorer · Fun(d) Tokens

---

## What you can do on it

| Page | What it does |
|---|---|
| `/` | Interactive atlas graph — click planets, projects, recipients to explore relationships |
| `/campaigns` | Filter all 333 campaigns by status, platform, continent, project liveness, date range, amount |
| `/campaigns/[id]` | Per-campaign detail: BCH + historical USD value, on-chain anchor, project linkage, shared recipients, archive snapshots |
| `/projects` | Browse all 181 projects |
| `/projects/[slug]` | Project detail — funding timeline, liveness state, external links |
| `/projects/github` | Source-code registry — filter 130 repos by activity / status / host |
| `/projects/orphans` | Curation tool — find funded campaigns not yet linked to a project |

---

## Technical notes

- Static JSON data, no database — the entire site is reproducible from `data/*.json`
- Daily cron refreshes FundMe campaign status (running → success/expired transitions)
- Weekly cron sweeps project liveness across all repo hosts
- Historical BCH/USD prices via Hyperliquid + a static fallback for pre-Oct 2020
- Hosted on Vercel; built with Next.js 16 + Cytoscape.js
- Mobile users see an atmospheric fallback page; full graph is desktop-only

---

## Alpha caveats — please be loud about these

- **Desktop-only experience.** The graph genuinely doesn't work on phones (606 nodes spread across a 6000×7000 virtual canvas). Mobile users see a screenshot + browse links until we figure out the right phone UX.
- **Some campaigns are missing dates.** 14 expired Flipstarters have no recorded date — their original URLs are too obscure for Wayback / archive recovery (IPFS gateways, raw IPs, ephemeral subdomains). They show in the archive but won't appear in the year heatmap.
- **Project liveness is heuristic.** "Active / dormant / dead" is derived from recent commits + website status + Wayback content drift. Some classifications are wrong; manual overrides exist for cases we've caught.
- **Project linkage is partial.** Only 39% of campaigns are linked to a curated project. The rest are "orphans" that need editorial attention to figure out which team they belong to.
- **The BCH-1 cohort is partial.** 6 of 15 hackcelerator projects added so far — more landing as they're triaged.
- **Some campaign URLs lead to dead pages.** That's expected — many Flipstarter sites went offline years ago. The atlas preserves the *record*; the live URL is informational.
- **Data accuracy depends on community feedback.** Spotted something wrong? Wrong project linkage, wrong status, missing campaign? File issues / email — that's how this gets better.
- **Undiscovered bugs likely.** This is alpha. UI edges, edge cases, rare data shapes — they'll surface. Reports welcome.

---

## What's next (post-alpha)

- Mobile graph experience (currently desktop-only)
- Community submission form for missing campaigns
- Blockchain verification badges (cross-check on-chain payment vs. claimed amount)
- Research API for academics studying funding patterns
- Continue closing the orphan gap (39% linked → ideally 80%+)
- Expand BCH-1 cohort coverage to all 15
- Liveness-checker improvements: better handling of self-hosted Forgejo/Gitea, GitLab subgroups, archived-but-genuine projects

---

## One-line pitch

*"Six years of Bitcoin Cash crowdfunding history, mapped — 333 campaigns, 17,395 BCH, 181 projects, all relationships visible at a glance. atlas.bch-1.org"*
