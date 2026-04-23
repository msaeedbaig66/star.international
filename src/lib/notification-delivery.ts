import { createAdminClient } from '@/lib/supabase/admin'

type NotifyParams = {
 actorId: string
 authorId: string
 type: 'blog_update' | 'community_update'
 message: string
 blogId?: string | null
 communityId?: string | null
 postId?: string | null
 isAnonymous?: boolean
}

export async function deliverTargetedNotifications(params: NotifyParams) {
 const admin = createAdminClient()
 if (!admin) {
 console.warn('deliverTargetedNotifications: Skipping due to missing admin client.')
 return { delivered: 0 }
 }
 const { 
 actorId, 
 authorId, 
 type, 
 message, 
 blogId = null, 
 communityId = null, 
 postId = null,
 isAnonymous = false 
 } = params

 const [{ data: globalFollowers }, { data: targetFollowers }] = await Promise.all([
 admin
 .from('follows')
 .select('follower_id')
 .eq('following_id', authorId),
 blogId
 ? admin.from('blog_follows').select('follower_id').eq('blog_id', blogId)
 : communityId
 ? admin.from('community_follows').select('follower_id').eq('community_id', communityId)
 : Promise.resolve({ data: [] as Array<{ follower_id: string }> })
 ])

 const targetFollowerSet = new Set((targetFollowers || []).map((r: any) => r.follower_id as string))
 const sourceMap = new Map<string, { target: boolean; global: boolean }>()

 for (const row of globalFollowers || []) {
 const uid = (row as any).follower_id as string
 if (!uid || uid === actorId) continue
 sourceMap.set(uid, { target: sourceMap.get(uid)?.target || false, global: true })
 }

 for (const row of targetFollowers || []) {
 const uid = (row as any).follower_id as string
 if (!uid || uid === actorId) continue
 sourceMap.set(uid, { target: true, global: sourceMap.get(uid)?.global || false })
 }

 const candidateIds = Array.from(sourceMap.keys())
 if (!candidateIds.length) return { delivered: 0 }

 const muteClauses: string[] = [`and(target_type.eq.profile,target_id.eq.${authorId})`]
 if (blogId) muteClauses.push(`and(target_type.eq.blog,target_id.eq.${blogId})`)
 if (communityId) muteClauses.push(`and(target_type.eq.community,target_id.eq.${communityId})`)

 const { data: muteRows } = await admin
 .from('notification_mutes')
 .select('user_id,target_type,target_id')
 .in('user_id', candidateIds)
 .or(muteClauses.join(','))

 const profileMuted = new Set<string>()
 const targetMuted = new Set<string>()

 for (const mute of muteRows || []) {
 const uid = (mute as any).user_id as string
 const targetType = (mute as any).target_type as string

 if (targetType === 'profile') profileMuted.add(uid)
 if (blogId && targetType === 'blog') targetMuted.add(uid)
 if (communityId && targetType === 'community') targetMuted.add(uid)
 }

 const recipients: string[] = []
 for (const uid of candidateIds) {
 const source = sourceMap.get(uid)
 if (!source) continue

 if (targetMuted.has(uid)) continue
 if (!source.target && profileMuted.has(uid)) continue

 recipients.push(uid)
 }

 if (!recipients.length) return { delivered: 0 }

 const rows = recipients.map((userId) => ({
 user_id: userId,
 actor_id: actorId,
 type,
 message,
 blog_id: blogId,
 community_id: communityId,
 post_id: postId,
 is_anonymous: isAnonymous
 }))

 const { error } = await admin.from('notifications').insert(rows)
 if (error) {
 console.error('deliverTargetedNotifications insert failed', error)
 return { delivered: 0 }
 }

 return { delivered: rows.length }
}
