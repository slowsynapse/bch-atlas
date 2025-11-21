import Link from 'next/link'
import { getCampaignById, getCampaigns } from '@/lib/data/campaigns'
import { ContributorsList } from '@/components/campaigns/ContributorsList'
import { notFound } from 'next/navigation'

function getStatusColor(status: string): string {
  switch (status) {
    case 'success':
      return 'bg-green-500'
    case 'expired':
    case 'failed':
      return 'bg-red-500'
    case 'running':
      return 'bg-blue-500'
    default:
      return 'bg-gray-500'
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'success':
      return 'SUCCESS'
    case 'expired':
    case 'failed':
      return 'FAILED'
    case 'running':
      return 'RUNNING'
    default:
      return status.toUpperCase()
  }
}

function formatDate(dateString?: string, timestamp?: number): string {
  if (timestamp) {
    const date = new Date(timestamp * 1000)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!dateString) return 'Unknown'

  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
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

  const statusColor = getStatusColor(campaign.status)
  const contributors = (campaign.recipientAddresses || []).map(address => ({ address }))

  // Calculate funding progress
  const goalAmount = campaign.amount
  const raisedAmount = campaign.raised || campaign.amount
  const progressPercent = (raisedAmount / goalAmount) * 100

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <Link href="/" className="text-2xl font-bold text-blue-600 hover:text-blue-700">
                BCH ATLAS
              </Link>
              <p className="text-sm text-gray-600">Campaign Details</p>
            </div>
            <div className="flex gap-4">
              <Link
                href="/campaigns"
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
              >
                ← Back to List
              </Link>
              <Link
                href="/graph"
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
              >
                View in Graph
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Campaign Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6">
          <div className="flex justify-between items-start gap-4 mb-4">
            <h1 className="text-3xl font-bold text-gray-900">{campaign.title}</h1>
            <span className={`px-4 py-2 rounded-full text-sm font-semibold text-white ${statusColor}`}>
              {getStatusLabel(campaign.status)}
            </span>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-6">
            <span className="flex items-center gap-1">
              <span className="font-semibold">Platform:</span>
              <span className="capitalize">{campaign.platform}</span>
            </span>

            {campaign.time && (
              <span className="flex items-center gap-1">
                <span className="font-semibold">Date:</span>
                <span>{formatDate(campaign.time)}</span>
              </span>
            )}

            {campaign.tx && (
              <span className="flex items-center gap-1 text-green-600">
                <span>✓</span>
                <span className="font-semibold">Blockchain Verified</span>
              </span>
            )}
          </div>

          {/* Funding Progress */}
          <div className="mb-6">
            <div className="flex justify-between items-end mb-2">
              <div>
                <div className="text-3xl font-bold text-green-600">{goalAmount.toFixed(2)} BCH</div>
                <div className="text-sm text-gray-600">Goal Amount</div>
              </div>
              {campaign.status === 'success' && (
                <div className="text-right">
                  <div className="text-xl font-semibold text-gray-900">{progressPercent.toFixed(0)}%</div>
                  <div className="text-sm text-gray-600">Funded</div>
                </div>
              )}
            </div>

            {campaign.status === 'success' && (
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div
                  className="bg-green-500 h-full transition-all"
                  style={{ width: `${Math.min(progressPercent, 100)}%` }}
                />
              </div>
            )}
          </div>

          {/* Description */}
          {campaign.description && (
            <div className="prose max-w-none">
              <h2 className="text-xl font-semibold mb-3">Description</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{campaign.description}</p>
            </div>
          )}
        </div>

        {/* Timeline */}
        {(campaign.time || (campaign as any).transactionTimestamp) && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Timeline</h2>
            <div className="space-y-3">
              {campaign.time && (
                <div>
                  <div className="text-sm text-gray-600">Completion Date</div>
                  <div className="font-medium">{formatDate(campaign.time)}</div>
                </div>
              )}

              {(campaign as any).transactionTimestamp && (
                <>
                  <div>
                    <div className="text-sm text-gray-600">Funded On</div>
                    <div className="font-medium">{formatDate(undefined, (campaign as any).transactionTimestamp)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Time Since Funded</div>
                    <div className="font-medium text-blue-600">{getTimeSince(undefined, (campaign as any).transactionTimestamp)}</div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Contributors/Recipients */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            Recipients {contributors.length > 0 && `(${contributors.length})`}
          </h2>
          <ContributorsList contributors={contributors} />
        </div>

        {/* Links */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Links & Resources</h2>
          <div className="space-y-3">
            {campaign.url && (
              <div>
                <div className="text-sm text-gray-600 mb-1">Original Campaign URL</div>
                <a
                  href={campaign.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 underline break-all"
                >
                  {campaign.url}
                </a>
              </div>
            )}

            {campaign.archive && campaign.archive.length > 0 && (
              <div>
                <div className="text-sm text-gray-600 mb-1">Archived Snapshots</div>
                <div className="space-y-1">
                  {campaign.archive.map((archiveUrl, index) => (
                    <a
                      key={index}
                      href={archiveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-blue-600 hover:text-blue-700 underline text-sm break-all"
                    >
                      {archiveUrl.includes('archive.is') ? 'Archive.is' :
                       archiveUrl.includes('web.archive.org') ? 'Wayback Machine' :
                       `Archive ${index + 1}`} →
                    </a>
                  ))}
                </div>
              </div>
            )}

            {campaign.tx && (
              <div>
                <div className="text-sm text-gray-600 mb-1">Blockchain Transaction</div>
                <a
                  href={`https://blockchair.com/bitcoin-cash/transaction/${campaign.tx}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 underline break-all text-sm"
                >
                  {campaign.tx} →
                </a>
              </div>
            )}

            {campaign.announcement && campaign.announcement.length > 0 && (
              <div>
                <div className="text-sm text-gray-600 mb-1">Announcements</div>
                <div className="space-y-1">
                  {campaign.announcement.map((announcementUrl, index) => (
                    <a
                      key={index}
                      href={announcementUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-blue-600 hover:text-blue-700 underline text-sm break-all"
                    >
                      {announcementUrl.includes('reddit.com') ? 'Reddit' : `Announcement ${index + 1}`} →
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
