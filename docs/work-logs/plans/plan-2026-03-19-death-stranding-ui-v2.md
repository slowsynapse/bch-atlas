# Plan: Death Stranding UI V2

## Date: 2026-03-19

## Reference

The Death Stranding World Map (Chiral Network) screenshot is the primary design reference. Key characteristics:

1. **Holographic projection** — elements feel projected, with subtle glow/bloom effects
2. **Color palette is softer** — not harsh neon. Teal/cyan around #4ECDC4 to #00BFA5, not pure #00FF00 or #00D4FF
3. **Orange/amber for warnings** — "CONNECTION REFUSED" nodes use warm orange
4. **Dark with depth** — background isn't flat black. Has subtle gradients, texture, depth
5. **Topographic/contour patterns** — subtle line patterns in backgrounds suggesting terrain
6. **Typography** — small, uppercase, wide letter-spacing, light weight
7. **Translucent panels** — see-through, not opaque cards
8. **The graph IS the full-screen experience** — not a component in a box

## What Needs to Change

### globals.css
- Soften the cyan — more teal (#4ECDC4) less electric (#00D4FF)
- Add radial gradient background instead of flat black
- Add subtle topographic/contour line pattern to backgrounds
- Cards need more translucency and less visible borders
- Scan line effect is too obvious — make it barely perceptible or remove
- Add subtle bloom/glow effects on interactive elements

### Homepage
- Background needs depth — radial gradient from dark center, subtle pattern
- Stats panel needs to feel like holographic readouts, not website cards
- Title glow should be softer, more diffuse
- Consider adding very subtle animated particles or grid lines

### Graph Page (highest priority)
- Graph background should have the topographic line pattern
- Node glow effects — nodes should emit subtle light
- Edge rendering — edges should glow like strands of chiral network
- Connected nodes should pulse subtly
- Selection highlight should bloom/glow, not just border change
- Controls panel — more transparent, less "website sidebar"
- Detail panel — holographic readout feel

### Campaign List
- Cards are currently too dark/invisible — MUST FIX CONTRAST
- Cards should be translucent panels with visible content
- Left status bar should glow slightly
- Text contrast needs to be much higher on dark backgrounds

### Campaign Detail
- Holographic data readout feel
- Stats in monospace with subtle glow

## Success Criteria
- Looks like a Death Stranding UI, not a generic dark theme website
- All text is readable (contrast ratio)
- Graph feels like a holographic network map
- Campaign cards are visible and readable
- Homepage has depth, not flat
