'use client'

import Link from 'next/link'

/**
 * Mobile fallback for the atlas homepage.
 *
 * Renders a full-bleed screenshot of the desktop graph (no interaction)
 * with a frosted overlay carrying the title, a short explainer that the
 * graph is desktop-only for now, and CTA buttons to the browse pages
 * which DO work well on mobile.
 *
 * Refresh the screenshot from the dev server with:
 *   1. npm run dev
 *   2. Open http://localhost:3000 at desktop width, wait for graph to render
 *   3. In console: hide HUD chrome and call cy.fit(), then save the
 *      visible graph area as public/atlas-mobile-fallback.png
 *
 * The image goes stale when the dataset changes meaningfully — re-capture
 * every few weeks, or after adding 10+ projects.
 */
export function MobileAtlasView({ stats }: { stats: { totalCampaigns: number; totalBCH: number; activeCount: number } }) {
  return (
    <div className="h-screen w-screen relative overflow-hidden bg-black">
      {/* Background screenshot of the desktop atlas */}
      <div
        className="absolute inset-0 bg-center bg-cover"
        style={{
          backgroundImage: 'url(/atlas-mobile-fallback.png)',
          backgroundSize: 'cover',
        }}
      />

      {/* Subtle scan-line overlay for the Death-Stranding feel */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(0, 224, 160, 0.025) 0px, rgba(0, 224, 160, 0.025) 1px, transparent 1px, transparent 3px)',
        }}
      />

      {/* Vignette gradient — darker at edges so text reads */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.85) 100%)',
        }}
      />

      {/* Top brand bar */}
      <div className="absolute top-0 left-0 right-0 px-5 pt-5 pb-3 z-10">
        <h1
          className="text-2xl font-extralight tracking-[0.3em] uppercase"
          style={{
            color: '#00E0A0',
            textShadow: '0 0 30px rgba(0, 224, 160, 0.4)',
          }}
        >
          BCH ATLAS
        </h1>
        <p className="text-[10px] uppercase tracking-[0.25em] mt-1" style={{ color: '#5A8A7A' }}>
          All Roads Lead to Bitcoin Cash
        </p>
      </div>

      {/* Stat tiles, mid-screen, semi-transparent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-full px-6">
        <div className="grid grid-cols-3 gap-2">
          <div
            className="text-center py-3 px-1"
            style={{
              background: 'rgba(0, 14, 10, 0.6)',
              border: '1px solid rgba(0, 224, 160, 0.2)',
              borderRadius: '2px',
              backdropFilter: 'blur(4px)',
            }}
          >
            <div className="font-mono text-2xl" style={{ color: '#00E0A0', textShadow: '0 0 10px rgba(0,224,160,0.5)' }}>{stats.totalCampaigns}</div>
            <div className="text-[9px] uppercase tracking-[0.15em] mt-0.5" style={{ color: '#5A8A7A' }}>Campaigns</div>
          </div>
          <div
            className="text-center py-3 px-1"
            style={{
              background: 'rgba(0, 14, 10, 0.6)',
              border: '1px solid rgba(0, 224, 160, 0.2)',
              borderRadius: '2px',
              backdropFilter: 'blur(4px)',
            }}
          >
            <div className="font-mono text-2xl" style={{ color: '#00E0A0', textShadow: '0 0 10px rgba(0,224,160,0.5)' }}>{Math.round(stats.totalBCH).toLocaleString()}</div>
            <div className="text-[9px] uppercase tracking-[0.15em] mt-0.5" style={{ color: '#5A8A7A' }}>BCH Raised</div>
          </div>
          <div
            className="text-center py-3 px-1"
            style={{
              background: 'rgba(0, 14, 10, 0.6)',
              border: '1px solid rgba(0, 224, 160, 0.2)',
              borderRadius: '2px',
              backdropFilter: 'blur(4px)',
            }}
          >
            <div className="font-mono text-2xl" style={{ color: '#00D4FF', textShadow: '0 0 10px rgba(0,212,255,0.5)' }}>{stats.activeCount}</div>
            <div className="text-[9px] uppercase tracking-[0.15em] mt-0.5" style={{ color: '#5A8A7A' }}>Active</div>
          </div>
        </div>
      </div>

      {/* Bottom CTA stack */}
      <div className="absolute bottom-0 left-0 right-0 px-5 pb-6 pt-12 z-10"
        style={{
          background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.85) 35%, rgba(0,0,0,0.95) 100%)',
        }}
      >
        <p className="text-[11px] text-center mb-4 leading-relaxed px-2" style={{ color: '#9ED9C0' }}>
          Graph navigation is available on desktop. Use the menu below to browse campaigns and projects on mobile.
        </p>

        <div className="space-y-2">
          <Link
            href="/campaigns"
            className="block w-full px-4 py-3 text-center text-xs font-mono uppercase tracking-[0.15em] transition-all"
            style={{
              background: 'rgba(0, 180, 140, 0.1)',
              border: '1px solid rgba(0, 224, 160, 0.4)',
              color: '#00E0A0',
              borderRadius: '2px',
              textShadow: '0 0 6px rgba(0,224,160,0.3)',
            }}
          >
            Browse Campaigns
          </Link>
          <Link
            href="/projects"
            className="block w-full px-4 py-3 text-center text-xs font-mono uppercase tracking-[0.15em] transition-all"
            style={{
              background: 'rgba(0, 140, 200, 0.08)',
              border: '1px solid rgba(0, 212, 255, 0.4)',
              color: '#00D4FF',
              borderRadius: '2px',
              textShadow: '0 0 6px rgba(0,212,255,0.3)',
            }}
          >
            Browse Projects
          </Link>
          <Link
            href="/projects/github"
            className="block w-full px-4 py-3 text-center text-xs font-mono uppercase tracking-[0.15em] transition-all"
            style={{
              background: 'rgba(150, 100, 200, 0.08)',
              border: '1px solid rgba(180, 130, 230, 0.4)',
              color: '#B080E0',
              borderRadius: '2px',
              textShadow: '0 0 6px rgba(180,130,230,0.3)',
            }}
          >
            Browse Git Repos
          </Link>
        </div>
      </div>
    </div>
  )
}
