import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
 findAuthUserIdsByEmail,
 purgeAuthUsersWithCleanup,
} from '@/lib/account-deletion'

const PROFILE_SELECT =
 'id, username, full_name, avatar_url, bio, university, field_of_study, city, is_verified, follower_count, following_count, rating_avg, rating_count, created_at'

const updateProfileSchema = z
 .object({
 full_name: z.string().trim().min(1).max(120).optional(),
 avatar_url: z.string().trim().max(2048).optional(),
 bio: z.string().trim().max(1000).optional(),
 university: z.string().trim().max(200).optional(),
 field_of_study: z.string().trim().max(200).optional(),
 city: z.string().trim().max(120).optional(),
 username: z.string().trim().min(3).max(32).optional(),
 })
 .strip()

export async function GET(_req: Request, { params }: { params: { id: string } }) {

 try {
 const supabase = await createClient()
 const {
 data: { user },
 } = await supabase.auth.getUser()

 let isAdmin = false
 if (user && user.id !== params.id) {
 const { data: viewerProfile, error: viewerRoleError } = await supabase
 .from('profiles')
 .select('role')
 .eq('id', user.id)
 .maybeSingle()
 if (viewerRoleError) throw viewerRoleError
 isAdmin = viewerProfile?.role === 'admin'
 }

 let profile: Record<string, any> | null = null

 if (user?.id === params.id) {
 const { data, error } = await supabase
 .from('profiles')
 .select(PROFILE_SELECT)
 .eq('id', params.id)
 .maybeSingle()
 if (error) throw error
 profile = data
 } else if (isAdmin) {
 const admin = createAdminClient()
 const { data, error } = await admin
 .from('profiles')
 .select(PROFILE_SELECT)
 .eq('id', params.id)
 .maybeSingle()
 if (error) throw error
 profile = data
 } else {
 const { data, error } = await supabase
 .from('profiles')
 .select(PROFILE_SELECT)
 .eq('id', params.id)
 .eq('is_verified', true)
 .maybeSingle()
 if (error) throw error
 profile = data
 }

 if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 })

 return NextResponse.json({
 data: {
 ...profile,
 follower_count: Number(profile.follower_count || 0),
 following_count: Number(profile.following_count || 0),
 rating_count: Number(profile.rating_count || 0),
 rating_avg: Number(profile.rating_avg || 0),
 },
 error: null,
 })
 } catch (error: any) {
 return NextResponse.json({ data: null, error: 'Failed to process user request' }, { status: 500 })
 }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {

 try {
 const supabase = await createClient()
 const {
 data: { user },
 } = await supabase.auth.getUser()
 if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 if (user.id !== params.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

 const body = await req.json().catch(() => ({}))
 const parsed = updateProfileSchema.safeParse(body)
 if (!parsed.success) {
 return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 })
 }

 const updateData = { ...parsed.data, updated_at: new Date().toISOString() }
 const hasUpdatableField = Object.keys(parsed.data).length > 0
 if (!hasUpdatableField) {
 return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 })
 }

 const { data, error } = await supabase
 .from('profiles')
 .update(updateData)
 .eq('id', params.id)
 .select()
 .single()

 if (error) throw error
 return NextResponse.json({ data, error: null })
 } catch (error: any) {
 return NextResponse.json({ data: null, error: 'Failed to process user request' }, { status: 500 })
 }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {

 try {
 const supabase = await createClient()
 const {
 data: { user },
 } = await supabase.auth.getUser()
 if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 if (user.id !== params.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

 const admin = createAdminClient()
 const idsToDelete = new Set<string>([user.id])

 const accountEmail = (user.email || '').trim().toLowerCase()
 if (accountEmail) {
 const relatedIds = await findAuthUserIdsByEmail(admin, accountEmail)
 relatedIds.forEach((id) => idsToDelete.add(id))
 }

 await purgeAuthUsersWithCleanup(admin, Array.from(idsToDelete), {
 profileEmail: accountEmail || null,
 })

 return NextResponse.json({ success: true, error: null })
 } catch (error: any) {
 return NextResponse.json({ data: null, error: 'Failed to process user request' }, { status: 500 })
 }
}
