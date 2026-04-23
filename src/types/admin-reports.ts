import type { ListingStatus, ModerationStatus, Report } from '@/types/database'

export interface ProfileBrief {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
}

export interface ListingReportTarget {
  id: string
  title: string | null
  seller_id: string | null
  moderation: ModerationStatus | null
  status: ListingStatus | null
  rejection_note: string | null
}

export interface BlogReportTarget {
  id: string
  title: string | null
  author_id: string | null
  moderation: ModerationStatus | null
  rejection_note: string | null
}

export interface CommunityReportTarget {
  id: string
  name: string | null
  owner_id: string | null
  moderation: ModerationStatus | null
  rejection_note: string | null
}

export type ReportTargetRecord = ListingReportTarget | BlogReportTarget | CommunityReportTarget

export interface ReportView extends Report {
  reporter: ProfileBrief | null
  owner: ProfileBrief | null
  target: ReportTargetRecord | null
  target_title: string
}

export interface ReportStats {
  open: number
  reviewing: number
  resolved: number
  total: number
}
