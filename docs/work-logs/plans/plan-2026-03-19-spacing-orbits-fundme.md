# Plan: Spacing, Orbit Rings & FundMe Re-fetch

**Date:** 2026-03-19

## Tasks

1. **Re-fetch FundMe data** — Run `npx tsx scripts/fetch-fundme.ts` to regenerate `data/fundme.json` with updated continent mapper (Unicode dash fix). Verify campaign `78211291323c9f09` maps to `ecosystem`.

2. **Fix node spacing** in `GraphVisualization.tsx`:
   - RING_START: 100 → 150
   - RING_STEP: 80 → 120
   - Ring capacities: reduce to 5-6 max per ring
   - Add collision resolution: push apart nodes closer than 40px
   - Continent centers: ±1500 → ±2000

3. **Make orbit rings visible**:
   - Stroke opacity: 0.08 → 0.2
   - Line width: 0.5 → 1.0
   - Dashed pattern: `[8, 12]`
   - Color: `rgba(0, 224, 160, 0.2)`

## Verification
- `npm run build` passes
- Campaign 78211291323c9f09 has continent `ecosystem` in fundme.json
