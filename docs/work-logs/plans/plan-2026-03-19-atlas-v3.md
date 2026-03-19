# Plan: Atlas V3 — Planetary Systems, Visual Polish

## Date: 2026-03-19

## Joey's Feedback (4 points)

1. Each continent should be a PLANETARY SYSTEM — biggest funded project is the "sun" at center, others orbit around it by size
2. More color differentiation — entities/diamonds should be YELLOW and clearly visible
3. Strands need to be MUCH clearer — currently invisible. Make them brighter, thicker
4. Failed campaigns should NOT be faded — use a distinct "exploded" visual in RED, still sized by their ask amount

## Task 1: Planetary System Layout Per Continent

Each continent becomes a mini solar system:

### Layout algorithm for each continent:
1. Sort campaigns within continent by BCH amount (descending)
2. The #1 biggest funded campaign = "sun" — placed at continent center, largest node
3. Next campaigns orbit around it in concentric rings:
   - Ring 1 (closest): next 3-5 biggest campaigns
   - Ring 2: next 5-8 campaigns
   - Ring 3: next batch
   - And so on...
4. Within each ring, space campaigns evenly around the circle
5. Ring radius increases with each level
6. Failed campaigns orbit at the OUTER edges (they burned out and drifted away)
7. Active/running campaigns get a special position — maybe ring 1 regardless of size (they're active NOW)

### Spacing:
- Ring radius: start at 80px for ring 1, increase by 60px per ring
- Continent centers should be spread far apart (keep ±1100 range or more)
- Each continent's planetary system should have enough internal space so nodes don't overlap

### Sun nodes:
- The central "sun" of each continent should be noticeably larger than others
- Stronger glow effect
- Maybe a special border/ring effect to mark it as the system's center

## Task 2: Color Differentiation

### Current problem: everything looks too similar in green/teal

### New color scheme:
- **Funded campaigns (success):** Solid GREEN circles (#00FF88) with green glow — KEEP
- **Active campaigns (running):** Solid CYAN squares (#00E0A0) with pulse — KEEP
- **Failed campaigns (expired):** Solid RED (#FF4455) — NOT faded, NOT transparent. Full opacity. Sized by what they asked for. Use a starburst/explosion shape if possible, otherwise a circle with a distinctive red ring/cross pattern
- **Entity nodes (hexagons):** Bright YELLOW (#FFD700) — clearly visible, distinct from everything else
- **Recipient address diamonds:** ORANGE (#FF8C00) — keep diamonds but make them more visible (bigger than 3px, try 8-12px)
- **Continent label text:** Keep dim but slightly brighter than current

### Visual distinctness hierarchy:
1. Suns (biggest funded) — largest, brightest green glow
2. Active campaigns — cyan squares, pulsing
3. Other funded — green circles
4. Failed — red, distinctly different shape/treatment
5. Entities — yellow hexagons
6. Recipients — orange diamonds

## Task 3: Make Strands Visible

### Current problem: edges are invisible (too thin, too transparent)

### Fix:
- **Same-entity edges:** Width 3px, color #00FF88 (green), opacity 0.6 — these are the most important connections
- **Shared-address edges:** Width 2px, color #FF8C00 (orange), opacity 0.4
- **On hover/select:** Connected edges brighten to opacity 1.0 and width increases by 1px
- **Cross-continent edges** (connecting different continents): Make these even MORE visible — they show the ecosystem's interconnections. Maybe dashed or different color (#00E0A0 cyan)

### Edge animations:
- If possible, add a subtle gradient or "energy flow" effect on edges connecting active campaigns

## Task 4: Failed Campaign "Exploded" Visual

### Requirements:
- NOT faded/transparent — full opacity red
- Sized by their ask amount (same sizing formula as funded campaigns)
- Should look "exploded" or "destroyed"

### Implementation options in Cytoscape.js:
- Option A: Use shape 'star' with many points and red color — looks like an explosion
- Option B: Use shape 'circle' with a thick red border and a dark interior, plus a red "X" overlay (via label)
- Option C: Use shape 'diamond' rotated, or 'polygon' with irregular points
- Option D: Circle with border-style 'dashed' or 'double' in red — broken/cracked look

**Recommendation:** Use `shape: 'star'` with `star-points: 8` for failed campaigns. Red color (#FF4455). This creates an 8-pointed star that looks like an explosion/starburst. Full opacity. Sized by amount.

If Cytoscape doesn't support star shape well, use `shape: 'polygon'` with custom points to create a starburst pattern, or use a circle with a thick dashed red border.

## Verification
- [ ] Each continent has a planetary system layout (sun + orbiting rings)
- [ ] Color differentiation: green funded, cyan active, red failed, yellow entities, orange recipients
- [ ] Strands are clearly visible (green for entity links, orange for address links)
- [ ] Failed campaigns are red stars/starbursts at full opacity, sized by amount
- [ ] Continent spacing is adequate — no overlapping systems
- [ ] `npm run build` passes
