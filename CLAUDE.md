# CLAUDE.md — BCH Atlas

## Repository Purpose

BCH Atlas (Archive & Tracking Ledger for Assurance Schemes) preserves Bitcoin Cash crowdfunding campaign history from Flipstarter and FundMe.cash platforms. It provides an interactive graph visualization revealing ecosystem relationships between campaigns, creators, and recipient addresses. Data comes from static JSON files derived from the Flipstarter directory and Chaingraph blockchain queries.

---

## Current Topology

**Stack:** Next.js 16 (App Router, TypeScript), Tailwind CSS v4, Cytoscape.js

**Components:**
- **Homepage** (`app/page.tsx`): Stats dashboard with campaign metrics. Server component, reads JSON directly.
- **Graph Explorer** (`app/graph/page.tsx`): Interactive Cytoscape.js force-directed graph. Client component. The hero feature.
- **Campaign List** (`app/campaigns/page.tsx`): Filterable campaign browser. Client component, fetches from API route.
- **Campaign Detail** (`app/campaigns/[id]/page.tsx`): Individual campaign page. Server component, reads JSON directly.
- **API Route** (`app/api/campaigns/route.ts`): Campaign search/filter endpoint. Reads from static JSON, no database.
- **Data Layer** (`lib/data/`): Campaign loader, entity resolver. Imports `data/flipstarters-with-addresses.json`.
- **Graph Builder** (`lib/graph/`): Builds Cytoscape nodes/edges from campaigns + recipient addresses.
- **Entity Extractor** (`lib/parsers/`): Named entity recognition for BCH ecosystem teams.
- **Chaingraph Client** (`lib/chaingraph/`): GraphQL client for BCH blockchain queries (not yet used in UI).

**Planned direction:** Vercel deployment. FundMe.cash integration. Automated Wayback Machine discovery. Blockchain verification badges. Community submission form. Eventually a research API.

---

## Build & Test Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run linter
npm run lint

# Build for production
npm run build

# Type check (no emit)
npx tsc --noEmit
```

---

## Never Ship Without Verification

**Mandatory checks before any commit:**
- [ ] `npm run build` passes
- [ ] `npm run lint` passes (pre-existing warnings OK, no new errors)
- [ ] No new TypeScript errors (`npx tsc --noEmit`)
- [ ] Dev server starts and homepage loads (`npm run dev`)

**No test framework yet.** When adding tests, use Playwright for E2E and Vitest for unit tests.

---

## Expected Workflow Order

When you receive a task:

1. **Inspect** — Read relevant files, check git status, understand current state.
2. **Plan** — Write a brief plan in `docs/work-logs/plans/plan-YYYY-MM-DD-description.md`.
3. **Implement** — Make the changes.
4. **Verify** — Run build, lint, dev server. Check affected pages in browser if possible.
5. **Summarize** — Write a summary in `docs/work-logs/summaries/summary-YYYY-MM-DD-description.md`.

**Output all plans and summaries to:** `docs/work-logs/`

---

## How to Handle Ambiguous Tasks

If a task is unclear:
- **Do NOT guess and proceed.**
- Write a clarification request in `docs/work-logs/questions/questions-YYYY-MM-DD.md`
- List what you understand, what's ambiguous, and what options exist
- Wait for human input before implementing

---

## How to Log Progress

**Machine-readable format:** JSON in `docs/work-logs/progress/`

```json
{
  "task": "description",
  "started_at": "timestamp",
  "completed_at": "timestamp or null",
  "status": "in_progress | completed | blocked",
  "changes": ["file1", "file2"],
  "verification": "passed | failed | not_run",
  "blockers": ["reason1"],
  "next_step": "what should happen next"
}
```

---

## How to Resume Interrupted Work

1. Check `docs/work-logs/` for the most recent plan/summary
2. Check `git status` and `git log --oneline -5`
3. Read the "next_step" from the last progress log
4. If unclear, ask for confirmation before proceeding

**Always leave work in a resumable state:**
- Commit working changes
- Write a progress log before pausing

---

## Where Generated Plans/Reports Go

All work artifacts go in: `docs/work-logs/`

- Plans: `plans/plan-YYYY-MM-DD-brief-description.md`
- Summaries: `summaries/summary-YYYY-MM-DD-brief-description.md`
- Questions: `questions/questions-YYYY-MM-DD.md`
- Progress: `progress/progress-YYYY-MM-DD-task-name.json` (gitignored)

---

## What Counts as "Done"

- [ ] Code implements the requested feature/fix
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] A summary exists in `docs/work-logs/summaries/`
- [ ] Changes are committed with a clear verb-first message

---

## What Claude Should Never Modify Without Approval

**Danger zones:**
- [ ] `data/*.json` — Source datasets. Never modify campaign data files.
- [ ] `scripts/` — Data extraction scripts that produced the JSON. Don't change without understanding impact.
- [ ] Any deployment config (vercel.json, .env files) — when they exist
- [ ] ID generation logic in `lib/data/campaigns.ts` (`generateId()`) — changing this breaks all campaign URLs

---

## Project-Specific Notes

### Architecture

- **Static JSON, no database.** All campaign data lives in `data/flipstarters-with-addresses.json` (225 campaigns). No Prisma, no Postgres.
- **Dual data path:** Homepage/graph import JSON at build time (server components). Campaign list fetches from `/api/campaigns` (client component → API route → same JSON). Both paths use `lib/data/campaigns.ts`.
- **Components never import JSON directly** — always use the data access layer (`getCampaigns()`, `getEntities()`, etc.).

### Design System

- **Death Stranding aesthetic.** Dark backgrounds (#0A0A0C), cyan holographic accents (#00D4FF), amber warnings (#FF8C00), frosted glass panels, monospace data, scan-line overlay.
- Typography: Inter for UI, JetBrains Mono for data/addresses/numbers.
- Sharp corners (2px border-radius), thin borders, translucent panels with backdrop-blur.

### Graph Visualization

- Cytoscape.js with fcose layout. Dynamic import to avoid SSR issues.
- Three node types: campaigns (circles), entities (hexagons), recipients (diamonds).
- Recipients colored amber — these are the "strands" connecting campaigns.
- ~225 campaign nodes + ~138 recipient address nodes.

### Known Issues

- Campaign list page has contrast issues (cards too dark)
- Entity extraction only covers ~12 known entities; most campaigns untagged
- FundMe.cash data not yet integrated
- No test framework set up

### Commit Messages

Verb-first, scoped:
```
Add graph filtering by campaign status
Fix duplicate campaign IDs in entity resolver
Strip Prisma dependency, unify to static JSON
```

---

*Last updated: March 19, 2026*
