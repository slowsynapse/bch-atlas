# BCH ATLAS

**Archive & Tracking Ledger for Assurance Schemes**

BCH ATLAS preserves Bitcoin Cash crowdfunding campaign history from Flipstarter and FundMe.cash platforms. It provides an interactive graph visualization revealing ecosystem relationships between campaigns, creators, and recipients.

## Features

- **Interactive Graph** — Cytoscape.js force-directed graph showing campaigns, shared recipients, and entity relationships
- **Campaign Archive** — 225 Flipstarter campaigns with filtering, search, and sorting
- **Blockchain Verification** — On-chain transaction data via Chaingraph GraphQL API
- **Entity Extraction** — Automatic identification of known BCH teams and projects

## Tech Stack

- Next.js 16 (App Router, TypeScript)
- Tailwind CSS v4
- Cytoscape.js + fcose layout
- TanStack React Query
- Fuse.js (client-side fuzzy search)
- Static JSON data (no database required)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Commands

```bash
npm run dev    # Dev server
npm run build  # Production build
npm run lint   # ESLint
```

## Data

Campaign data lives in `data/flipstarters-with-addresses.json` (225 campaigns). The app reads this JSON directly — no database needed.

## License

Open source.
