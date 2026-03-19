import Link from 'next/link'
import type { Campaign } from '@/types/campaign'

interface CampaignCardProps {
  campaign: Campaign
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'success': return 'FUNDED'
    case 'expired':
    case 'failed': return 'EXPIRED'
    case 'running': return 'ACTIVE'
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

function getStatusBorderColor(status: string): string {
  switch (status) {
    case 'success': return 'rgba(0, 255, 136, 0.6)'
    case 'expired':
    case 'failed': return 'rgba(255, 68, 85, 0.5)'
    case 'running': return 'rgba(0, 224, 160, 0.6)'
    default: return 'rgba(122, 144, 144, 0.3)'
  }
}

function getStatusTint(status: string): string {
  switch (status) {
    case 'success': return 'rgba(0, 255, 136, 0.06)'
    case 'expired':
    case 'failed': return 'rgba(255, 68, 85, 0.04)'
    case 'running': return 'rgba(0, 224, 160, 0.06)'
    default: return 'rgba(0, 180, 140, 0.03)'
  }
}

function formatDate(dateString?: string): string {
  if (!dateString) return '—'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return '—'
  }
}

function truncateDescription(text: string | undefined, maxLength: number = 160): string {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength).trim() + '…'
}

export function CampaignCard({ campaign }: CampaignCardProps) {
  return (
    <Link href={`/campaigns/${campaign.id}`}>
      <div
        className="cursor-pointer overflow-hidden transition-all duration-300"
        style={{
          /* Teal-tinted panel background — glows from within like Astral Chain menus */
          background: `linear-gradient(135deg, ${getStatusTint(campaign.status)}, rgba(0, 180, 140, 0.06), rgba(10, 18, 22, 0.88))`,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(0, 224, 160, 0.15)',
          borderLeft: `3px solid ${getStatusBorderColor(campaign.status)}`,
          borderRadius: '2px',
          boxShadow: `inset 0 1px 0 rgba(0, 224, 160, 0.1), inset 0 0 40px rgba(0, 180, 140, 0.03), 0 2px 10px rgba(0, 0, 0, 0.3)`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'rgba(0, 224, 160, 0.35)'
          e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(0, 224, 160, 0.15), inset 0 0 50px rgba(0, 180, 140, 0.06), 0 0 25px rgba(0, 224, 160, 0.08), 0 4px 15px rgba(0, 0, 0, 0.3)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(0, 224, 160, 0.15)'
          e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(0, 224, 160, 0.1), inset 0 0 40px rgba(0, 180, 140, 0.03), 0 2px 10px rgba(0, 0, 0, 0.3)'
        }}
      >
        {/* Top edge glow */}
        <div style={{
          height: '1px',
          background: 'linear-gradient(90deg, transparent 5%, rgba(0, 224, 160, 0.3) 30%, rgba(0, 224, 160, 0.4) 50%, rgba(0, 224, 160, 0.3) 70%, transparent 95%)',
        }} />

        <div className="p-5">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-[#EEF2F4] mb-1.5 line-clamp-2 leading-snug">
                {campaign.title}
              </h3>

              {campaign.description && (
                <p className="text-[#90A8A8] text-xs mb-3 line-clamp-2 font-light leading-relaxed">
                  {truncateDescription(campaign.description)}
                </p>
              )}

              <div className="flex flex-wrap gap-3 text-[11px] text-[#6A8888] font-mono">
                <span className="uppercase tracking-wider">{campaign.platform}</span>
                <span>{formatDate(campaign.time)}</span>
                {campaign.recipientAddresses && campaign.recipientAddresses.length > 0 && (
                  <span>{campaign.recipientAddresses.length} addr</span>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <div className="font-mono text-lg font-medium" style={{ color: '#00FF88' }}>
                {campaign.amount.toFixed(2)}
                <span className="text-[11px] text-[#6A8888] ml-1">BCH</span>
              </div>

              <span className={`font-mono text-[10px] tracking-[0.15em] uppercase ${getStatusTextColor(campaign.status)}`}>
                {getStatusLabel(campaign.status)}
              </span>

              {campaign.tx && (
                <span className="text-[10px] font-mono tracking-wider uppercase" style={{ color: '#00A878' }}>
                  ✓ on-chain
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
