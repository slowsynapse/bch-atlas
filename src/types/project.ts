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
  // Cohort/program membership (e.g. "bch-1" hackcelerator). Optional —
  // most projects don't belong to a cohort. A project can be in multiple
  // cohorts simultaneously (e.g. ["bch-1", "cashtokens-grants-2027"]).
  // The parent cohort entry itself (e.g. bch-1-hackcelerator) does NOT
  // self-reference here — only members do.
  cohorts?: string[]
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
