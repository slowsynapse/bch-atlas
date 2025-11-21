import Link from 'next/link'
import type { Campaign } from '@/types/campaign'

interface CampaignCardProps {
  campaign: Campaign
}

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

function formatDate(dateString?: string): string {
  if (!dateString) return 'Unknown'

  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return 'Unknown'
  }
}

function truncateDescription(text: string | undefined, maxLength: number = 200): string {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength).trim() + '...'
}

export function CampaignCard({ campaign }: CampaignCardProps) {
  const statusColor = getStatusColor(campaign.status)

  return (
    <Link href={`/campaigns/${campaign.id}`}>
      <div className="bg-white border border-gray-200 rounded-lg hover:shadow-lg transition-shadow cursor-pointer overflow-hidden">
        <div className="flex">
          {/* Status indicator bar */}
          <div className={`w-2 ${statusColor}`}></div>

          {/* Main content */}
          <div className="flex-1 p-6">
            <div className="flex justify-between items-start gap-4">
              {/* Left side - Title and description */}
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                  {campaign.title}
                </h3>

                <p className="text-gray-600 text-sm mb-3 line-clamp-3">
                  {truncateDescription(campaign.description)}
                </p>

                {/* Meta information */}
                <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="font-medium">Platform:</span>
                    <span className="capitalize">{campaign.platform}</span>
                  </span>

                  {campaign.time && (
                    <span className="flex items-center gap-1">
                      <span className="font-medium">Date:</span>
                      <span>{formatDate(campaign.time)}</span>
                    </span>
                  )}

                  {campaign.recipientAddresses && campaign.recipientAddresses.length > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="font-medium">Recipients:</span>
                      <span>{campaign.recipientAddresses.length}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Right side - Amount and status */}
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    {campaign.amount.toFixed(2)} BCH
                  </div>
                  {campaign.raised && campaign.raised !== campaign.amount && (
                    <div className="text-sm text-gray-500">
                      of {campaign.raised.toFixed(2)} raised
                    </div>
                  )}
                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${statusColor}`}>
                  {getStatusLabel(campaign.status)}
                </span>

                {campaign.tx && (
                  <span className="text-xs text-gray-400">
                    ✓ Verified
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
