export type ModerationStatus = 'pending' | 'approved' | 'rejected'
export type ItemCondition = 'new' | 'like_new' | 'good' | 'fair' | 'poor'
export type ListingStatus = 'available' | 'reserved' | 'sold' | 'removed'
export type ListingType = 'sell' | 'rent' | 'both'
export type RentalPeriod = 'day' | 'week' | 'month' | 'semester'
export type NotificationType = 'follow' | 'like' | 'comment' | 'reply' |
 'message' | 'listing_approved' | 'listing_rejected' |
 'blog_approved' | 'blog_rejected' | 'community_approved' |
 'community_rejected' | 'comment_approved' | 'report_received' |
 'blog_update' | 'community_update'
export type CommunityType = 'field' | 'project'
export type UserRole = 'user' | 'admin' | 'moderator' | 'subadmin'
export type ReportCategory = 'spam' | 'fraudulent' | 'misleading' |
 'inappropriate' | 'harassment' | 'copyright' | 'other'
export type ReportTarget = 'listing' | 'blog' | 'community' | 'comment' | 'user'

export interface Profile {
 id: string
 username: string
 first_name?: string | null
 last_name?: string | null
 full_name: string
 email: string
 phone?: string | null
 phone_number?: string | null
 avatar_url: string | null
 cover_url: string | null
 bio: string | null
 university: string | null
 field_of_study: string | null
 sector_type_id?: string | null
 institution_id?: string | null
 department_id?: string | null
 city: string | null
 role: UserRole
 is_verified: boolean
 is_banned: boolean
 follower_count: number
 following_count: number
 listing_slot_limit: number
 community_slot_limit: number
 blog_slot_limit: number
 blog_image_limit: number
 rating_avg: number
 rating_count: number
 created_at: string
 updated_at: string
}

export type PublicProfile = Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'>

export interface Listing {
 id: string
 seller_id: string
 title: string
 description: string
 price: number
 listing_type?: ListingType
 rental_price?: number | null
 rental_period?: RentalPeriod | null
 rental_deposit?: number | null
 contact_preference?: 'chat' | 'phone' | null
 condition: ItemCondition
 category: string
 campus: string | null
 images: string[]
 status: ListingStatus
 moderation: ModerationStatus
 rejection_note: string | null
 view_count: number
 created_at: string
 updated_at: string
 is_featured?: boolean
 featured_until?: string | null
 featured_by?: string | null
 featured_note?: string | null
 is_official?: boolean
}

export interface Blog {
 id: string
 author_id: string
 title: string
 slug: string
 content: string
 excerpt: string | null
 cover_image: string | null
 images: string[]
 tags: string[]
 field: string | null
 community_id: string | null
 moderation: ModerationStatus
 rejection_note: string | null
 like_count: number
 comment_count: number
 view_count: number
 created_at: string
 updated_at: string
 is_featured?: boolean
 featured_until?: string | null
 featured_by?: string | null
 featured_note?: string | null
}

export interface Community {
 id: string
 owner_id: string
 name: string
 slug: string
 description: string | null
 type: CommunityType
 field: string | null
 avatar_url: string | null
 banner_url: string | null
 rules: string | null
 member_count: number
 post_count: number
 is_official: boolean
 moderation: ModerationStatus
 rejection_note: string | null
 created_at: string
 updated_at: string
 is_featured?: boolean
 featured_until?: string | null
 featured_by?: string | null
 featured_note?: string | null
}

export interface CommunityMember {
 id: string
 community_id: string
 user_id: string
 role: string
 joined_at: string
}

export interface Post {
 id: string
 community_id: string
 author_id: string
 title: string
 content: string
 is_question: boolean
 is_pinned: boolean
 moderation: ModerationStatus
 rejection_note: string | null
 like_count: number
 reply_count: number
 is_anonymous: boolean
 created_at: string
 updated_at: string
}

export interface Comment {
 id: string
 author_id: string
 content: string
 parent_id: string | null
 listing_id: string | null
 blog_id: string | null
 post_id: string | null
 moderation: ModerationStatus
 rejection_note: string | null
 like_count: number
 is_anonymous: boolean
 created_at: string
 updated_at: string
}

export interface MessageThread {
 id: string
 listing_id: string | null
 created_at: string
 updated_at: string
}

export interface Message {
 id: string
 thread_id: string
 sender_id: string | null
 content: string
 is_read: boolean
 is_anonymous: boolean
 created_at: string
}

export interface Notification {
 id: string
 user_id: string
 type: NotificationType
 actor_id: string | null
 listing_id: string | null
 blog_id: string | null
 community_id: string | null
 post_id: string | null
 comment_id: string | null
 message: string | null
 is_read: boolean
 created_at: string
}

export interface Report {
 id: string
 reporter_id: string
 target_type: ReportTarget
 target_id: string
 category: ReportCategory
 description: string | null
 evidence_url: string | null
 status: 'open' | 'reviewing' | 'resolved' | 'dismissed'
 resolved_by: string | null
 resolved_at: string | null
 created_at: string
}

export interface Rating {
 id: string
 reviewer_id: string
 subject_id: string
 listing_id: string | null
 score: number
 review_text: string | null
 created_at: string
}

export interface Advertisement {
 id: string
 title: string
 image_url: string
 link_url: string | null
 is_active: boolean
 display_order: number
 meta: any
 created_at: string
}

export interface SectorType {
 id: string
 name: string
 is_active: boolean
 sort_order: number
 created_at: string
 updated_at: string
}

export interface Institution {
 id: string
 sector_type_id: string
 name: string
 city: string | null
 province_or_region: string | null
 is_active: boolean
 sort_order: number
 created_at: string
 updated_at: string
}

export interface Department {
 id: string
 institution_id: string
 name: string
 is_active: boolean
 sort_order: number
 created_at: string
 updated_at: string
}

export interface SlotRequest {
 id: string
 user_id: string
 request_type: 'listing' | 'community' | 'blog' | 'blog_image'
 current_limit: number
 requested_limit: number
 additional_slots: number
 reason: string
 status: 'pending' | 'approved' | 'rejected'
 admin_note: string | null
 reviewed_by: string | null
 reviewed_at: string | null
 created_at: string
 updated_at: string
}

export type Database = any
