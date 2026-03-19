import Link from 'next/link'
import { getCampaignById } from '@/lib/data/campaigns'
import { ContributorsList } from '@/components/campaigns/ContributorsList'
import { notFound } from 'next/navigation'

function getStatusColor(status: string): string {
  switch (status) {
    case 'success': return 'text-ds-green'
    case 'expired':
    case 'failed': return 'text-ds-red'
    case 'running': return 'text-ds-cyan'
    default: return 'text-[#7A8899]'
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
      <header className="ds-holographic border-0 border-b border-[rgba(78,205,196,0.08)]">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <Link href="/" className="text-lg font-light tracking-[0.15em] uppercase text-ds-cyan hover:opacity-80 transition-opacity">
                BCH ATLAS
              </Link>
              <p className="ds-label mt-0.5">Campaign Detail</p>
            </div>
            <div className="flex gap-3">
              <Link href="/campaigns" className="px-4 py-1.5 border border-[rgba(78,205,196,0.12)] text-[#7A8899] text-xs tracking-[0.08em] uppercase hover:border-[rgba(78,205,196,0.25)] hover:text-[#E0E4E8] transition-all">
                Back
              </Link>
              <Link href="/graph" className="px-4 py-1.5 border border-[rgba(78,205,196,0.12)] text-[#7A8899] text-xs tracking-[0.08em] uppercase hover:border-[rgba(78,205,196,0.25)] hover:text-[#E0E4E8] transition-all">
                Graph
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Campaign Header */}
        <div className="ds-holographic p-8 mb-6">
          <div className="flex justify-between items-start gap-4 mb-6">
            <h1 className="text-xl md:text-2xl font-light text-[#E0E4E8]">{campaign.title}</h1>
            <span className={`ds-label text-xs flex-shrink-0 ${getStatusColor(campaign.status)}`}>
              {getStatusLabel(campaign.status)}
            </span>
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-[#7A8899] mb-6">
            <span className="font-mono capitalize tracking-wider uppercase">{campaign.platform}</span>
            {campaign.time && (
              <span className="font-mono">{formatDate(campaign.time)}</span>
            )}
            {campaign.tx && (
              <span className="text-ds-cyan font-mono tracking-wider">Verified</span>
            )}
          </div>

          {/* Funding */}
          <div className="mb-6">
            <div className="flex justify-between items-end mb-3">
              <div>
                <div
                  className="font-mono text-3xl"
                  style={{ color: '#56E89C', textShadow: '0 0 20px rgba(86, 232, 156, 0.2)' }}
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
              <div className="w-full h-1 bg-[rgba(11,14,17,0.5)] overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(progressPercent, 100)}%`,
                    background: 'linear-gradient(90deg, #2A9D8F, #56E89C)',
                    boxShadow: '0 0 10px rgba(86, 232, 156, 0.3)',
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
          <div className="ds-holographic p-6 mb-6">
            <h2 className="ds-label mb-4">Timeline</h2>
            <div className="space-y-3">
              {campaign.time && (
                <div>
                  <span className="ds-label">Completion</span>
                  <p className="text-[#E0E4E8] text-sm font-mono mt-0.5">{formatDate(campaign.time)}</p>
                </div>
              )}
              {campaign.transactionTimestamp && (
                <>
                  <div>
                    <span className="ds-label">Funded</span>
                    <p className="text-[#E0E4E8] text-sm font-mono mt-0.5">{formatDate(undefined, Number(campaign.transactionTimestamp))}</p>
                  </div>
                  <div>
                    <span className="ds-label">Time Since</span>
                    <p className="text-ds-cyan text-sm font-mono mt-0.5">{getTimeSince(undefined, Number(campaign.transactionTimestamp))}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Recipients */}
        <div className="ds-holographic p-6 mb-6">
          <h2 className="ds-label mb-4">
            Recipients {contributors.length > 0 && <span className="text-ds-cyan font-mono">({contributors.length})</span>}
          </h2>
          <ContributorsList contributors={contributors} />
        </div>

        {/* Links */}
        <div className="ds-holographic p-6">
          <h2 className="ds-label mb-4">Links</h2>
          <div className="space-y-3">
            {campaign.url && (
              <div>
                <span className="ds-label">Original URL</span>
                <a
                  href={campaign.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-ds-cyan text-sm font-mono mt-0.5 hover:opacity-80 transition-opacity break-all"
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
                      className="block text-ds-cyan-dim text-xs font-mono hover:text-ds-cyan transition-colors break-all"
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
                  className="block text-ds-cyan text-xs font-mono mt-0.5 hover:opacity-80 transition-opacity break-all"
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
                      className="block text-ds-cyan-dim text-xs font-mono hover:text-ds-cyan transition-colors break-all"
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
