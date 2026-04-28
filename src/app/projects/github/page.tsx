'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import projectsData from '../../../../data/projects.json'
import type { Project } from '@/types/project'

const STATUS_META: Record<string, { color: string; label: string }> = {
  active: { color: '#00FF88', label: 'Active' },
  dormant: { color: '#E8A838', label: 'Dormant' },
  unknown: { color: '#E8A838', label: 'Unknown' },
  dead: { color: '#FF4455', label: 'Dead' },
}

interface Bucket { days: number | null; bucket: string; color: string }

function commitAgeBucket(iso: string | null): Bucket {
  if (!iso) return { days: null, bucket: 'no data', color: '#3A6A5A' }
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000))
  if (days < 30) return { days, bucket: '< 1mo', color: '#00FF88' }
  if (days < 180) return { days, bucket: '< 6mo', color: '#00E0A0' }
  if (days < 365) return { days, bucket: '< 1yr', color: '#E8A838' }
  if (days < 730) return { days, bucket: '< 2yr', color: '#E8A838' }
  return { days, bucket: '2yr+', color: '#FF4455' }
}

function parseHostRepo(url: string): { host: string; owner: string; repo: string } | null {
  try {
    const u = new URL(url)
    const parts = u.pathname.split('/').filter(Boolean)
    if (parts.length < 2) return null
    return { host: u.hostname, owner: parts[0], repo: parts[1] }
  } catch {
    return null
  }
}

function hostLabel(host: string): string {
  if (host === 'github.com') return 'GitHub'
  if (host === 'gitlab.com') return 'GitLab'
  if (host === 'codeberg.org') return 'Codeberg'
  if (host === 'bitbucket.org') return 'Bitbucket'
  return host
}

const BUCKETS = ['< 1mo', '< 6mo', '< 1yr', '< 2yr', '2yr+', 'no data'] as const
type BucketKey = typeof BUCKETS[number]

const BUCKET_COLOR: Record<BucketKey, string> = {
  '< 1mo': '#00FF88',
  '< 6mo': '#00E0A0',
  '< 1yr': '#E8A838',
  '< 2yr': '#E8A838',
  '2yr+': '#FF4455',
  'no data': '#5A8A7A',
}

