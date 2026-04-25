import type { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

/**
 * Extracts storage metadata from a Supabase Storage URL.
 * URL format: https://[project-id].supabase.co/storage/v1/object/public/[bucket]/[path]
 */
function parseSupabaseStorageUrl(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl)
    const segments = parsed.pathname.split('/').filter(Boolean)
    const publicIndex = segments.indexOf('public')
    
    if (publicIndex === -1 || segments.length <= publicIndex + 2) return null

    const bucket = segments[publicIndex + 1]
    const path = segments.slice(publicIndex + 2).join('/')
    
    return { bucket, path }
  } catch {
    return null
  }
}

/**
 * Deletes files from Supabase storage by their public URLs.
 */
export async function deleteSupabaseStorageUrls(admin: AdminClient, urls: string[]) {
  if (!admin || !urls || urls.length === 0) return

  // Group by bucket to minimize requests
  const groupedByBucket: Record<string, string[]> = {}

  for (const url of urls) {
    const meta = parseSupabaseStorageUrl(url)
    if (meta) {
      if (!groupedByBucket[meta.bucket]) groupedByBucket[meta.bucket] = []
      groupedByBucket[meta.bucket].push(meta.path)
    }
  }

  const results = await Promise.all(
    Object.entries(groupedByBucket).map(async ([bucket, paths]) => {
      if (paths.length === 0) return null
      return admin.storage.from(bucket).remove(paths)
    })
  )

  return results
}
