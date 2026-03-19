# Summary: Spacing, Orbit Rings & FundMe Re-fetch

**Date:** 2026-03-19

## Changes Made

### 1. FundMe Data Re-fetched
- Ran `npx tsx scripts/fetch-fundme.ts` — fetched 101 campaigns, 0 failures
- Verified campaign `78211291323c9f09` ("BCH‑1: Phase 2 Booster Plan") maps to `ecosystem` continent

### 2. Node Spacing Fixed (`src/components/graph/GraphVisualization.tsx`)
- `RING_START`: 100 → 150 (first orbit further from sun)
- `RING_STEP`: 80 → 120 (more distance between rings)
- Ring capacities: reduced from `[5, 8, 12, 16, 20, 24]` to `[5, 6, 5, 6, 5, 6]` max
- Failed ring capacities: same reduction
- Added collision resolution: 3-pass algorithm pushes apart any nodes closer than 40px
- Continent centers: spread from ±1500 to ±2000 range
- Continent label offset: 220 → 280 to match wider spacing

### 3. Orbit Rings Made Visible
- Stroke color: `rgba(0, 224, 160, 0.08)` → `rgba(0, 224, 160, 0.2)`
- Line width: 0.5 → 1.0
- Added dashed pattern: `ctx.setLineDash([8, 12])`
- Reset dash pattern after drawing

## Files Changed
- `data/fundme.json` — regenerated from API
- `src/components/graph/GraphVisualization.tsx` — spacing, collision, orbit ring visibility

## Verification
- `npm run build` passes ✓
- Campaign 78211291323c9f09 continent = "ecosystem" ✓