export default function SourceCodeBrowsePage() {
  const all = (projectsData as unknown as Project[]).filter(p => !!p.github)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set())
  const [hostFilter, setHostFilter] = useState<Set<string>>(new Set())
  const [bucketFilter, setBucketFilter] = useState<Set<string>>(new Set())

  const enriched = useMemo(() => {
    return all.map(p => ({
      project: p,
      repo: parseHostRepo(p.github!)!,
      age: commitAgeBucket(p.lastGithubCommit),
    }))
  }, [all])

  // Aggregate stats from the unfiltered set so the chips remain stable
  const { bucketCounts, hostCounts, statusCounts } = useMemo(() => {
    const buckets = Object.fromEntries(BUCKETS.map(b => [b, 0])) as Record<BucketKey, number>
    const hosts: Record<string, number> = {}
    const statuses: Record<string, number> = {}
    for (const e of enriched) {
      buckets[e.age.bucket as BucketKey]++
      if (e.repo) hosts[e.repo.host] = (hosts[e.repo.host] || 0) + 1
      statuses[e.project.status] = (statuses[e.project.status] || 0) + 1
    }
    return { bucketCounts: buckets, hostCounts: hosts, statusCounts: statuses }
  }, [enriched])

  // Apply filters
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return enriched.filter(({ project, repo, age }) => {
      if (statusFilter.size > 0 && !statusFilter.has(project.status)) return false
      if (hostFilter.size > 0 && (!repo || !hostFilter.has(repo.host))) return false
      if (bucketFilter.size > 0 && !bucketFilter.has(age.bucket)) return false
      if (q) {
        const hay = `${project.name} ${project.slug} ${project.description ?? ''} ${repo?.owner ?? ''} ${repo?.repo ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    }).sort((a, b) => {
      // Newest commit first; no-data goes last
      const aT = a.project.lastGithubCommit ? new Date(a.project.lastGithubCommit).getTime() : -1
      const bT = b.project.lastGithubCommit ? new Date(b.project.lastGithubCommit).getTime() : -1
      return bT - aT
    })
  }, [enriched, search, statusFilter, hostFilter, bucketFilter])

  const toggle = (set: Set<string>, key: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setter(next)
  }

  const hasActiveFilters = search || statusFilter.size > 0 || hostFilter.size > 0 || bucketFilter.size > 0

  return (
    <div className="min-h-screen ds-fade-in">
      <header className="border-0 border-b border-[rgba(0,224,160,0.1)]" style={{
        background: 'linear-gradient(180deg, rgba(0,180,140,0.06) 0%, rgba(7,10,13,0.95) 100%)',
      }}>
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <Link href="/" className="text-lg font-light tracking-[0.15em] uppercase text-[#00E0A0] hover:text-[#00FF88] transition-colors font-mono"
                style={{ textShadow: '0 0 10px rgba(0,224,160,0.3)' }}>
                BCH ATLAS
              </Link>
              <p className="text-[10px] uppercase tracking-[0.25em] mt-1" style={{ color: '#5A8A7A' }}>
                Source Code Registry — GitHub · GitLab · Self-Hosted
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="px-3 py-2 text-[11px] font-mono uppercase tracking-[0.12em] transition-all"
                style={{ background: 'rgba(0,180,140,0.06)', border: '1px solid rgba(0,224,160,0.2)', color: '#00E0A0', borderRadius: '2px' }}
              >
                Atlas
              </Link>
              <Link
                href="/projects"
                className="px-3 py-2 text-[11px] font-mono uppercase tracking-[0.12em] transition-all"
                style={{ background: 'rgba(0,180,140,0.06)', border: '1px solid rgba(0,224,160,0.2)', color: '#00E0A0', borderRadius: '2px' }}
              >
                Browse Projects
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6">
        {/* Activity buckets — clickable */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-4">
          {BUCKETS.map(b => {
            const sel = bucketFilter.has(b)
            const c = BUCKET_COLOR[b]
            return (
              <button
                key={b}
                onClick={() => toggle(bucketFilter, b, setBucketFilter)}
                className="p-3 text-left transition-all"
                style={{
                  background: sel ? `${c}18` : 'rgba(0,180,140,0.04)',
                  border: `1px solid ${sel ? c : 'rgba(0,224,160,0.1)'}`,
                  borderRadius: '2px',
                  cursor: 'pointer',
                }}
              >
                <div className="font-mono text-2xl font-medium" style={{ color: c, textShadow: `0 0 10px ${c}50` }}>
                  {bucketCounts[b]}
                </div>
                <div className="text-[9px] uppercase tracking-[0.15em] mt-0.5" style={{ color: '#5A8A7A' }}>
                  {b}
                </div>
              </button>
            )
          })}
        </div>

        {/* Search + filter rows */}
        <div className="mb-4 space-y-3">
          <input
            type="text"
            placeholder="Search project, owner, repo, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 bg-[rgba(11,14,17,0.6)] border border-[rgba(78,205,196,0.1)] text-[#E0E4E8] text-xs placeholder-[#5A6A7A] focus:border-[rgba(78,205,196,0.3)] focus:outline-none"
            style={{ borderRadius: '2px' }}
          />

          <div className="flex flex-wrap gap-2">
            <span className="text-[9px] font-mono uppercase tracking-[0.15em] mr-1 self-center" style={{ color: '#5A8A7A' }}>Status:</span>
            {(['active', 'dormant', 'dead', 'unknown'] as const).map(s => {
              const sel = statusFilter.has(s)
              const c = STATUS_META[s].color
              const count = statusCounts[s] || 0
              return (
                <button
                  key={s}
                  onClick={() => toggle(statusFilter, s, setStatusFilter)}
                  className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider transition-all"
                  style={{
                    background: sel ? `${c}20` : 'rgba(0,180,140,0.04)',
                    border: `1px solid ${sel ? c : 'rgba(0,224,160,0.15)'}`,
                    color: sel ? c : '#90A8A8',
                    borderRadius: '2px',
                  }}
                >
                  {STATUS_META[s].label} ({count})
                </button>
              )
            })}
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="text-[9px] font-mono uppercase tracking-[0.15em] mr-1 self-center" style={{ color: '#5A8A7A' }}>Host:</span>
            {Object.entries(hostCounts).sort((a, b) => b[1] - a[1]).map(([host, count]) => {
              const sel = hostFilter.has(host)
              return (
                <button
                  key={host}
                  onClick={() => toggle(hostFilter, host, setHostFilter)}
                  className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider transition-all"
                  style={{
                    background: sel ? 'rgba(0,224,160,0.15)' : 'rgba(0,180,140,0.04)',
                    border: `1px solid ${sel ? '#00E0A0' : 'rgba(0,224,160,0.15)'}`,
                    color: sel ? '#00E0A0' : '#90A8A8',
                    borderRadius: '2px',
                  }}
                >
                  {hostLabel(host)} ({count})
                </button>
              )
            })}
            {hasActiveFilters && (
              <button
                onClick={() => {
                  setSearch('')
                  setStatusFilter(new Set())
                  setHostFilter(new Set())
                  setBucketFilter(new Set())
                }}
                className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider ml-auto"
                style={{ color: '#FF8C00', border: '1px solid rgba(255,140,0,0.3)', borderRadius: '2px' }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="text-[10px] font-mono uppercase tracking-[0.15em] mb-3" style={{ color: '#5A8A7A' }}>
          {filtered.length} {filtered.length === 1 ? 'repository' : 'repositories'}
          {hasActiveFilters && ` (of ${enriched.length})`}
        </div>

        {/* Repo list */}
        <div className="space-y-1.5">
          {filtered.map(({ project: p, repo, age }) => {
            const status = STATUS_META[p.status] || STATUS_META.unknown
            return (
              <div
                key={p.slug}
                className="grid items-center gap-3 px-3 py-2 transition-all hover:bg-[rgba(0,180,140,0.06)]"
                style={{
                  gridTemplateColumns: '1.4fr 2.2fr 0.8fr 0.6fr auto',
                  background: 'rgba(0,180,140,0.03)',
                  border: '1px solid rgba(0,224,160,0.1)',
                  borderRadius: '2px',
                }}
              >
                <Link href={`/projects/${p.slug}`} className="text-[12px] font-medium text-[#E8ECF0] hover:text-[#00FF88] truncate">
                  {p.name}
                </Link>
                <a href={p.github!} target="_blank" rel="noopener noreferrer" className="text-[11px] font-mono text-[#90A8A8] hover:text-[#00E0A0] truncate">
                  {repo ? `${repo.owner}/${repo.repo}` : p.github}
                  <span className="ml-2 text-[9px]" style={{ color: '#3A6A5A' }}>
                    {repo ? hostLabel(repo.host) : ''}
                  </span>
                </a>
                <span className="font-mono text-[10px]" style={{ color: age.color }}>
                  {age.days !== null ? `${age.days}d ago` : 'no data'}
                </span>
                <span
                  className="text-[9px] font-mono uppercase px-1.5 py-px tracking-wider text-center"
                  style={{
                    color: age.color,
                    border: `1px solid ${age.color}40`,
                    borderRadius: '1px',
                    background: `${age.color}10`,
                  }}
                >
                  {age.bucket}
                </span>
                <span
                  className="text-[9px] font-mono uppercase px-1.5 py-px tracking-wider"
                  style={{
                    color: status.color,
                    border: `1px solid ${status.color}40`,
                    borderRadius: '1px',
                    background: `${status.color}10`,
                  }}
                >
                  {status.label}
                </span>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="text-center py-8 text-[12px]" style={{ color: '#5A8A7A' }}>
              No repos match the current filters.
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
