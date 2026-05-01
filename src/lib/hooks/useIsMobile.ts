'use client'

import { useEffect, useState } from 'react'

/**
 * Returns true on screens narrower than the desktop breakpoint (1024px).
 *
 * SSR-safe: returns `false` on the server (the desktop branch is rendered
 * during static generation), then re-evaluates on the client after mount.
 * This means a phone briefly sees a flash of the desktop layout before
 * switching — acceptable trade-off vs. shipping zero pre-rendered HTML.
 *
 * The threshold matches Tailwind's `lg:` breakpoint so it lines up with
 * any responsive utility classes elsewhere in the app.
 */
export function useIsMobile(thresholdPx = 1024): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < thresholdPx)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [thresholdPx])

  return isMobile
}
