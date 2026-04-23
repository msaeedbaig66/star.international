'use client'

import { useState, useEffect } from 'react'
import { BlogCard } from '@/components/shared/blog-card'
import { toast } from 'sonner'

interface BlogFeedProps {
  initialBlogs: any[]
  category?: string
  q?: string
  tag?: string
  sort?: string
}

export function BlogFeed({
  initialBlogs,
  category,
  q,
  tag,
  sort
}: BlogFeedProps) {
  const [blogs, setBlogs] = useState<any[]>(initialBlogs || [])
  const [hasMore, setHasMore] = useState((initialBlogs || []).length >= 24)
  const [offset, setOffset] = useState((initialBlogs || []).length)
  const [isLoading, setIsLoading] = useState(false)

  // Reset when filters change
  useEffect(() => {
    setBlogs(initialBlogs || [])
    setHasMore((initialBlogs || []).length >= 24)
    setOffset((initialBlogs || []).length)
  }, [initialBlogs, category, q, tag, sort])

  const loadMore = async () => {
    if (isLoading || !hasMore) return
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (category && category !== 'All') params.set('category', category)
      if (q) params.set('q', q)
      if (tag) params.set('tag', tag)
      if (sort) params.set('sort', sort)
      params.set('offset', String(offset))
      params.set('limit', '12')

      const res = await fetch(`/api/blogs/feed?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load more blogs')
      const json = await res.json()
      const newBlogs = json?.data || []

      if (newBlogs.length < 12) setHasMore(false)

      setBlogs(prev => [...prev, ...newBlogs])
      setOffset(prev => prev + newBlogs.length)
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load more')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-7">
        {blogs.map((blog) => (
          <BlogCard key={blog.id} blog={blog} />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center pb-20">
          <button
            onClick={loadMore}
            disabled={isLoading}
            className="group relative flex items-center gap-3 px-10 py-5 bg-white border border-border rounded-[2rem] hover:border-primary/50 hover:shadow-2xl transition-all active:scale-95 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-text-primary">Loading Insights...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-primary group-hover:rotate-180 transition-transform duration-500">sync</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-text-primary">Explore More Articles</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
