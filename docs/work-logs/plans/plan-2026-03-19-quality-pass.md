# Plan: Quality Pass — FundMe Data, Graph Tuning, Campaign Detail Page

## Date: 2026-03-19

## Task 1: Fix FundMe Data Quality

### Problem
The fetch script at `scripts/fetch-fundme.ts` maps `goalAmount` and `amountRaised` but the actual API response uses different field names. Result: all FundMe campaigns have `amount: 0` and 65/101 have status "unknown".

### How to Fix
1. First, inspect a raw API response to find the correct field names. Run:
   ```
   curl -s "https://fundme.cash/get-campaign/2" | npx tsx -e "process.stdin.resume(); let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{try{const j=JSON.parse(d);console.log(Object.keys(j))}catch(e){console.log(d.substring(0,500))}})"
   ```
   Or just fetch one campaign and log the raw keys to find the actual field names for goal amount, raised amount, and status.

2. Update `scripts/fetch-fundme.ts` with the correct field mappings.

3. Also: The FundMe API response appears to be a string that needs parsing — the raw response for campaign 2 starts with what looks like encoded/encrypted data. Need to check if the response is actually JSON or some other format. The `description` field came through (from a previous successful run), so the data IS parseable — just need to identify the exact field names.

4. Fix the status mapping: Look at the raw response for `status`, `isComplete`, and any percentage/funding fields. Map more aggressively:
   - If `isComplete === true` → 'success'
   - If status contains "stop" or "cancel" → 'expired'
   - If status contains "active" or "running" or "open" → 'running'
   - If percentage >= 100 → 'success'
   - Otherwise → check if there's a deadline that has passed → 'expired'

5. Re-run the script: `npx tsx scripts/fetch-fundme.ts`

6. Verify: Check that campaigns now have non-zero amounts and fewer "unknown" statuses.

## Task 2: Graph Tuning

### Problem
The fcose layout spreads nodes too far apart, making the atlas look sparse and lifeless. Should feel dense and interconnected like a DS chiral network.

### Changes to GraphVisualization.tsx
1. Tighten the fcose layout parameters:
   - Reduce `idealEdgeLength` (try 60-80 instead of 100)
   - Reduce `nodeRepulsion` (try 2000-3000 instead of 4500)
   - Increase `edgeElasticity` (try 0.6-0.8)
   - Set `padding` to a small value (10-20)

2. Node sizing:
   - Campaign nodes: Make the size range more dramatic. Small campaigns (< 1 BCH) should be tiny dots. Large campaigns (100+ BCH) should be much bigger.
   - Use a better scaling function: `Math.max(8, Math.log2(value + 1) * 8)` instead of `Math.sqrt(value) * 5`

3. Node labels:
   - Only show labels for nodes above a certain size threshold (e.g., > 10 BCH for campaigns)
   - Or show labels on hover only, not always
   - This reduces visual clutter

4. Edge styling:
   - Make edges thinner (1px instead of 2px)
   - Lower opacity for edges (0.15 instead of current values)
   - On node select/hover, brighten connected edges to full opacity

5. Background:
   - Ensure Cytoscape container background matches the page (#070A0D)

## Task 3: Campaign Detail Page DS Treatment

### Problem
The campaign detail page (`src/app/campaigns/[id]/page.tsx`) still uses the old dark theme, not the DS holographic treatment applied to other pages.

### Changes needed
1. Apply the DS color palette:
   - Background: inherit from body (already dark via globals.css)
   - Header bar: use ds-holographic class
   - All cards/panels: use ds-panel or ds-holographic class with teal tinting
   - Status colors: green (#00FF88) for funded, red (#FF4455) for expired, cyan (#00E0A0) for active

2. Typography:
   - Labels: use ds-label class (uppercase, wide tracking, small)
   - Data values: font-mono, use DS accent colors with textShadow glow
   - Addresses: font-mono, smaller size, teal text

3. Panel styling:
   - All section cards should use the teal-tinted translucent panel style
   - Top edge glow line on each panel
   - Remove any remaining hard-coded old colors (like bg-white, text-gray-*, border-gray-*)

4. Links:
   - Style links with DS cyan color (#00E0A0) instead of blue
   - Hover: brighten/glow effect

5. Progress bar (for funded campaigns):
   - Use green (#00FF88) fill with glow
   - Track: dark teal-tinted background

6. Navigation:
   - Header should match the HUD sidebar style
   - "Back to Atlas" link instead of separate Home/Graph/Campaigns links

## Verification
After all three tasks:
- [ ] `npm run build` passes
- [ ] FundMe campaigns have non-zero amounts (most of them)
- [ ] Fewer "unknown" status campaigns
- [ ] Graph looks denser and more alive
- [ ] Campaign detail page uses DS holographic theme
- [ ] All text is readable (contrast check)
