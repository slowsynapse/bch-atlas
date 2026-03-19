interface Contributor {
  address: string
  name?: string
  amount?: number
}

interface ContributorsListProps {
  contributors: Contributor[]
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
}

export function ContributorsList({ contributors }: ContributorsListProps) {
  if (!contributors || contributors.length === 0) {
    return (
      <div className="text-center py-6 text-[#7A8899] text-xs">
        No recipient information available.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {contributors.map((contributor, index) => (
        <div
          key={contributor.address + index}
          className="bg-[rgba(11,14,17,0.4)] border border-[rgba(78,205,196,0.06)] p-3 hover:border-[rgba(78,205,196,0.15)] transition-colors"
        >
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1 min-w-0">
              {contributor.name && (
                <div className="text-[#E0E4E8] text-sm mb-1">{contributor.name}</div>
              )}
              <div className="flex items-center gap-2">
                <code className="text-xs text-[#8A9AAB] font-mono break-all">
                  {contributor.address}
                </code>
                <button
                  onClick={() => copyToClipboard(contributor.address)}
                  className="flex-shrink-0 text-ds-cyan-dim hover:text-ds-cyan text-xs transition-colors"
                  title="Copy"
                >
                  copy
                </button>
              </div>
            </div>

            {contributor.amount !== undefined && (
              <div className="font-mono text-sm text-ds-green flex-shrink-0">
                {contributor.amount.toFixed(4)} BCH
              </div>
            )}
          </div>

          <div className="mt-2 flex gap-3">
            <a
              href={`https://blockchair.com/bitcoin-cash/address/${contributor.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ds-cyan-dim text-[10px] font-mono hover:text-ds-cyan transition-colors tracking-wider uppercase"
            >
              Blockchair
            </a>
            <a
              href={`https://explorer.bitcoinunlimited.info/address/${contributor.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ds-cyan-dim text-[10px] font-mono hover:text-ds-cyan transition-colors tracking-wider uppercase"
            >
              BU Explorer
            </a>
          </div>
        </div>
      ))}
    </div>
  )
}
