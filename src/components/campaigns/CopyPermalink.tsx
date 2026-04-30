'use client'

import { useState } from 'react'

export function CopyPermalink() {
  const [copied, setCopied] = useState(false)

  const onCopy = async () => {
    if (typeof window === 'undefined') return
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard write failures are non-critical; do nothing.
    }
  }

  return (
    <button
      onClick={onCopy}
      className="px-3 py-1.5 border text-xs tracking-[0.1em] uppercase font-mono transition-all"
      style={{
        borderColor: copied ? 'rgba(0,255,136,0.5)' : 'rgba(0,224,160,0.15)',
        color: copied ? '#00FF88' : '#7A8899',
        textShadow: copied ? '0 0 6px rgba(0,255,136,0.4)' : undefined,
      }}
      title="Copy link to this campaign"
    >
      {copied ? 'Copied' : 'Copy Link'}
    </button>
  )
}
