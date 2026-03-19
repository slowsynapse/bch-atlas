# Plan: Atlas V2 — True Ecosystem Map

## Date: 2026-03-19

## Joey's Direction (8 points)

1. Link projects together who have the same name (entity matching → direct campaign-to-campaign edges)
2. Recipient nodes are too large — make them much smaller or hide by default
3. Spread everything further apart — more space between continents
4. Failed campaigns should look like they went supernova — visual decay effect
5. Ecosystem initiatives (like BCH-1 accelerator) need their own place
6. Core infrastructure should be its own continent, right in the CENTER of the map
7. Middleware (like mainnet.js) is a different continent from core infra
8. Apps/wallets should be another continent separate from infrastructure

## Revised Continent Map

```
                    ECOSYSTEM INITIATIVES
                    (BCH-1, accelerators, governance)
                    [top center]


    MEDIA & EDUCATION                    APPS & WALLETS
    (podcasts, tutorials,                (Electron Cash, Cashual,
     content, read.cash)                  Badger, payment tools,
    [left]                                web apps)
                                         [right]


                    CORE INFRASTRUCTURE
                    (BCHN, BCHD, Verde, Knuth, ABC)
                    [CENTER — the sun of the map]


    MIDDLEWARE & LIBRARIES               DEFI & CONTRACTS
    (mainnet.js, bitcore,                (CashStarter/FundMe,
     cashscript, SDKs,                    DEX, tokens, NFTs)
     developer tools)                    [bottom-right]
    [bottom-left]


                    CHARITY & ADOPTION
                    (EatBCH, Venezuela,
                     community outreach)
                    [bottom center]


                    OTHER / UNCATEGORIZED
                    [scattered at edges]
```

## Task 1: Revised Category System

Update `src/lib/data/continent-mapper.ts` with new continent names:

- `core` — Core Infrastructure (node implementations, consensus, protocol)
- `middleware` — Middleware & Libraries (SDKs, developer tools, libraries, APIs)
- `apps` — Apps & Wallets (wallets, payment apps, web apps, user-facing tools)
- `media` — Media & Education (podcasts, tutorials, content creation)
- `defi` — DeFi & Contracts (smart contracts, tokens, NFTs, DEX)
- `charity` — Charity & Adoption (humanitarian, community, adoption initiatives)
- `ecosystem` — Ecosystem Initiatives (accelerators, governance, collective campaigns)
- `other` — Uncategorized

### Category mapping rules:

**Core Infrastructure** (center of map):
- Keywords: "node", "bitcoin cash node", "BCHN", "BCHD", "verde", "knuth", "ABC", "bitcoin unlimited", "full node", "consensus", "protocol upgrade"
- Flipstarter categories: ["Infrastructure", "Software"] when title matches node/protocol keywords

**Middleware & Libraries:**
- Keywords: "mainnet", "library", "SDK", "API", "cashscript", "bitcore", "bitauth", "developer tool", "libauth", "electrum protocol"
- Flipstarter categories: ["Software"] when NOT a node/wallet

**Apps & Wallets:**
- Keywords: "wallet", "electron cash", "cashual", "badger", "payment", "app", "mobile", "extension", "web app", "POS", "merchant tool"
- Flipstarter categories containing wallet-related terms

**Media & Education:**
- Keywords: "podcast", "video", "tutorial", "education", "content", "documentary", "media", "news", "blog", "read.cash", "noise.cash"

**DeFi & Contracts:**
- Keywords: "defi", "swap", "dex", "contract", "cashtokens", "NFT", "token", "fungible", "cashstarter", "fundme", "crowdfunding platform"

**Charity & Adoption:**
- Keywords: "charity", "eat", "food", "humanitarian", "adoption", "community", "outreach", "Venezuela", "South Sudan", "Ghana"
- Flipstarter categories: ["Charity", "Adoption"]

**Ecosystem Initiatives:**
- Keywords: "accelerator", "BCH-1", "governance", "DAO", "foundation", "collective", "ecosystem", "hackathon", "conference", "BLISS", "meetup"

## Task 2: Entity-Based Campaign Linking

Instead of routing connections through recipient diamond nodes:

1. In `src/lib/graph/builder.ts`, create direct campaign-to-campaign edges when:
   - Two campaigns share the same entity name (e.g., both are "BCHN" campaigns)
   - Two campaigns share a recipient address
2. Edge type for same-entity: `'same-entity'` — styled as a bright green strand
3. Edge type for shared-address: `'shared-address'` — styled as a dim amber strand
4. This means the entity extractor (`src/lib/parsers/entity-extractor.ts`) becomes critical — campaigns with the same entity name get directly linked

### Recipient nodes:
- Keep them but make them MUCH smaller (3-4px)
- Very low opacity (0.3)
- Only brighten on hover/select
- Or: toggle them off by default in filters (checkbox unchecked)

## Task 3: Visual Treatment for Failed Campaigns

Failed/expired campaigns should look like stellar remnants — supernova debris:

**Cytoscape styling for expired campaigns:**
- Shape: still circle but with a "ring" effect — use `border-width: 2, border-color: rgba(255, 68, 85, 0.4), background-color: rgba(255, 68, 85, 0.1)`
- This creates a hollow/ghostly appearance — the campaign "burned out" and left a shell
- Opacity: 0.4-0.5 (faded, not fully present)
- Size: slightly smaller than equivalent funded campaigns (deflated)
- On hover: briefly brighten to full opacity (you can "see" the remnant)

**Funded/success campaigns:**
- Solid filled circles with glow: `background-color: #00FF88, border-width: 0`
- Full opacity
- Size based on BCH amount

**Active/running campaigns:**
- Shape: rectangle (square)
- Color: bright cyan #00E0A0 with pulse animation
- Border: glowing edge

## Task 4: Spread Continents Further Apart

- Increase the canvas space between continent centers
- Use a larger coordinate range for continent positions (e.g., -800 to 800 instead of -400 to 400)
- Add more padding between clusters
- Make the spiral spread within each continent wider too

## Task 5: Continent Labels on the Map

- Render continent names as text overlays on the graph
- Position at each continent center
- Style: uppercase, wide tracking, very dim (opacity 0.15-0.2), large font
- Like watermarks on a physical atlas/map
- These should NOT be interactive nodes — use Cytoscape canvas layer or HTML overlay

## Implementation Notes

- All graph logic changes go in `src/lib/graph/builder.ts` and `src/components/graph/GraphVisualization.tsx`
- Category mapping goes in `src/lib/data/continent-mapper.ts`
- Update the Campaign interface in `src/types/campaign.ts` to include `continent` field
- Re-run `npx tsx scripts/fetch-fundme.ts` if the script needs updating for categories
- Verify with `npm run build`

## Verification
- [ ] All campaigns have a continent assigned
- [ ] Core infrastructure is at the CENTER of the map
- [ ] Continents are visually separated with space between them
- [ ] Same-name campaigns are linked with bright edges
- [ ] Failed campaigns look hollow/ghostly (supernova remnant)
- [ ] Active campaigns are squares with glow
- [ ] Recipient nodes are tiny (3-4px) or hidden by default
- [ ] Continent labels visible as watermarks
- [ ] Live missions panel still works
- [ ] `npm run build` passes
