# CLAUDE.md — BCH ATLAS

## Project Overview

**BCH ATLAS** (Archive & Tracking Ledger for Assurance Schemes) preserves Bitcoin Cash crowdfunding campaign history from Flipstarter and FundMe.cash platforms. It provides an interactive graph visualization revealing ecosystem relationships between campaigns, creators, and recipients.

**Stage:** 1 (MVP Build)
**Repo:** `github.com/slowsynapse/bch-atlas`
**Deploy Target:** Vercel

## Tech Stack

- **Framework:** Next.js 16 (App Router, TypeScript)
- **Styling:** Tailwind CSS v4
- **Graph:** Cytoscape.js + cytoscape-fcose layout
- **Database:** PostgreSQL via Prisma (Vercel Postgres / Neon)
- **State:** Zustand, TanStack React Query
- **Search:** Fuse.js (client-side fuzzy)
- **Blockchain:** Chaingraph GraphQL API (`gql.chaingraph.pat.mn`)
- **Scraping:** Cheerio, Puppeteer

## Architecture

### Data Flow (Current)

```
Static JSON (data/flipstarters-with-addresses.json, 225 campaigns)
  → lib/data/campaigns.ts (transform + entity extraction)
  → Prisma PostgreSQL (via seed script)
  → API routes (/api/campaigns) with Prisma queries
  → React Query on frontend
```

### Key Directories

```
src/
├── app/
│   ├── page.tsx                    # Homepage with stats
│   ├── graph/page.tsx              # Interactive graph explorer
│   ├── campaigns/page.tsx          # Campaign list with filters
│   ├── campaigns/[id]/page.tsx     # Campaign detail
│   ├── api/campaigns/route.ts      # Campaign API (Prisma)
│   └── providers.tsx               # React Query provider
├── components/
│   ├── graph/GraphVisualization.tsx # Cytoscape.js graph
│   └── campaigns/                  # Card, Filters, ContributorsList
├── lib/
│   ├── data/campaigns.ts           # Data access layer + stats
│   ├── data/entity-resolver.ts     # Entity deduplication
│   ├── parsers/entity-extractor.ts # Named entity extraction
│   ├── graph/builder.ts            # Graph node/edge construction
│   ├── graph/address-analyzer.ts   # Recipient address analysis
│   ├── chaingraph/                 # Chaingraph GraphQL client
│   └── prisma.ts                   # Prisma client singleton
├── types/campaign.ts               # Core type definitions
data/
├── flipstarters-with-addresses.json  # Primary dataset (225 campaigns)
├── flipstarters-new.json             # New campaigns from API
├── flipstarters-old-85.json          # Legacy data
├── failed-campaigns-recipients.json  # Failed campaign addresses
scripts/                              # Data extraction scripts
prisma/
├── schema.prisma                     # DB schema
└── seed.ts                           # JSON → Postgres seeder
```

### Dual Data Path (Important!)

The app currently has TWO data paths — this is a known architectural issue:

1. **Homepage + Graph:** Import JSON directly via `lib/data/campaigns.ts` (server components)
2. **Campaign List:** Fetch from `/api/campaigns` which queries Prisma/Postgres

Both need to work. The homepage/graph use static imports for SSG performance. The campaign list uses the API for dynamic filtering. Future work should unify these.

## Data Shape

```typescript
interface Campaign {
  id: string              // SHA256 hash (16 chars)
  platform: 'flipstarter' | 'fundme'
  title: string
  description?: string
  category?: string[]
  amount: number          // Goal BCH
  raised?: number
  status: 'success' | 'expired' | 'running' | 'unknown'
  time: string            // ISO date
  url: string
  archive?: string[]      // Archive.is / Wayback links
  announcement?: string[]
  tx?: string             // Funding transaction hash
  entities: string[]      // Extracted entity names
  recipientAddresses?: string[]
  blockHeight?: number | string
  transactionTimestamp?: string
}
```

## Database

PostgreSQL via Prisma. Schema in `prisma/schema.prisma`.

**Tables:** Campaign, Recipient, Entity

**Setup:**
```bash
vercel env pull .env.local   # Get connection strings
npx prisma generate
npm run db:push              # Push schema
npm run db:seed              # Seed from JSON
npm run db:studio            # Browse data at localhost:5555
```

## Graph Visualization

Cytoscape.js with fcose (force-directed) layout. Three node types:

- **Campaign nodes** (circles): Sized by BCH amount, colored by status (green=success, red=failed, blue=running)
- **Entity nodes** (hexagons): Known teams/projects, colored by success rate
- **Recipient nodes** (diamonds): BCH addresses that received funds from 2+ campaigns, purple

Dynamic import to avoid SSR issues. WebGL rendering needed for 500+ nodes.

## Entity Extraction

`lib/parsers/entity-extractor.ts` uses a known-entities dictionary (BCHN, Electron Cash, General Protocols, etc.) to tag campaigns. Only matches known entities — does NOT auto-create from unknown URL subdomains. Entity resolution via `lib/data/entity-resolver.ts` handles aliases and deduplication.

## Known Issues

1. **Dual data path** — Homepage/graph read JSON directly; campaign list uses Prisma API. Need unification.
2. **Running filter ghost** — Running filter shows a campaign with FAILED badge (data quality issue in source JSON).
3. **No FundMe.cash data yet** — Only Flipstarter campaigns. FundMe scraper exists but hasn't been run.
4. **Entity extraction limited** — Only ~12 known entities. Many campaigns untagged.

## Commands

```bash
npm run dev          # Dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npm run db:push      # Push Prisma schema
npm run db:seed      # Seed database from JSON
npm run db:studio    # Prisma Studio UI
```

## Commit Conventions

Verb-first, scoped messages:
```
Add graph filtering by campaign status
Fix duplicate campaign IDs in entity resolver
Extract recipient addresses from archive URLs
```

## External Services

- **Chaingraph:** `https://gql.chaingraph.pat.mn/v1/graphql` — BCH blockchain GraphQL
- **Archive.org:** Wayback Machine API (rate limit: 15 req/min)
- **Vercel:** Hosting + Postgres + Cron
- **IPFS/Pinata:** Future archival (not yet implemented)

## Testing

No test framework set up yet. Manual testing documented in `test-results.md`.

Pre-commit verification:
```bash
npm run build        # Must pass
npm run lint         # Must pass
```

## Environment Variables

```
DATABASE_URL=postgres://...          # Vercel Postgres (pooled)
POSTGRES_PRISMA_URL=postgres://...   # Prisma connection
POSTGRES_URL_NON_POOLING=postgres:// # Direct connection
CHAINGRAPH_URL=https://gql.chaingraph.pat.mn/v1/graphql
```
