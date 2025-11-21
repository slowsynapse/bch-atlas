interface Contributor {
  address: string
  name?: string
  amount?: number
}

interface ContributorsListProps {
  contributors: Contributor[]
}

function truncateAddress(address: string): string {
  if (address.length <= 20) return address
  return `${address.slice(0, 20)}...${address.slice(-8)}`
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
}

export function ContributorsList({ contributors }: ContributorsListProps) {
  if (!contributors || contributors.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No contributor information available for this campaign.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {contributors.map((contributor, index) => (
        <div
          key={contributor.address + index}
          className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 transition-colors"
        >
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1 min-w-0">
              {contributor.name && (
                <div className="font-semibold text-gray-900 mb-1">
                  {contributor.name}
                </div>
              )}
              <div className="flex items-center gap-2">
                <code className="text-sm text-gray-600 font-mono break-all">
                  {contributor.address}
                </code>
                <button
                  onClick={() => copyToClipboard(contributor.address)}
                  className="flex-shrink-0 text-blue-600 hover:text-blue-700 text-xs"
                  title="Copy address"
                >
                  📋
                </button>
              </div>
            </div>

            {contributor.amount !== undefined && (
              <div className="text-right flex-shrink-0">
                <div className="text-sm font-semibold text-green-600">
                  {contributor.amount.toFixed(4)} BCH
                </div>
              </div>
            )}
          </div>

          {/* Links to explorer */}
          <div className="mt-2 flex gap-3 text-xs">
            <a
              href={`https://blockchair.com/bitcoin-cash/address/${contributor.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 underline"
            >
              View on Blockchair →
            </a>
            <a
              href={`https://explorer.bitcoinunlimited.info/address/${contributor.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 underline"
            >
              View on BU Explorer →
            </a>
          </div>
        </div>
      ))}
    </div>
  )
}
