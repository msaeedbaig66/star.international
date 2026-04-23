import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { BlogCard } from '@/components/shared/blog-card'
import { EmptyState } from '@/components/shared/empty-state'
import { NetflixRow, NetflixCard } from '@/components/shared/netflix-row'
import { Button } from '@/components/ui/button'
import type { Blog, Profile } from '@/types/database'
import { sortFeaturedFirst } from '@/lib/featured-content'

export const revalidate = 60

type BlogWithAuthor = Blog & { author?: Pick<Profile, 'username' | 'avatar_url' | 'full_name'> }
const HOME_BLOG_SELECT = `
 id,
 author_id,
 title,
 excerpt,
 cover_image,
 field,
 moderation,
 like_count,
 comment_count,
 view_count,
 created_at,
 updated_at,
 is_featured,
 featured_until,
 author:profiles!blogs_author_id_fkey(username, avatar_url, full_name)
`

export async function RecentBlogs() {
 const supabase = await createClient()
 const { data: blogs } = await supabase
 .from('blogs')
 .select(HOME_BLOG_SELECT)
 .eq('moderation', 'approved')
 .order('is_featured', { ascending: false })
 .order('featured_until', { ascending: false })
 .order('created_at', { ascending: false })
 .limit(20)

 const items: BlogWithAuthor[] = sortFeaturedFirst((blogs || []).map((b: Record<string, unknown>) => ({
 ...b,
 author: Array.isArray(b.author) ? b.author[0] : b.author,
 })) as BlogWithAuthor[])

 if (items.length === 0) {
 return (
 <section className='py-6'>
 <h2 className='text-xl font-bold text-text-primary flex items-center gap-2 mb-4 px-1'>
 <span className='text-2xl'>📝</span> Recent Project Blogs
 </h2>
 <EmptyState
 title='No blogs yet'
 description='Share your first project!'
 action={
 <Link href='/dashboard'>
 <Button variant='primary' size='sm'>Create Blog</Button>
 </Link>
 }
 />
 </section>
 )
 }

 const cards = items.map((blog) => (
 <NetflixCard key={blog.id}>
 <BlogCard blog={blog} />
 </NetflixCard>
 ))

 return (
 <NetflixRow
 title="Recent Blogs"
 icon="📝"
 seeAllContent={cards}
 showExpandToggle={false}
 >
 {cards}
 </NetflixRow>
 )
}
