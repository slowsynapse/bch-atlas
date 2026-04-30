import Link from 'next/link'
import { getCampaignByIdWithPricing, getCampaignsWithPricing } from '@/lib/data/campaigns-with-pricing'
import { ContributorsList } from '@/components/campaigns/ContributorsList'
import { Markdown } from '@/components/campaigns/Markdown'
import { CopyPermalink } from '@/components/campaigns/CopyPermalink'
import { notFound } from 'next/navigation'

function getStatusColor(status: string): string {
  switch (status) {
    case 'success': return 'text-[#00FF88]'
    case 'expired':
    case 'failed': return 'text-[#FF4455]'
    case 'running': return 'text-[#00E0A0]'
    default: return 'text-[#7A8899]'
  }
}

function getStatusGlow(status: string): string {
  switch (status) {
    case 'success': return '0 0 8px rgba(0,255,136,0.4)'
    case 'expired':
    case 'failed': return '0 0 8px rgba(255,68,85,0.4)'
    case 'running': return '0 0 8px rgba(0,224,160,0.4)'
    default: return 'none'
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'success': return 'SUCCESS'
    case 'expired':
    case 'failed': return 'FAILED'
    case 'running': return 'RUNNING'
    default: return status.toUpperCase()
  }
}

function formatDate(dateString?: string, timestamp?: number): string {
  if (timestamp) {
    const date = new Date(timestamp * 1000)
    return date.toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }
  if (!dateString) return 'Unknown'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return 'Unknown'
  }
}

