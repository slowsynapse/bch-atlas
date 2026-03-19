# TASK: BCH Atlas Phase 1 Rebuild

## Overview

Rebuild BCH Atlas as a static-JSON-powered Next.js app with a Death Stranding-inspired UI aesthetic. Strip the Prisma/PostgreSQL dependency. Make the graph visualizer the hero feature. Make it beautiful.

## Priority Order

1. Strip Prisma, make app build with static JSON only
2. Death Stranding UI redesign (complete visual overhaul)
3. Fix and enhance graph visualization
4. Polish campaign list and detail pages
5. Clean up codebase

---

## 1. Strip Prisma & Unify Data Path

### Remove Prisma dependency entirely:
- Remove `prisma`, `@prisma/client`, `@prisma/adapter-pg`, `@vercel/postgres`, `pg` from package.json
- Remove `prisma/` directory  
- Remove `src/lib/prisma.ts`
- Remove `prisma.config.ts`
- Remove the `postinstall: prisma generate` script
- Remove `DATABASE_SETUP.md`

### Unify to static JSON:
- `src/lib/data/campaigns.ts` already imports from `data/flipstarters-with-addresses.json` — keep this as the single source of truth
- Rewrite `src/app/api/campaigns/route.ts` to use the static data functions from `lib/data/campaigns.ts` instead of Prisma queries. Apply the same filtering logic (search, status, platform, amount range) but against the in-memory array.
- The homepage and graph already use static imports — good, keep those.

### After stripping:
- `npm install` must succeed without DATABASE_URL
- `npm run build` must succeed
- `npm run dev` must work

---

## 2. Death Stranding UI Redesign

### Design System

**Color Palette:**
```css
/* Core */
--ds-bg-primary: #0A0A0C;         /* Deep black background */
--ds-bg-secondary: #111114;        /* Card/panel background */
--ds-bg-tertiary: #1A1A1E;         /* Elevated surfaces */
--ds-border: rgba(0, 212, 255, 0.15); /* Subtle cyan borders */

/* Accents */
--ds-cyan: #00D4FF;                /* Primary accent — holographic cyan */
--ds-cyan-glow: rgba(0, 212, 255, 0.3); /* Glow effect */
--ds-cyan-dim: #0088AA;            /* Muted cyan for secondary text */
--ds-amber: #FF8C00;               /* Warning/failed state */
--ds-amber-glow: rgba(255, 140, 0, 0.3);
--ds-green: #00FF88;               /* Success state */
--ds-green-glow: rgba(0, 255, 136, 0.3);
--ds-red: #FF3344;                 /* Error/expired */

/* Text */
--ds-text-primary: #E8E8EC;        /* Primary text */
--ds-text-secondary: #8888A0;      /* Secondary/muted text */
--ds-text-accent: #00D4FF;         /* Highlighted text */
```

**Typography:**
- Use Google Fonts: `Inter` for UI text, `JetBrains Mono` for data/addresses/numbers
- Uppercase tracking for labels: `letter-spacing: 0.1em; text-transform: uppercase; font-size: 0.7rem;`
- Thin font weights (300-400) for body, medium (500) for emphasis

**Card/Panel Style:**
```css
.ds-panel {
  background: rgba(17, 17, 20, 0.85);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 212, 255, 0.12);
  border-radius: 2px;  /* Sharp corners, not rounded */
}
```

**Scan Line Effect (subtle):**
Apply via CSS pseudo-element on the body or main container:
```css
body::after {
  content: '';
  position: fixed;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 212, 255, 0.015) 2px,
    rgba(0, 212, 255, 0.015) 4px
  );
  pointer-events: none;
  z-index: 9999;
}
```

**Animations:**
- Subtle fade-in on page load
- Gentle pulse on interactive elements hover
- No bouncy/spring animations — everything should feel precise and deliberate

### Apply to globals.css
Replace the existing Tailwind setup. Keep Tailwind for layout utilities but define the Death Stranding design tokens as CSS custom properties. Apply dark background to html/body.

### Update layout.tsx
- Change metadata title to "BCH ATLAS — Archive & Tracking Ledger for Assurance Schemes"
- Add Inter + JetBrains Mono from next/font/google
- Dark theme body

