import { CATEGORIES } from '@/lib/constants'

const LISTING_CATEGORIES = new Set([
 'listings',
 ...CATEGORIES.map((value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-')),
])
const BLOG_CATEGORIES = new Set(['blogs'])
const COMMUNITY_CATEGORIES = new Set(['communities', 'avatars', 'banners'])
const POST_CATEGORIES = new Set(['posts', 'community-posts', 'community_posts'])
const SUPPORTED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'pdf', 'doc', 'docx'])
const UUID_V4_OR_V1_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SEGMENT_SAFE_REGEX = /^[a-z0-9._-]+$/i

function getAllowedStorageHost() {
 const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
 if (!supabaseUrl) return null
 try {
 return new URL(supabaseUrl).hostname.toLowerCase()
 } catch {
 return null
 }
}

function isTrustedStorageHostname(hostname: string, allowedHost: string) {
 const normalizedHost = hostname.toLowerCase()
 const normalizedAllowed = allowedHost.toLowerCase()
 return normalizedHost === normalizedAllowed || normalizedHost.endsWith(`.${normalizedAllowed}`)
}

interface StorageMetadata {
 ownerId: string
 category: string
 filename: string
}

function getStorageMetadataFromUrl(rawUrl: string): StorageMetadata | null {
 const allowedHost = getAllowedStorageHost()
 if (!allowedHost) return null

 try {
 const parsed = new URL(rawUrl)
 const isLocal = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'
 if (!isLocal && parsed.protocol !== 'https:') return null
 if (!isTrustedStorageHostname(parsed.hostname, allowedHost)) return null

 const segments = parsed.pathname.split('/').filter(Boolean).map((segment) => segment.trim())
 const publicIndex = segments.indexOf('public')
 if (publicIndex === -1 || segments.length <= publicIndex + 2) return null

 const foundBucket = segments[publicIndex + 1]
 const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'allpanga'
 
 // Allow the main bucket OR the legacy blog-covers bucket
 if (foundBucket !== bucket && foundBucket !== 'blog-covers') return null

 let ownerId, category, filename

 if (foundBucket === 'blog-covers') {
 // Legacy structure: blog-covers/OWNER-TIME.jpg OR blog-covers/UUID/blogs/FILE
 if (segments.length === publicIndex + 3) {
 ownerId = segments[publicIndex + 2].split('-')[0] // Approximation
 category = 'blogs'
 filename = segments[publicIndex + 2]
 } else {
 ownerId = segments[publicIndex + 2]
 category = segments[publicIndex + 3]?.toLowerCase()
 filename = segments[publicIndex + 4] || segments[publicIndex + 3]
 }
 } else {
 // Standard structure: BUCKET/OWNER/CATEGORY/FILENAME
 ownerId = segments[publicIndex + 2]
 category = segments[publicIndex + 3]?.toLowerCase()
 filename = segments[publicIndex + 4]
 }

 if (!ownerId || !filename) return null

 return { 
 ownerId, 
 category: category || 'others', 
 filename: filename || '' 
 }
 } catch {
 return null
 }
}

export function isAllowedListingImageUrl(rawUrl: string, userId?: string) {
 // Always permit all media in local development to ensure a smooth creative experience
 if (process.env.NODE_ENV === 'development' && !userId) return true

 const meta = getStorageMetadataFromUrl(rawUrl)
 if (!meta) {
 try {
 const u = new URL(rawUrl)
 const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dukmwqsnn'
      if (u.hostname === 'res.cloudinary.com' && u.pathname.startsWith(`/${cloudName}/`)) {
 if (userId && !rawUrl.includes(`/${userId}/`)) return false
 return true
 }
 } catch {
 return false
 }
 return false
 }

 if (userId && meta.ownerId !== userId) return false
 return LISTING_CATEGORIES.has(meta.category)
}

export function isAllowedBlogImageUrl(rawUrl: string, userId?: string) {
 if (process.env.NODE_ENV === 'development' && !userId) return true

 const meta = getStorageMetadataFromUrl(rawUrl)
 if (!meta) {
 try {
 const u = new URL(rawUrl)
 const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dukmwqsnn'
      if (u.hostname === 'res.cloudinary.com' && u.pathname.startsWith(`/${cloudName}/`)) {
 if (userId && !rawUrl.includes(`/${userId}/`)) return false
 return true
 }
 } catch {
 return false
 }
 return false
 }

 if (userId && meta.ownerId !== userId) return false
 return BLOG_CATEGORIES.has(meta.category)
}

export function isAllowedCommunityImageUrl(rawUrl: string, userId?: string) {
 if (process.env.NODE_ENV === 'development' && !userId) return true

 const meta = getStorageMetadataFromUrl(rawUrl)
 if (!meta) {
 try {
 const u = new URL(rawUrl)
 const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dukmwqsnn'
      if (u.hostname === 'res.cloudinary.com' && u.pathname.startsWith(`/${cloudName}/`)) {
 if (userId && !rawUrl.includes(`/${userId}/`)) return false
 return true
 }
 } catch {
 return false
 }
 return false
 }

 if (userId && meta.ownerId !== userId) return false
 return COMMUNITY_CATEGORIES.has(meta.category)
}

export function isAllowedPostImageUrl(rawUrl: string, userId?: string) {
 if (process.env.NODE_ENV === 'development' && !userId) return true

 const meta = getStorageMetadataFromUrl(rawUrl)
 if (!meta) {
 try {
 const u = new URL(rawUrl)
 const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dukmwqsnn'
      if (u.hostname === 'res.cloudinary.com' && u.pathname.startsWith(`/${cloudName}/`)) {
 if (userId && !rawUrl.includes(`/${userId}/`)) return false
 return true
 }
 } catch {
 return false
 }
 return false
 }

 if (userId && meta.ownerId !== userId) return false
 return POST_CATEGORIES.has(meta.category)
}

