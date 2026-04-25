import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { buildBlogExcerpt, sanitizeBlogHtml, stripHtmlToText } from '@/lib/security/blog-html'
import { isAllowedBlogImageUrl } from '@/lib/security/media-urls'
import { deleteImageByUrl, deleteImagesByUrls } from '@/lib/cloudinary-server'

const PUBLIC_AUTHOR_SELECT = 'id, username, full_name, avatar_url'
const BLOG_SELECT = `*, author:profiles!author_id(${PUBLIC_AUTHOR_SELECT})`

const blogPatchSchema = z
  .object({
    title: z.string().min(5).max(150).optional(),
    content: z.string().min(50).optional(),
    excerpt: z.string().max(300).nullable().optional(),
    cover_image: z.union([z.string().url(), z.literal('')]).nullable().optional(),
    images: z.array(z.string()).max(50).optional(),
    tags: z.array(z.string()).optional(),
    field: z.string().optional(),
    community_id: z.string().uuid().nullable().optional(),
  })
  .strict()

async function getViewerRole(client: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data, error } = await client.from('profiles').select('role').eq('id', userId).maybeSingle()
  if (error) throw error
  return data?.role === 'admin' ? 'admin' : 'user'
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data: publicBlog, error: publicError } = await supabase
      .from('blogs')
      .select(BLOG_SELECT)
      .eq('id', params.id)
      .eq('moderation', 'approved')
      .maybeSingle()
    if (publicError) throw publicError
    if (publicBlog) return NextResponse.json({ data: publicBlog, error: null })

    if (!user) return NextResponse.json({ error: 'Blog not found' }, { status: 404 })

    const viewerRole = await getViewerRole(supabase, user.id)
    if (viewerRole === 'admin') {
      const admin = createAdminClient()
      const { data: adminBlog, error: adminError } = await admin
        .from('blogs')
        .select(BLOG_SELECT)
        .eq('id', params.id)
        .maybeSingle()
      if (adminError) throw adminError
      if (!adminBlog) return NextResponse.json({ error: 'Blog not found' }, { status: 404 })
      return NextResponse.json({ data: adminBlog, error: null })
    }

    const { data: ownerBlog, error: ownerError } = await supabase
      .from('blogs')
      .select(BLOG_SELECT)
      .eq('id', params.id)
      .eq('author_id', user.id)
      .maybeSingle()
    if (ownerError) throw ownerError
    if (!ownerBlog) return NextResponse.json({ error: 'Blog not found' }, { status: 404 })

    return NextResponse.json({ data: ownerBlog, error: null })
  } catch (error: any) {
    return NextResponse.json({ data: null, error: 'Failed to process blog request' }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let isAdmin = false
    let queryClient: Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient> = supabase

    let { data: existing, error: findError } = await supabase
      .from('blogs')
      .select('id, author_id')
      .eq('id', params.id)
      .eq('author_id', user.id)
      .maybeSingle()

    if (!existing) {
      const role = await getViewerRole(supabase, user.id)
      isAdmin = role === 'admin'
      if (!isAdmin) {
        return NextResponse.json({ error: 'Blog not found' }, { status: 404 })
      }

      const admin = createAdminClient()
      queryClient = admin
      const adminLookup = await admin
        .from('blogs')
        .select('id, author_id')
        .eq('id', params.id)
        .maybeSingle()
      existing = adminLookup.data
      findError = adminLookup.error
    }

    if (findError || !existing) return NextResponse.json({ error: 'Blog not found' }, { status: 404 })

    const body = await req.json()
    const parsed = blogPatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 })
    }

    const updateData: Record<string, any> = { ...parsed.data }
    if (Array.isArray(updateData.images)) {
      const invalidImage = updateData.images.find((url: string) => !isAllowedBlogImageUrl(url, user.id))
      if (invalidImage) {
        return NextResponse.json(
          { error: 'Blog images must use approved uploaded media URLs.' },
          { status: 400 }
        )
      }
    }
    if (typeof updateData.cover_image === 'string' && updateData.cover_image && !isAllowedBlogImageUrl(updateData.cover_image, user.id)) {
      return NextResponse.json(
        { error: 'Blog cover image must use an approved uploaded media URL.' },
        { status: 400 }
      )
    }
    const contentWasUpdated = typeof updateData.content === 'string'
    if (contentWasUpdated) {
      updateData.content = sanitizeBlogHtml(updateData.content)
      if (stripHtmlToText(updateData.content).length < 50) {
        return NextResponse.json({ error: 'Blog content must be at least 50 characters after sanitization.' }, { status: 400 })
      }
    }
    if (updateData.excerpt !== undefined) {
      updateData.excerpt = buildBlogExcerpt(updateData.excerpt, contentWasUpdated ? updateData.content : '')
    } else if (contentWasUpdated) {
      updateData.excerpt = buildBlogExcerpt(undefined, updateData.content)
    }

    updateData.moderation = 'pending'
    updateData.rejection_note = null
    updateData.updated_at = new Date().toISOString()

    let updateQuery = queryClient.from('blogs').update(updateData).eq('id', params.id)
    if (!isAdmin) {
      updateQuery = updateQuery.eq('author_id', user.id)
    }
    const { data, error } = await updateQuery.select().single()
    if (error) throw error

    return NextResponse.json({ data, error: null })
  } catch (error: any) {
    return NextResponse.json({ data: null, error: 'Failed to process blog request' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const role = await getViewerRole(supabase, user.id)
    const canAdmin = role === 'admin'
    const admin = canAdmin ? createAdminClient() : null
    const queryClient = canAdmin ? admin! : supabase

    // 1. Fetch blog to get images and cover image for Cloudinary cleanup
    let fetchQuery = queryClient
      .from('blogs')
      .select('id, title, author_id, cover_image, images')
      .eq('id', params.id)
    if (!canAdmin) {
      fetchQuery = fetchQuery.eq('author_id', user.id)
    }
    const { data: existing, error: findError } = await fetchQuery.maybeSingle()
    if (findError || !existing) return NextResponse.json({ error: 'Blog not found' }, { status: 404 })

    // 2. Delete images from Cloudinary permanently
    const imagesToDelete = [...(existing.images || [])]
    if (existing.cover_image) imagesToDelete.push(existing.cover_image)
    
    if (imagesToDelete.length > 0) {
      await deleteImagesByUrls(imagesToDelete)
    }

    // 3. Permanent DELETE from database
    let deleteQuery = queryClient
      .from('blogs')
      .delete()
      .eq('id', params.id)
    if (!canAdmin) {
      deleteQuery = deleteQuery.eq('author_id', user.id)
    }
    const { error: deleteError } = await deleteQuery

    if (deleteError) throw deleteError

    // 4. Notify author if admin deleted their blog
    if (canAdmin && existing.author_id !== user.id) {
      await admin!.from('notifications').insert({
        user_id: existing.author_id,
        type: 'blog_rejected',
        actor_id: user.id,
        message: `Admin permanently deleted your blog "${existing.title}".`,
        is_read: false,
      })
    }

    return NextResponse.json({ success: true, message: 'Blog and associated images permanently deleted.' })
  } catch (error: any) {
    console.error('Blog DELETE error:', error)
    return NextResponse.json({ data: null, error: 'Failed to delete blog permanently' }, { status: 500 })
  }
}

// Recovery is disabled as per user request for permanent deletion
export async function POST() {
  return NextResponse.json({ error: 'Recovery is no longer supported. Deletions are permanent.' }, { status: 405 })
}
