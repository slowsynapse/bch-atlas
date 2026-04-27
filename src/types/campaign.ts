export interface Campaign {
  id: string
  platform: 'flipstarter' | 'fundme'

  // Basic info
  title: string
  description?: string
  category?: string[]
  continent?: string            // Mapped category group: core, middleware, apps, media, defi, charity, ecosystem, other

  // Financial
  amount: number                // Goal in BCH (or raised, for FundMe where goal is unknown)
  goal?: number                 // Explicit goal when known separately from amount
  raised?: number               // Actual raised (if available)
  goalSource?: 'api' | 'description' | 'contract'  // How the goal was determined
  status: 'success' | 'expired' | 'running' | 'unknown'

  // Timeline
  time: string                  // ISO date string

  // Links
  url: string
  archive?: string[]
  announcement?: string[]
  tx?: string                   // Transaction hash

  // Extracted entities
  entities: string[]            // Parsed entity names

  // Blockchain data (from Chaingraph)
  recipientAddresses?: string[]     // BCH addresses that received funds
  blockHeight?: number | string     // Block height of transaction
  transactionTimestamp?: string     // Unix timestamp

  // Historical pricing
  usdValueAtTime?: number           // Goal in USD at historical BCH price
  priceSource?: 'hyperliquid' | 'coingecko' | 'binance' | 'estimated'
  priceDate?: string                // ISO date used for price lookup
}

export interface Entity {
  name: string
  campaigns: string[]           // Campaign IDs
  totalBCH: number
  successRate: number
  aliases: string[]             // Alternative names
}

export interface GraphNode {
  data: {
    id: string
    label: string
    type: 'campaign' | 'entity' | 'recipient' | 'project'
    value: number           // For sizing
    metadata: any
  }
}

export interface GraphEdge {
  data: {
    id: string
    source: string
    target: string
    type: 'created' | 'related' | 'received' | 'same-entity' | 'shared-address' | 'project-member'
    weight: number
  }
}

// Raw data from flipstarters.json
export interface FlipstarterRaw {
  amount: number
  archive?: string[]
  category?: string[]
  title: string
  description?: string
  status: string
  time: string
  tx?: string | null
  url: string
  announcement?: string[]
}
