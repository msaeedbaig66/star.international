import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const postIdSchema = z.string().uuid()
const patchSchema = z.object({
 is_completed: z.boolean().optional(),
})

export async function PATCH(req: Request, { params }: { params: { id: string } }) {

 try {
 const parsedPostId = postIdSchema.safeParse(params.id)
 if (!parsedPostId.success) {
 return NextResponse.json({ error: 'Validation failed', details: parsedPostId.error.format() }, { status: 400 })
 }
 const postId = parsedPostId.data

 const body = await req.json()
 const parsedBody = patchSchema.safeParse(body)
 if (!parsedBody.success) {
 return NextResponse.json({ error: 'Validation failed', details: parsedBody.error.format() }, { status: 400 })
 }

 const supabase = await createClient()
 const { data: { user } } = await supabase.auth.getUser()
 if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

 // Check permissions
 const { data: viewerProfile } = await supabase
 .from('profiles')
 .select('role')
 .eq('id', user.id)
 .maybeSingle()

 const admin = createAdminClient()
 const queryClient = admin || supabase
 const { data: post } = await queryClient
 .from('posts')
 .select('id, community_id')
 .eq('id', postId)
 .maybeSingle()

 if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

 let canUpdate = viewerProfile?.role === 'admin'

 if (!canUpdate && post.community_id) {
 const { data: community } = await queryClient
 .from('communities')
 .select('owner_id')
 .eq('id', post.community_id)
 .single()
 canUpdate = community?.owner_id === user.id
 }

 if (!canUpdate) return NextResponse.json({ error: 'Permission denied' }, { status: 403 })

 const { error: updateError } = await queryClient
 .from('posts')
 .update({ 
 ...parsedBody.data,
 updated_at: new Date().toISOString()
 })
 .eq('id', postId)

 if (updateError) throw updateError

 return NextResponse.json({ success: true })
 } catch (error: any) {
 return NextResponse.json({ error: 'Failed to update post' }, { status: 500 })
 }
}

function extractStoragePath(url: string | null | undefined) {
 if (!url) return null
 try {
 const parts = url.split('/posts/')
 if (parts.length > 1) return parts[parts.length - 1]
 return null
 } catch {
 return null
 }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {

 try {
 const parsedPostId = postIdSchema.safeParse(params.id)
 if (!parsedPostId.success) {
 return NextResponse.json({ error: 'Validation failed', details: parsedPostId.error.format() }, { status: 400 })
 }
 const postId = parsedPostId.data

 const supabase = await createClient()
 const { data: { user } } = await supabase.auth.getUser()
 if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

 // Fetch post details first to check permissions and get attachment URLs
 const admin = createAdminClient()
 const queryClient = admin || supabase
 const { data: post, error: findError } = await queryClient
 .from('posts')
 .select('id, author_id, community_id, image_url, file_url')
 .eq('id', postId)
 .maybeSingle()
 
 if (findError || !post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

 // Check permissions
 let canDelete = post.author_id === user.id

 if (!canDelete) {
 const { data: viewerProfile } = await supabase
 .from('profiles')
 .select('role')
 .eq('id', user.id)
 .maybeSingle()
 
 if (viewerProfile?.role === 'admin') {
 canDelete = true
 } else if (post.community_id) {
 const { data: community } = await queryClient
 .from('communities')
 .select('owner_id')
 .eq('id', post.community_id)
 .maybeSingle()
 canDelete = community?.owner_id === user.id
 }
 }

 if (!canDelete) return NextResponse.json({ error: 'Permission denied' }, { status: 403 })

 // 1. Delete attachments from storage if they exist
 const imagePath = extractStoragePath(post.image_url)
 const filePath = extractStoragePath(post.file_url)
 const pathsToDelete = [imagePath, filePath].filter(Boolean) as string[]

 if (pathsToDelete.length > 0) {
 const storageClient = admin || supabase
 await storageClient.storage
 .from('posts')
 .remove(pathsToDelete)
 }

 // 2. Delete database record
 const { error: deleteError } = await queryClient
 .from('posts')
 .delete()
 .eq('id', postId)

 if (deleteError) throw deleteError

 return NextResponse.json({ success: true, error: null })
 } catch (error: any) {
 console.error('Delete error:', error)
 return NextResponse.json({ data: null, error: 'Failed to process post deletion' }, { status: 500 })
 }
}
