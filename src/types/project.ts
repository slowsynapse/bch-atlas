export type ProjectStatus = 'active' | 'dormant' | 'dead' | 'unknown'

export type Continent = 'core' | 'middleware' | 'apps' | 'media' | 'defi' | 'charity' | 'ecosystem' | 'other'

export interface Project {
  slug: string
  name: string
  aliases: string[]
  description: string | null
  continent: Continent
  github: string | null
  website: string | null
  x: string | null
  telegram: string | null
  reddit: string | null
  campaignIds: string[]
  campaignMatchers: string[]
  status: ProjectStatus
  statusCheckedAt: string | null
  statusDetail: string | null
  lastGithubCommit: string | null
  websiteUp: boolean | null
  lastContentChange: string | null
  waybackCheckedAt: string | null
}

export interface ResolvedProject extends Project {
  campaigns: string[]
  totalBCH: number
  successRate: number
  timeline: CampaignTimelineEntry[]
}

export interface CampaignTimelineEntry {
  campaignId: string
  title: string
  time: string
  status: string
  amount: number
}