function getTimeSince(dateString?: string, timestamp?: number): string {
  const date = timestamp ? new Date(timestamp * 1000) : (dateString ? new Date(dateString) : null)
  if (!date) return 'Unknown'

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffMonths = Math.floor(diffDays / 30)
  const diffYears = Math.floor(diffDays / 365)

  if (diffYears > 0) return `${diffYears} year${diffYears > 1 ? 's' : ''} ago`
  if (diffMonths > 0) return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`
  return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
}

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const campaign = await getCampaignByIdWithPricing(id)

  if (!campaign) {
    notFound()
  }

  // Find other campaigns sharing any recipient address with this one. Cheap
  // because we already need the full list for navigation context — this page
  // is statically generated per slug at build time, so the cost is one-time.
  const allCampaigns = (campaign.recipientAddresses?.length ?? 0) > 0
    ? await getCampaignsWithPricing()
    : []
  const recipientSet = new Set(campaign.recipientAddresses ?? [])
  const sharedSiblings = allCampaigns.filter(c =>
    c.id !== campaign.id &&
    c.recipientAddresses?.some(a => recipientSet.has(a))
  )

  const contributors = (campaign.recipientAddresses || []).map(address => ({ address }))
  // Distinguish goal (target) from raised (actual). For Flipstarter, amount IS the goal.
  // For FundMe, amount is the raised total (no goal in API). If we extracted a goal
  // from the description, prefer that as the displayed target.
  const explicitGoal = (campaign as any).goal as number | undefined
  const goalAmount = explicitGoal ?? campaign.amount
  const raisedAmount = campaign.raised ?? (campaign.platform === 'fundme' ? campaign.amount : (campaign.status === 'success' ? campaign.amount : 0))
  const progressPercent = goalAmount > 0 ? (raisedAmount / goalAmount) * 100 : 0
  // "Expired with nothing on chain" looks broken if we render the regular
  // funding panel (empty progress bar). Treat it as a separate empty-state
  // even when goalAmount > 0, since the goal is just the asked-for amount
  // that nobody actually pledged toward.
  const expiredWithNoPledges =
    campaign.status === 'expired' &&
    raisedAmount === 0 &&
    !campaign.tx
  const hasContent = (goalAmount > 0 || raisedAmount > 0) && !expiredWithNoPledges

  return (
    <div className="min-h-screen ds-fade-in">
      {/* Header */}
      <header className="ds-holographic border-0 border-b border-[rgba(0,224,160,0.1)]">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <Link href="/" className="text-lg font-light tracking-[0.15em] uppercase text-[#00E0A0] hover:text-[#00FF88] transition-colors font-mono" style={{ textShadow: '0 0 10px rgba(0,224,160,0.3)' }}>
                BCH ATLAS
              </Link>
              <p className="ds-label mt-0.5 font-mono">Campaign Detail</p>
            </div>
            <div className="flex gap-3">
              <CopyPermalink />
              <Link href="/campaigns" className="px-4 py-1.5 border border-[rgba(0,224,160,0.15)] text-[#7A8899] text-xs tracking-[0.1em] uppercase font-mono hover:border-[rgba(0,224,160,0.4)] hover:text-[#00E0A0] transition-all">
                Campaigns
              </Link>
              <Link href="/" className="px-4 py-1.5 border border-[rgba(0,224,160,0.15)] text-[#00E0A0] text-xs tracking-[0.1em] uppercase font-mono hover:border-[rgba(0,224,160,0.4)] hover:text-[#00FF88] transition-all" style={{ textShadow: '0 0 6px rgba(0,224,160,0.3)' }}>
                Back to Atlas
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Campaign Header */}
        <div className="ds-panel p-8 mb-6" style={{ borderTop: '1px solid rgba(0,224,160,0.2)', boxShadow: '0 -1px 8px rgba(0,224,160,0.1)' }}>
          <div className="flex justify-between items-start gap-4 mb-6">
            <h1 className="text-xl md:text-2xl font-light text-[#E0E4E8]">{campaign.title}</h1>
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <span
                className={`ds-label text-xs font-mono tracking-[0.15em] ${getStatusColor(campaign.status)}`}
                style={{ textShadow: getStatusGlow(campaign.status) }}
              >
                {getStatusLabel(campaign.status)}
              </span>
              {campaign.delivered === 'no' && (
                <span
                  className="ds-label text-xs font-mono tracking-[0.15em]"
                  style={{
                    color: '#FF4455',
                    textShadow: '0 0 8px rgba(255,68,85,0.5)',
                    border: '1px solid rgba(255,68,85,0.5)',
                    padding: '2px 8px',
                  }}
                  title={campaign.overrideNote || 'Funded but did not deliver'}
                >
                  💥 NOT DELIVERED
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-[#7A8899] mb-6">
            <span className="font-mono capitalize tracking-wider uppercase">{campaign.platform}</span>
            {campaign.continent && (
              <span className="font-mono uppercase tracking-wider" style={{ color: '#00E0A0' }}>
                {campaign.continent}
              </span>
            )}
            {campaign.time && (
              <span className="font-mono">{formatDate(campaign.time)}</span>
            )}
            {campaign.tx && (
              <span className="text-[#00E0A0] font-mono tracking-wider">Verified</span>
            )}
          </div>

          {campaign.delivered === 'no' && campaign.overrideNote && (
            <div
              className="text-xs font-mono mb-6 px-3 py-2"
              style={{
                color: '#FFB0B8',
                background: 'rgba(255,68,85,0.06)',
                border: '1px solid rgba(255,68,85,0.25)',
                borderRadius: '2px',
              }}
            >
              <span className="uppercase tracking-[0.15em] mr-2" style={{ color: '#FF4455' }}>delivery:</span>
              {campaign.overrideNote}
            </div>
          )}

          {/* Funding */}
          <div className="mb-6">
            {hasContent ? (
              <>
                <div className="flex justify-between items-end mb-3">
                  <div>
                    {/* Show "raised / goal" when we have both */}
                    {explicitGoal && raisedAmount !== goalAmount ? (
                      <div className="font-mono text-3xl" style={{ color: '#00FF88', textShadow: '0 0 20px rgba(0,255,136,0.3)' }}>
                        {raisedAmount.toFixed(2)}
                        <span className="text-xl text-[#7A8899] mx-2">/</span>
                        <span className="text-2xl text-[#E0E4E8]">{goalAmount.toFixed(2)}</span>
                        <span className="text-sm text-[#7A8899] ml-2">BCH</span>
                      </div>
                    ) : (
                      <div className="font-mono text-3xl" style={{ color: '#00FF88', textShadow: '0 0 20px rgba(0,255,136,0.3)' }}>
                        {goalAmount.toFixed(2)} <span className="text-sm text-[#7A8899]">BCH</span>
                      </div>
                    )}
                    {campaign.usdValueAtTime != null && (
                      <div className="mt-1">
                        <span className="font-mono text-lg text-[#E0E4E8]" style={{ textShadow: '0 0 8px rgba(224,228,232,0.15)' }}>
                          ≈ ${campaign.usdValueAtTime.toLocaleString()} USD
                        </span>
                        {campaign.priceDate && (
                          <span className="text-xs text-[#7A8899] ml-2 font-mono">
                            at BCH price on {new Date(campaign.priceDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                    )}
                    <span className="ds-label">
                      {explicitGoal && raisedAmount !== goalAmount ? 'Raised / Goal' : campaign.platform === 'fundme' ? 'Raised' : 'Goal'}
                    </span>
                    {(campaign as any).goalSource === 'description' && (
                      <span className="ml-2 text-[9px] font-mono text-[#5A8A7A]" title="Goal extracted from description text">(from description)</span>
                    )}
                  </div>
                  {goalAmount > 0 && (raisedAmount > 0 || campaign.status === 'success') && (
                    <div className="text-right">
                      <div className="font-mono text-lg text-[#E0E4E8]">{progressPercent.toFixed(0)}%</div>
                      <span className="ds-label">Funded</span>
                    </div>
                  )}
                </div>

                {goalAmount > 0 && (
                  <div className="w-full h-1.5 bg-[rgba(0,224,160,0.08)] overflow-hidden rounded-full">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(progressPercent, 100)}%`,
                        background: progressPercent >= 100
                          ? 'linear-gradient(90deg, #00E0A0, #00FF88)'
                          : 'linear-gradient(90deg, #007F5A, #00B07A)',
                        boxShadow: progressPercent >= 100 ? '0 0 12px rgba(0,255,136,0.4)' : 'none',
                      }}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="py-3 px-4" style={{ background: 'rgba(255, 68, 85, 0.06)', border: '1px solid rgba(255, 68, 85, 0.2)', borderRadius: '2px' }}>
                <div className="font-mono text-base" style={{ color: '#FF8899' }}>
                  No pledges recorded
                </div>
                <p className="text-[11px] text-[#7A8899] mt-1 leading-relaxed">
                  {goalAmount > 0 && (
                    <>Asked for <span className="font-mono text-[#C0D0D0]">{goalAmount.toFixed(2)} BCH</span>. </>
                  )}
                  This campaign was {campaign.platform === 'fundme' ? 'archived on FundMe.cash' : 'expired'} without receiving pledges through the platform.
                  {campaign.platform === 'fundme' && ' The campaign page existed but no backers committed BCH via the CashStarter contract.'}
                  {campaign.archive && campaign.archive.length > 0 && (
                    <> See the archive snapshot for the original page.</>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Description */}
          {campaign.description && (
            <div>
              <h2 className="ds-label mb-3">Description</h2>
              <Markdown source={campaign.description} />
            </div>
          )}
        </div>

        {/* Project linkage — shows when this campaign belongs to a curated project */}
        {campaign.projectSlug && (
          <Link
            href={`/projects/${campaign.projectSlug}`}
            className="block ds-panel p-5 mb-6 transition-all hover:border-[rgba(0,224,160,0.5)]"
            style={{ borderTop: '1px solid rgba(0,224,160,0.2)' }}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{
                    background:
                      campaign.projectStatus === 'active' ? '#00FF88' :
                      campaign.projectStatus === 'dormant' ? '#E8A838' :
                      campaign.projectStatus === 'dead' ? '#FF4455' : '#5A8A7A',
                    boxShadow:
                      campaign.projectStatus === 'active' ? '0 0 6px rgba(0,255,136,0.5)' :
                      campaign.projectStatus === 'dormant' ? '0 0 6px rgba(232,168,56,0.5)' :
                      campaign.projectStatus === 'dead' ? '0 0 6px rgba(255,68,85,0.5)' : 'none',
                  }}
                />
                <div className="min-w-0">
                  <span className="ds-label">Part of project</span>
                  <p className="text-[#E0E4E8] text-base font-medium truncate mt-0.5">{campaign.projectName ?? campaign.projectSlug}</p>
                </div>
              </div>
              <span className="text-xs text-[#00E0A0] font-mono uppercase tracking-[0.15em] flex-shrink-0">View Project →</span>
            </div>
          </Link>
        )}

        {/* Timeline */}
        {(campaign.time || campaign.transactionTimestamp) && (
          <div className="ds-panel p-6 mb-6" style={{ borderTop: '1px solid rgba(0,224,160,0.15)' }}>
            <h2 className="ds-label mb-4 font-mono">Timeline</h2>
            <div className="space-y-3">
              {campaign.time && (
                <div>
                  <span className="ds-label font-mono">Completion</span>
                  <p className="text-[#E0E4E8] text-sm font-mono mt-0.5">{formatDate(campaign.time)}</p>
                </div>
              )}
              {campaign.transactionTimestamp && (
                <>
                  <div>
                    <span className="ds-label font-mono">Funded</span>
                    <p className="text-[#E0E4E8] text-sm font-mono mt-0.5">{formatDate(undefined, Number(campaign.transactionTimestamp))}</p>
                  </div>
                  <div>
                    <span className="ds-label font-mono">Time Since</span>
                    <p className="text-[#00E0A0] text-sm font-mono mt-0.5" style={{ textShadow: '0 0 6px rgba(0,224,160,0.3)' }}>{getTimeSince(undefined, Number(campaign.transactionTimestamp))}</p>
                  </div>
                </>
              )}
              {campaign.blockHeight && (
                <div>
                  <span className="ds-label font-mono">Block Height</span>
                  <p className="text-[#C0D0D0] text-sm font-mono mt-0.5">#{Number(campaign.blockHeight).toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recipients */}
        <div className="ds-panel p-6 mb-6" style={{ borderTop: '1px solid rgba(0,224,160,0.15)' }}>
          <h2 className="ds-label mb-4 font-mono">
            Recipients {contributors.length > 0 && <span className="text-[#00E0A0] font-mono" style={{ textShadow: '0 0 6px rgba(0,224,160,0.3)' }}>({contributors.length})</span>}
          </h2>
          <ContributorsList contributors={contributors} />
        </div>

        {/* Shared Recipients — other campaigns funded by the same address(es) */}
        {sharedSiblings.length > 0 && (
          <div className="ds-panel p-6 mb-6" style={{ borderTop: '1px solid rgba(0,224,160,0.15)' }}>
            <h2 className="ds-label mb-1 font-mono">
              Shared Recipients <span className="text-[#00E0A0] font-mono" style={{ textShadow: '0 0 6px rgba(0,224,160,0.3)' }}>({sharedSiblings.length})</span>
            </h2>
            <p className="text-[10px] text-[#5A8A7A] font-mono mb-3 leading-relaxed">
              Other campaigns funded by the same recipient address — typically the same team across multiple rounds.
            </p>
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {sharedSiblings
                .sort((a, b) => {
                  const ta = a.time ? new Date(a.time).getTime() : 0
                  const tb = b.time ? new Date(b.time).getTime() : 0
                  return tb - ta
                })
                .map(sib => {
                  const sibColor = sib.status === 'success' ? '#00FF88' : sib.status === 'expired' ? '#FF4455' : '#00E0A0'
                  return (
                    <Link
                      key={sib.id}
                      href={`/campaigns/${sib.id}`}
                      className="block py-2 px-3 transition-all text-xs font-mono"
                      style={{ background: 'rgba(0, 224, 160, 0.04)', border: '1px solid rgba(0, 224, 160, 0.08)', borderRadius: '2px' }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[#C0D0D0] truncate flex-1">{sib.title}</span>
                        <span className="flex-shrink-0" style={{ color: sibColor }}>{sib.amount.toFixed(2)} BCH</span>
                      </div>
                      <div className="flex justify-between mt-0.5 text-[10px]" style={{ color: '#5A8A7A' }}>
                        <span className="capitalize">{sib.platform}</span>
                        <span>{sib.time ? formatDate(sib.time) : '—'}</span>
                      </div>
                    </Link>
                  )
                })}
            </div>
          </div>
        )}

        {/* Links */}
        <div className="ds-panel p-6" style={{ borderTop: '1px solid rgba(0,224,160,0.15)' }}>
          <h2 className="ds-label mb-4 font-mono">Links</h2>
          <div className="space-y-3">
            {campaign.url && (
              <div>
                <span className="ds-label">Original URL</span>
                <a
                  href={campaign.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-[#00E0A0] text-sm font-mono mt-0.5 hover:text-[#00FF88] transition-colors break-all"
                  style={{ textShadow: '0 0 4px rgba(0,224,160,0.2)' }}
                >
                  {campaign.url}
                </a>
              </div>
            )}

            {campaign.archive && campaign.archive.length > 0 && (
              <div>
                <span className="ds-label">Archives</span>
                <div className="space-y-1 mt-0.5">
                  {campaign.archive.map((archiveUrl, index) => (
                    <a
                      key={index}
                      href={archiveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-[#7A9E90] text-xs font-mono hover:text-[#00FF88] transition-colors break-all"
                    >
                      {archiveUrl.includes('archive.is') ? 'Archive.is' :
                       archiveUrl.includes('web.archive.org') ? 'Wayback Machine' :
                       `Archive ${index + 1}`}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {campaign.tx && (
              <div>
                <span className="ds-label">Transaction</span>
                <a
                  href={`https://blockchair.com/bitcoin-cash/transaction/${campaign.tx}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-[#00E0A0] text-xs font-mono mt-0.5 hover:opacity-80 transition-opacity break-all"
                >
                  {campaign.tx}
                </a>
              </div>
            )}

            {campaign.announcement && campaign.announcement.length > 0 && (
              <div>
                <span className="ds-label">Announcements</span>
                <div className="space-y-1 mt-0.5">
                  {campaign.announcement.map((url, index) => (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-[#7A9E90] text-xs font-mono hover:text-[#00FF88] transition-colors break-all"
                    >
                      {url.includes('reddit.com') ? 'Reddit' : `Announcement ${index + 1}`}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
