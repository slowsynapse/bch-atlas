export interface Campaign {
  id: string
  platform: 'flipstarter' | 'fundme'

  // Basic info
  title: string
  description?: string
  category?: string[]

  // Financial
  amount: number                // Goal in BCH
  raised?: number               // Actual raised (if available)
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
    type: 'campaign' | 'entity' | 'recipient'
    value: number           // For sizing
    metadata: any
  }
}

export interface GraphEdge {
  data: {
    id: string
    source: string
    target: string
    type: 'created' | 'related' | 'received'
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
