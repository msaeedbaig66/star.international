import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { deleteImagesByUrls } from '@/lib/cloudinary-server'

export const dynamic = 'force-dynamic'

/**
 * Maintenance Cron Job - Aggressive Space Management
 * Includes Cloudinary media cleanup for all deleted content
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    cleaned_notifications: 0,
    cleaned_listings: 0,
    cleaned_messages: 0,
    cleaned_blogs: 0,
    cleaned_community_posts: 0,
    media_purged_count: 0,
  }

  try {
    const tenDaysAgo = new Date()
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10)
    
    const fifteenDaysAgo = new Date()
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15)

    const sixtyDaysAgo = new Date()
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

    // 1. Cleanup notifications
    const { count: notifyCount } = await supabase
      .from('notifications')
      .delete({ count: 'exact' })
      .lt('created_at', tenDaysAgo.toISOString())
    results.cleaned_notifications = notifyCount || 0

    // 2. Cleanup listings + Media
    const { data: listingsToPurge } = await supabase
      .from('listings')
      .delete()
      .lt('updated_at', fifteenDaysAgo.toISOString())
      .in('status', ['sold', 'removed'])
      .select('images')
    
    if (listingsToPurge && listingsToPurge.length > 0) {
      const listingImages = listingsToPurge.flatMap(l => l.images || [])
      await deleteImagesByUrls(listingImages)
      results.cleaned_listings = listingsToPurge.length
      results.media_purged_count += listingImages.length
    }

    // 3. Cleanup messages + Media (Older than 60 days)
    const { data: messagesToPurge } = await supabase
      .from('messages')
      .delete()
      .lt('created_at', sixtyDaysAgo.toISOString())
      .select('attachment_url')
    
    if (messagesToPurge && messagesToPurge.length > 0) {
      const messageImages = messagesToPurge.map(m => m.attachment_url).filter(Boolean) as string[]
      if (messageImages.length > 0) {
        await deleteImagesByUrls(messageImages)
        results.media_purged_count += messageImages.length
      }
      results.cleaned_messages = messagesToPurge.length
    }

    // 4. Cleanup old community posts + Media (Older than 60 days)
    const { data: postsToPurge } = await supabase
      .from('posts')
      .delete()
      .lt('created_at', sixtyDaysAgo.toISOString())
      .select('image_url, file_url')
    
    if (postsToPurge && postsToPurge.length > 0) {
      const postImages = postsToPurge.flatMap(p => [p.image_url, p.file_url].filter(Boolean) as string[])
      if (postImages.length > 0) {
        await deleteImagesByUrls(postImages)
        results.media_purged_count += postImages.length
      }
      results.cleaned_community_posts = postsToPurge.length
    }

    // 5. Cleanup rejected blogs + Media
    const { data: blogsToPurge } = await supabase
      .from('blogs')
      .delete()
      .or(`moderation.eq.rejected,status.eq.removed`)
      .lt('updated_at', fifteenDaysAgo.toISOString())
      .select('cover_image, images')
    
    if (blogsToPurge && blogsToPurge.length > 0) {
      const blogImages = blogsToPurge.flatMap(b => [...(b.images || []), b.cover_image].filter(Boolean) as string[])
      if (blogImages.length > 0) {
        await deleteImagesByUrls(blogImages)
        results.media_purged_count += blogImages.length
      }
      results.cleaned_blogs = blogsToPurge.length
    }

    return NextResponse.json(results)
  } catch (error: any) {
    console.error('Maintenance Cron Exception:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
