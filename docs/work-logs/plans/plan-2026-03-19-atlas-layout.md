# Plan: Atlas Layout — Category Continents, Live Panel, Auto-Refresh

## Date: 2026-03-19

## Overview

Transform the atlas from a generic force-directed graph into a true "world map" of the BCH crowdfunding ecosystem with three major features:

1. **Category-based continental layout** — campaigns grouped by type
2. **Live missions panel** — top-right HUD for active campaigns
3. **Automated FundMe refresh** — API route for periodic data updates

---

## Task 1: Categorize All Campaigns

### Flipstarter campaigns
Already have `category` field with tags like: Infrastructure, Software, Charity, Education, Adoption, License-MIT, etc.

Map these to continent groups:
- **Infrastructure** — category contains "Infrastructure" or "Software" (BCHN, BCHD, Verde, Knuth, etc.)
- **Wallets & Tools** — category contains "Software" AND title/description matches wallet/tool keywords
- **Media & Education** — category contains "Education" or title matches podcast/media/content keywords
- **Charity & Adoption** — category contains "Charity" or "Adoption"
- **Commerce & Business** — category contains "Business" or "Commerce" or merchant keywords
- **Other** — everything else

### FundMe campaigns
No categories. Need to infer from title + description.

**Approach:** Write a simple categorizer script at `scripts/categorize-fundme.ts` that:
1. Reads `data/fundme.json`
2. For each campaign, uses keyword matching on title + description to assign a category
3. Keywords per category:
   - Infrastructure: node, protocol, network, upgrade, consensus, fork, specification, chip
   - Wallets & Tools: wallet, tool, library, sdk, api, extension, app
   - Media & Education: podcast, video, tutorial, education, content, media, documentary, show, stream
   - Charity & Adoption: charity, donation, food, humanitarian, adoption, community, education (when paired with region names)
   - DeFi & Contracts: defi, swap, dex, contract, cashscript, cashtokens, nft, token, fungible
   - Commerce: merchant, shop, store, payment, pos, commerce, business
   - Other: default
4. Saves updated `data/fundme.json` with `category` field added

**Note:** If keyword matching is too crude, we can use an LLM call as a one-time batch to classify the ~100 FundMe campaigns. But try keywords first — it's faster and deterministic.

Actually — Joey said "use LLM to infer". So:

**LLM approach for FundMe categorization:**
1. Script reads each FundMe campaign's title + first 200 chars of description
2. Calls the local Claude/OpenAI API (or uses a simple prompt) to classify into one of the categories
3. Saves the category back to fundme.json
4. This is a one-time batch operation, not runtime

For now, implement with keyword matching as a fast fallback. We can add LLM classification later if needed.

## Task 2: Category-Based Continental Layout

### Layout strategy
Use Cytoscape's `preset` layout with computed positions, not force-directed.

**Map regions** (positioned as fixed "continents"):
```
+------------------------------------------+
|                                           |
|  INFRASTRUCTURE     WALLETS/TOOLS         |
|  (center-left)      (center-right)        |
|                                           |
|       DEFI/CONTRACTS                      |
|       (center)                            |
|                                           |
|  MEDIA/EDUCATION    COMMERCE              |
|  (bottom-left)      (bottom-right)        |
|                                           |
|       CHARITY/ADOPTION                    |
|       (bottom-center)                     |
|                                           |
|                OTHER (scattered edges)    |
+------------------------------------------+
```

### Within each continent:
- Campaigns positioned in a cluster around the continent center
- Larger campaigns (more BCH) closer to the continent center
- Smaller campaigns further out
- Use a spiral or circular sub-layout within each continent
- Add small random jitter to prevent exact overlaps

### Node shapes by status:
- `running` (active/live) → **rectangle/square** (per Joey's request)
- `success` (funded) → circle
- `expired` (failed) → circle (smaller, dimmer)

### Node sizing:
- Based on BCH amount, log scale
- Minimum size 6px, maximum 60px
- Active campaigns get a pulsing animation

### Edges (strands):
- Still connect campaigns through shared recipient addresses
- Cross-continent edges are the most interesting — they show ecosystem connections
- Within-continent edges less important but still shown

### Implementation in GraphVisualization.tsx:
1. Add a `computePositions(nodes, edges)` function that:
   - Groups nodes by category
   - Assigns continent center coordinates
   - Positions each node relative to its continent center
   - Uses campaign amount to determine distance from center (bigger = closer)
2. Use `layout: { name: 'preset' }` with the computed positions
3. Keep existing interaction (click, hover, zoom, pan)

### HUD sidebar updates:
- Add category labels to the filter section
- Allow toggling entire continents on/off
- Show continent names as labels on the graph itself (subtle, like map labels)

## Task 3: Live Missions Panel

### Top-right HUD panel
A small panel showing active/running campaigns:
- Positioned absolute top-right of the graph area
- DS holographic styling (teal-tinted, translucent)
- Shows each active campaign as:
  - Square icon (matching the square node shape)
  - Campaign title (truncated)
  - Progress bar (raised / goal)
  - Platform badge (Flipstarter or FundMe)
- Clickable — clicking selects the node in the graph and opens the detail sidebar
- Auto-updates when FundMe data refreshes

### Data:
- Filter campaigns where `status === 'running'`
- Currently ~13 active campaigns (2 Flipstarter + 11 FundMe)

## Task 4: Automated FundMe Refresh

### API route: `src/app/api/refresh-fundme/route.ts`
1. On POST request (with a secret key for auth):
   - Fetch campaign list from FundMe.cash API
   - Fetch each campaign
   - Transform to our format
   - Compare against existing data
   - Update `data/fundme.json` with new/updated campaigns
   - Return count of new/updated campaigns

**Wait — this won't work with static JSON on Vercel.** The filesystem is read-only on Vercel.

### Alternative approach for Vercel:
Instead of writing to the filesystem, use ISR (Incremental Static Regeneration) or make the FundMe data fetched at build time AND at runtime via an API route that fetches live from FundMe.cash.

**Simplest approach:**
1. Keep `data/fundme.json` as the base dataset (committed to repo)
2. Create a GitHub Action that runs `scripts/fetch-fundme.ts` daily
3. If data changed, auto-commits and pushes → triggers Vercel rebuild
4. This way the site always has fresh data without runtime API calls

### GitHub Action: `.github/workflows/refresh-fundme.yml`
```yaml
name: Refresh FundMe Data
on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight UTC
  workflow_dispatch:  # Manual trigger

jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
      - run: npx tsx scripts/fetch-fundme.ts
      - name: Check for changes
        id: changes
        run: |
          git diff --quiet data/fundme.json || echo "changed=true" >> $GITHUB_OUTPUT
      - name: Commit and push
        if: steps.changes.outputs.changed == 'true'
        run: |
          git config user.name "BCH Atlas Bot"
          git config user.email "bot@bch-atlas.org"
          git add data/fundme.json
          git commit -m "chore: refresh FundMe campaign data"
          git push
```

## Execution Order

1. **Categorize campaigns** (scripts/categorize-fundme.ts + update Flipstarter categories)
2. **Continental layout** (GraphVisualization.tsx rewrite)
3. **Live missions panel** (new component + page.tsx update)
4. **GitHub Action** (.github/workflows/refresh-fundme.yml)

## Verification
- [ ] All campaigns have a category assigned
- [ ] Graph shows distinct continental clusters
- [ ] Cross-continent strands visible
- [ ] Active campaigns shown as squares
- [ ] Live missions panel shows active campaigns
- [ ] GitHub Action workflow file exists
- [ ] `npm run build` passes
