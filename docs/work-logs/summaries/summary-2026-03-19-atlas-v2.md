# Summary: Atlas V2 — True Ecosystem Map

## Date: 2026-03-19

## Changes Made

### 1. Revised Continent System (`src/lib/data/continent-mapper.ts`)
- **8 continents** replacing the old 7: `core`, `middleware`, `apps`, `media`, `defi`, `charity`, `ecosystem`, `other`
- Core infrastructure (BCHN, BCHD, Verde, Knuth, ABC) is its own category, separate from middleware
- Middleware & Libraries (mainnet.js, libauth, CashScript, SDKs) split from old "infrastructure"
- Apps & Wallets absorbs old "commerce" + "wallets"
- New "ecosystem" continent for accelerators, governance, hackathons, meetups
- Title-level overrides for well-known projects that categories alone can't resolve
- Priority-ordered keyword matching: core > charity > ecosystem > defi > middleware > apps > media

### 2. Entity-Based Campaign Linking (`src/lib/graph/builder.ts`)
- **Same-entity edges**: Direct campaign-to-campaign edges when campaigns share an entity name (e.g., two BCHN campaigns). Styled as bright green strands.
- **Shared-address edges**: Direct campaign-to-campaign edges when campaigns share a recipient address. Styled as dim amber strands.
- Recipient → campaign edges kept but made very dim (visual weight reduced).
- Edge deduplication via Set to prevent duplicate links.

### 3. Visual Overhaul (`src/components/graph/GraphVisualization.tsx`)

**Continent Layout:**
- Core infrastructure at CENTER (0, 0) — the sun of the map
- Continents spread to ±1100 coordinate range (was ±400)
- "Other" pushed to y=1800, far from center
- Wider spiral spacing within continents (baseRadius 60→300, radiusGrowth 0.7)

**Campaign Node Styling:**
- **Failed/expired**: Supernova remnant effect — hollow ring (2px border, 0.4 opacity, very transparent fill at 0.15). Ghostly appearance.
- **Active/running**: Rectangle shape with cyan glow (#00D4FF), 1.5px glowing border
- **Funded/success**: Solid green circles (#00FF88) with green glow shadow
- **Labels OFF by default** — only appear on hover

**Recipient Nodes:**
- Tiny: 4px fixed size (was 12px+)
- Very transparent: opacity 0.3
- Brighten to 8px and full opacity on hover

**Continent Watermarks:**
- Large 48px bold text at each continent center
- Very dim (opacity 0.08) — watermark effect
- Non-interactive (`events: 'no'`)

**Interaction:**
- Hover shows label for any node type
- Recipients expand on hover (4px → 8px, opacity 0.3 → 1.0)
- Click highlights same-entity edges in green, shared-address in amber
- Continent labels preserved during focus mode

### 4. Type Updates (`src/types/campaign.ts`)
- GraphEdge type extended: `'same-entity' | 'shared-address'` added
- Continent comment updated to reflect new 8-continent system

### 5. Live Missions Panel
- No changes needed — continues to work. Filters active campaigns from the campaign list, renders in top-right overlay.

## Verification
- [x] `npm run build` passes (326 campaigns, 203 recipients)
- [x] No TypeScript errors
- [x] All campaigns assigned a continent via updated mapper
- [x] Core infrastructure at CENTER of map
- [x] Same-entity direct campaign links created
- [x] Shared-address direct campaign links created
- [x] Failed campaigns styled as hollow rings
- [x] Active campaigns are rectangles with cyan glow
- [x] Recipient nodes are 4px, opacity 0.3
- [x] Continent watermark labels at 48px, opacity 0.08
- [x] Labels off by default, shown on hover
- [x] Live missions panel unchanged and functional

## Files Changed
- `src/lib/data/continent-mapper.ts` — Complete rewrite with 8 continents
- `src/lib/graph/builder.ts` — Added same-entity and shared-address edges
- `src/components/graph/GraphVisualization.tsx` — Major visual overhaul
- `src/types/campaign.ts` — Extended edge types, updated comments
- `docs/work-logs/summaries/summary-2026-03-19-atlas-v2.md` — This file
