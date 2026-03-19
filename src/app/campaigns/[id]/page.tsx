import Link from 'next/link'
import { getCampaignById } from '@/lib/data/campaigns'
import { ContributorsList } from '@/components/campaigns/ContributorsList'
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

export default function CampaignDetailPage({ params }: { params: { id: string } }) {
  const campaign = getCampaignById(params.id)

  if (!campaign) {
    notFound()
  }

  const contributors = (campaign.recipientAddresses || []).map(address => ({ address }))
  const goalAmount = campaign.amount
  const raisedAmount = campaign.raised || campaign.amount
  const progressPercent = (raisedAmount / goalAmount) * 100

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
            <span
              className={`ds-label text-xs flex-shrink-0 font-mono tracking-[0.15em] ${getStatusColor(campaign.status)}`}
              style={{ textShadow: getStatusGlow(campaign.status) }}
            >
              {getStatusLabel(campaign.status)}
            </span>
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-[#7A8899] mb-6">
            <span className="font-mono capitalize tracking-wider uppercase">{campaign.platform}</span>
            {campaign.time && (
              <span className="font-mono">{formatDate(campaign.time)}</span>
            )}
            {campaign.tx && (
              <span className="text-[#00E0A0] font-mono tracking-wider">Verified</span>
            )}
          </div>

          {/* Funding */}
          <div className="mb-6">
            <div className="flex justify-between items-end mb-3">
              <div>
                <div
                  className="font-mono text-3xl"
                  style={{ color: '#00FF88', textShadow: '0 0 20px rgba(0,255,136,0.3)' }}
                >
                  {goalAmount.toFixed(2)} <span className="text-sm text-[#7A8899]">BCH</span>
                </div>
                <span className="ds-label">Goal</span>
              </div>
              {campaign.status === 'success' && (
                <div className="text-right">
                  <div className="font-mono text-lg text-[#E0E4E8]">{progressPercent.toFixed(0)}%</div>
                  <span className="ds-label">Funded</span>
                </div>
              )}
            </div>

            {campaign.status === 'success' && (
              <div className="w-full h-1.5 bg-[rgba(0,224,160,0.08)] overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(progressPercent, 100)}%`,
                    background: 'linear-gradient(90deg, #00E0A0, #00FF88)',
                    boxShadow: '0 0 12px rgba(0,255,136,0.4)',
                  }}
                />
              </div>
            )}
          </div>

          {/* Description */}
          {campaign.description && (
            <div>
              <h2 className="ds-label mb-3">Description</h2>
              <p className="text-[#8A9AAB] text-sm font-light whitespace-pre-wrap leading-relaxed">{campaign.description}</p>
            </div>
          )}
        </div>

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
