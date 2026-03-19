import Link from 'next/link'
import type { Campaign } from '@/types/campaign'

interface CampaignCardProps {
  campaign: Campaign
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

function getStatusTextColor(status: string): string {
  switch (status) {
    case 'success': return 'text-ds-green'
    case 'expired':
    case 'failed': return 'text-ds-red'
    case 'running': return 'text-ds-cyan'
    default: return 'text-ds-text-secondary'
  }
}

function formatDate(dateString?: string): string {
  if (!dateString) return 'Unknown'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
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
  const borderColor = campaign.status === 'success' ? 'border-l-ds-green' :
    campaign.status === 'expired' ? 'border-l-ds-red' :
    campaign.status === 'running' ? 'border-l-ds-cyan' : 'border-l-ds-text-secondary'

  return (
    <Link href={`/campaigns/${campaign.id}`}>
      <div className={`ds-panel ds-glow border-l-2 ${borderColor} cursor-pointer overflow-hidden`}>
        <div className="p-5">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-ds-text mb-1.5 line-clamp-2">
                {campaign.title}
              </h3>

              <p className="text-ds-text-secondary text-xs mb-3 line-clamp-2 font-light">
                {truncateDescription(campaign.description)}
              </p>

              <div className="flex flex-wrap gap-3 text-xs text-ds-text-secondary">
                <span className="font-mono">{campaign.platform}</span>
                {campaign.time && (
                  <span className="font-mono">{formatDate(campaign.time)}</span>
                )}
                {campaign.recipientAddresses && campaign.recipientAddresses.length > 0 && (
                  <span className="font-mono">{campaign.recipientAddresses.length} recipients</span>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <div className="font-mono text-lg text-ds-green">
                {campaign.amount.toFixed(2)} <span className="text-xs text-ds-text-secondary">BCH</span>
              </div>

              <span className={`ds-label text-[10px] ${getStatusTextColor(campaign.status)}`}>
                {getStatusLabel(campaign.status)}
              </span>

              {campaign.tx && (
                <span className="text-[10px] text-ds-cyan-dim font-mono">verified</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