### Redesign Homepage (page.tsx)
- Dark background, no gradient pastels
- "BCH ATLAS" title in thin uppercase with wide letter-spacing, glowing cyan
- Subtitle in muted text
- Stats cards: translucent panels with cyan borders, numbers in JetBrains Mono
- "Explore Graph" CTA: outlined cyan button with glow on hover
- "Browse Campaigns" CTA: subtle secondary button
- Remove the feature cards and "Why BCH ATLAS" section — replace with a minimalist single-line description
- Footer: tiny, muted, bottom of page

### Redesign Graph Page (graph/page.tsx)
- Full-screen dark background
- Graph controls panel: frosted glass sidebar, left side
- Node detail sidebar: frosted glass, right side, slides in on click
- Header: minimal, just logo + nav links, translucent
- Legend in the controls panel

### Redesign Campaigns List (campaigns/page.tsx)  
- Dark background
- Campaign cards: translucent panels, cyan left border for success, amber for failed, blue for running
- Search bar: dark input with cyan focus ring
- Filter section: collapsible, dark panels

### Redesign Campaign Detail (campaigns/[id]/page.tsx)
- Dark background
- Hero section with campaign title + status badge (holographic feel)
- Stats in monospace
- Links section with subtle underlines
- Contributor addresses in monospace with copy button

---

## 3. Fix & Enhance Graph Visualization

### Update Graph Colors for Death Stranding Theme:

Campaign nodes:
- Success: #00FF88 (green glow)
- Failed/Expired: #FF3344 (red)  
- Running: #00D4FF (cyan)
- Unknown: #555566

Recipient nodes (diamonds):
- Color: #FF8C00 (amber) — these are the "strands" connecting campaigns
- Glow effect on multi-campaign recipients

Entity nodes (hexagons):
- Color based on success rate but using DS palette

Edges:
- Default: rgba(0, 212, 255, 0.2) — dim cyan strands
- On hover/select: brighten to full #00D4FF
- "received" edges: rgba(255, 140, 0, 0.3) — amber

### Graph Background:
- Set the Cytoscape container background to #0A0A0C (match page)

### Graph Interaction:
- On node click, highlight all connected edges (brighten them)
- Dim unconnected nodes when one is selected
- Node detail panel slides in from right with full info

### Performance:
- The graph has ~225 campaign nodes + recipient address nodes. Should be fine with fcose.
- If slow, reduce recipient nodes to only those with 2+ campaigns (use getMultiCampaignRecipients)

---

## 4. Cleanup

- Delete `test-results.md` (internal testing notes, not needed in repo)
- Delete `DATABASE_SETUP.md` (Prisma is gone)
- Delete `prisma.config.ts`
- Update `README.md` with actual project description (not create-next-app boilerplate)
- Update `CLAUDE.md` to reflect the new architecture (no Prisma, static JSON only)
- Remove any hackathon/48-hour references from code comments
- Keep `scripts/` directory — those are useful extraction tools
- Keep `data/` directory — that's the core dataset
- Keep `src/lib/chaingraph/` — useful for future blockchain verification

---

## 5. Verification Checklist

After all changes:
- [ ] `npm install` succeeds (no Prisma postinstall failure)
- [ ] `npm run build` succeeds  
- [ ] `npm run dev` starts and homepage loads
- [ ] Homepage displays correct stats from JSON data
- [ ] Graph page loads with all campaigns visualized
- [ ] Graph nodes are clickable, detail panel works
- [ ] Campaign list loads via API route (now using static data)
- [ ] Campaign search works
- [ ] Campaign detail pages load correctly
- [ ] All pages have Death Stranding dark theme
- [ ] No console errors
- [ ] Mobile responsive (basic)

---

## Files Reference

**Primary data:** `data/flipstarters-with-addresses.json` (225 campaigns)
**Types:** `src/types/campaign.ts`
**Data layer:** `src/lib/data/campaigns.ts`
**Entity extraction:** `src/lib/parsers/entity-extractor.ts`
**Entity resolution:** `src/lib/data/entity-resolver.ts`
**Graph builder:** `src/lib/graph/builder.ts`  
**Address analyzer:** `src/lib/graph/address-analyzer.ts`
**Graph component:** `src/components/graph/GraphVisualization.tsx`

## Important Notes

- Do NOT modify `data/*.json` files — those are the source datasets
- Keep the existing data access layer pattern (`getCampaigns()`, `getEntities()`, etc.)
- Keep Cytoscape.js dynamic import pattern (avoids SSR issues)
- The graph page uses `'use client'` — keep it client-side
- The campaign detail page is a server component — keep it that way
- All campaign IDs are SHA256 hashes (16 chars) — do not change the ID generation
