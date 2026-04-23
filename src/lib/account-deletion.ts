import type { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

type FollowRow = { follower_id?: string | null; following_id?: string | null }
type RatingRow = { score?: number | string | null; subject_id?: string | null }
type CommunityRow = { community_id?: string | null }
type LikeRow = { blog_id?: string | null; post_id?: string | null; comment_id?: string | null }
type CommentRow = { blog_id?: string | null; post_id?: string | null }

export type AccountDeletionImpact = {
  followProfileIds: Set<string>
  ratingSubjectIds: Set<string>
  communityMemberIds: Set<string>
  communityPostIds: Set<string>
  blogLikeIds: Set<string>
  blogCommentIds: Set<string>
  postLikeIds: Set<string>
  postReplyIds: Set<string>
  commentLikeIds: Set<string>
}

function addMaybe(set: Set<string>, value: string | null | undefined) {
  if (value) set.add(value)
}

export function createEmptyAccountDeletionImpact(): AccountDeletionImpact {
  return {
    followProfileIds: new Set<string>(),
    ratingSubjectIds: new Set<string>(),
    communityMemberIds: new Set<string>(),
    communityPostIds: new Set<string>(),
    blogLikeIds: new Set<string>(),
    blogCommentIds: new Set<string>(),
    postLikeIds: new Set<string>(),
    postReplyIds: new Set<string>(),
    commentLikeIds: new Set<string>(),
  }
}

export function mergeAccountDeletionImpact(
  target: AccountDeletionImpact,
  source: AccountDeletionImpact
) {
  source.followProfileIds.forEach((id) => target.followProfileIds.add(id))
  source.ratingSubjectIds.forEach((id) => target.ratingSubjectIds.add(id))
  source.communityMemberIds.forEach((id) => target.communityMemberIds.add(id))
  source.communityPostIds.forEach((id) => target.communityPostIds.add(id))
  source.blogLikeIds.forEach((id) => target.blogLikeIds.add(id))
  source.blogCommentIds.forEach((id) => target.blogCommentIds.add(id))
  source.postLikeIds.forEach((id) => target.postLikeIds.add(id))
  source.postReplyIds.forEach((id) => target.postReplyIds.add(id))
  source.commentLikeIds.forEach((id) => target.commentLikeIds.add(id))
}

export async function findAuthUserIdsByEmail(admin: AdminClient, email: string) {
  if (!admin) throw new Error('Admin client not initialized')
  const normalized = email.trim().toLowerCase()
  if (!normalized) return [] as string[]

  const found: string[] = []
  const perPage = 200
  const maxPages = 100

  for (let page = 1; page <= maxPages; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw error

    const users = data?.users || []
    for (const user of users) {
      if ((user.email || '').toLowerCase() === normalized) {
        found.push(user.id)
      }
    }

    if (users.length < perPage) break
  }

  return found
}

export async function collectAccountDeletionImpact(
  admin: AdminClient,
  userId: string
): Promise<AccountDeletionImpact> {
  if (!admin) throw new Error('Admin client not initialized')
  const impact = createEmptyAccountDeletionImpact()

  const [
    followsResult,
    ratingsResult,
    communityMembersResult,
    authoredPostsResult,
    likesResult,
    commentsResult,
  ] = await Promise.all([
    admin
      .from('follows')
      .select('follower_id, following_id')
      .or(`follower_id.eq.${userId},following_id.eq.${userId}`),
    admin
      .from('ratings')
      .select('subject_id')
      .eq('reviewer_id', userId),
    admin
      .from('community_members')
      .select('community_id')
      .eq('user_id', userId),
    admin
      .from('posts')
      .select('community_id')
      .eq('author_id', userId),
    admin
      .from('likes')
      .select('blog_id, post_id, comment_id')
      .eq('user_id', userId),
    admin
      .from('comments')
      .select('blog_id, post_id')
      .eq('author_id', userId),
  ])

  if (followsResult.error) throw followsResult.error
  if (ratingsResult.error) throw ratingsResult.error
  if (communityMembersResult.error) throw communityMembersResult.error
  if (authoredPostsResult.error) throw authoredPostsResult.error
  if (likesResult.error) throw likesResult.error
  if (commentsResult.error) throw commentsResult.error

  for (const row of (followsResult.data || []) as FollowRow[]) {
    const followerId = row.follower_id || null
    const followingId = row.following_id || null
    if (followerId === userId) addMaybe(impact.followProfileIds, followingId)
    if (followingId === userId) addMaybe(impact.followProfileIds, followerId)
  }

  for (const row of (ratingsResult.data || []) as RatingRow[]) {
    addMaybe(impact.ratingSubjectIds, row.subject_id || null)
  }

  for (const row of (communityMembersResult.data || []) as CommunityRow[]) {
    addMaybe(impact.communityMemberIds, row.community_id || null)
  }

  for (const row of (authoredPostsResult.data || []) as CommunityRow[]) {
    addMaybe(impact.communityPostIds, row.community_id || null)
  }

  for (const row of (likesResult.data || []) as LikeRow[]) {
    addMaybe(impact.blogLikeIds, row.blog_id || null)
    addMaybe(impact.postLikeIds, row.post_id || null)
    addMaybe(impact.commentLikeIds, row.comment_id || null)
  }

  for (const row of (commentsResult.data || []) as CommentRow[]) {
    addMaybe(impact.blogCommentIds, row.blog_id || null)
    addMaybe(impact.postReplyIds, row.post_id || null)
  }

  return impact
}

async function updateProfileFollowCounts(admin: AdminClient, profileId: string) {
  if (!admin) return
  const [followingResult, followerResult] = await Promise.all([
    admin
      .from('follows')
      .select('following_id', { count: 'exact', head: true })
      .eq('follower_id', profileId),
    admin
      .from('follows')
      .select('follower_id', { count: 'exact', head: true })
      .eq('following_id', profileId),
  ])
  if (followingResult.error) throw followingResult.error
  if (followerResult.error) throw followerResult.error

  const { error } = await admin
    .from('profiles')
    .update({
      following_count: followingResult.count || 0,
      follower_count: followerResult.count || 0,
    })
    .eq('id', profileId)

  if (error) throw error
}

async function updateProfileRatingCounts(admin: AdminClient, profileId: string) {
  if (!admin) return
  const { data, error } = await admin
    .from('ratings')
    .select('score')
    .eq('subject_id', profileId)
  if (error) throw error

  const scores = (data || []) as RatingRow[]
  const ratingCount = scores.length
  const ratingAvg =
    ratingCount > 0
      ? Number(
          (
            scores.reduce((sum, row) => sum + Number(row.score || 0), 0) / ratingCount
          ).toFixed(2)
        )
      : 0

  const { error: updateError } = await admin
    .from('profiles')
    .update({
      rating_count: ratingCount,
      rating_avg: ratingAvg,
    })
    .eq('id', profileId)

  if (updateError) throw updateError
}

async function updateCommunityMemberCount(admin: AdminClient, communityId: string) {
  if (!admin) return
  const { count, error } = await admin
    .from('community_members')
    .select('user_id', { count: 'exact', head: true })
    .eq('community_id', communityId)
  if (error) throw error

  const { error: updateError } = await admin
    .from('communities')
    .update({ member_count: count || 0 })
    .eq('id', communityId)

  if (updateError) throw updateError
}

async function updateCommunityPostCount(admin: AdminClient, communityId: string) {
  if (!admin) return
  const { count, error } = await admin
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('community_id', communityId)
    .eq('moderation', 'approved')
  if (error) throw error

  const { error: updateError } = await admin
    .from('communities')
    .update({ post_count: count || 0 })
    .eq('id', communityId)

  if (updateError) throw updateError
}

async function updateBlogLikeCount(admin: AdminClient, blogId: string) {
  if (!admin) return
  const { count, error } = await admin
    .from('likes')
    .select('id', { count: 'exact', head: true })
    .eq('blog_id', blogId)
  if (error) throw error

  const { error: updateError } = await admin
    .from('blogs')
    .update({ like_count: count || 0 })
    .eq('id', blogId)

  if (updateError) throw updateError
}

async function updateBlogCommentCount(admin: AdminClient, blogId: string) {
  if (!admin) return
  const { count, error } = await admin
    .from('comments')
    .select('id', { count: 'exact', head: true })
    .eq('blog_id', blogId)
    .eq('moderation', 'approved')
  if (error) throw error

  const { error: updateError } = await admin
    .from('blogs')
    .update({ comment_count: count || 0 })
    .eq('id', blogId)

  if (updateError) throw updateError
}

async function updatePostLikeCount(admin: AdminClient, postId: string) {
  if (!admin) return
  const { count, error } = await admin
    .from('likes')
    .select('id', { count: 'exact', head: true })
    .eq('post_id', postId)
  if (error) throw error

  const { error: updateError } = await admin
    .from('posts')
    .update({ like_count: count || 0 })
    .eq('id', postId)

  if (updateError) throw updateError
}

async function updatePostReplyCount(admin: AdminClient, postId: string) {
  if (!admin) return
  const { count, error } = await admin
    .from('comments')
    .select('id', { count: 'exact', head: true })
    .eq('post_id', postId)
    .eq('moderation', 'approved')
  if (error) throw error

  const { error: updateError } = await admin
    .from('posts')
    .update({ reply_count: count || 0 })
    .eq('id', postId)

  if (updateError) throw updateError
}

async function updateCommentLikeCount(admin: AdminClient, commentId: string) {
  if (!admin) return
  const { count, error } = await admin
    .from('likes')
    .select('id', { count: 'exact', head: true })
    .eq('comment_id', commentId)
  if (error) throw error

  const { error: updateError } = await admin
    .from('comments')
    .update({ like_count: count || 0 })
    .eq('id', commentId)

  if (updateError) throw updateError
}

export async function repairAccountDeletionImpact(
  admin: AdminClient,
  impact: AccountDeletionImpact
) {
  if (!admin) return
  await Promise.all(
    Array.from(impact.followProfileIds).map((profileId) => updateProfileFollowCounts(admin, profileId))
  )

  await Promise.all(
    Array.from(impact.ratingSubjectIds).map((profileId) => updateProfileRatingCounts(admin, profileId))
  )

  await Promise.all(
    Array.from(impact.communityMemberIds).map((communityId) =>
      updateCommunityMemberCount(admin, communityId)
    )
  )

  await Promise.all(
    Array.from(impact.communityPostIds).map((communityId) =>
      updateCommunityPostCount(admin, communityId)
    )
  )

  await Promise.all(
    Array.from(impact.blogLikeIds).map((blogId) => updateBlogLikeCount(admin, blogId))
  )

  await Promise.all(
    Array.from(impact.blogCommentIds).map((blogId) => updateBlogCommentCount(admin, blogId))
  )

  await Promise.all(
    Array.from(impact.postLikeIds).map((postId) => updatePostLikeCount(admin, postId))
  )

  await Promise.all(
    Array.from(impact.postReplyIds).map((postId) => updatePostReplyCount(admin, postId))
  )

  await Promise.all(
    Array.from(impact.commentLikeIds).map((commentId) => updateCommentLikeCount(admin, commentId))
  )
}

export async function purgeAuthUsersWithCleanup(
  admin: AdminClient,
  userIds: string[],
  options?: { profileEmail?: string | null }
) {
  if (!admin) throw new Error('Admin client not initialized')
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)))
  const impact = createEmptyAccountDeletionImpact()

  for (const userId of uniqueIds) {
    const currentImpact = await collectAccountDeletionImpact(admin, userId)
    mergeAccountDeletionImpact(impact, currentImpact)
  }

  for (const userId of uniqueIds) {
    const { error: authDeleteError } = await admin.auth.admin.deleteUser(userId, false)
    if (authDeleteError && !/not found/i.test(authDeleteError.message || '')) {
      throw authDeleteError
    }
  }

  if (uniqueIds.length > 0) {
    const { error: profileDeleteError } = await admin
      .from('profiles')
      .delete()
      .in('id', uniqueIds)
    if (profileDeleteError) throw profileDeleteError
  }

  const normalizedEmail = (options?.profileEmail || '').trim().toLowerCase()
  if (normalizedEmail) {
    const { error: profileEmailDeleteError } = await admin
      .from('profiles')
      .delete()
      .eq('email', normalizedEmail)
    if (profileEmailDeleteError) throw profileEmailDeleteError
  }

  await repairAccountDeletionImpact(admin, impact)

  return { deletedAuthUsers: uniqueIds.length }
}
