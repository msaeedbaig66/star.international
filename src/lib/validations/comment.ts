import { z } from 'zod'

export const commentSchema = z.object({
  content: z.string().min(1).max(500),
  listing_id: z.string().uuid().optional().nullable(),
  blog_id: z.string().uuid().optional().nullable(),
  post_id: z.string().uuid().optional().nullable(),
  parent_id: z.string().uuid().optional().nullable(),
  is_anonymous: z.boolean().optional().default(false),
}).refine(data => {
  return (data.listing_id || data.blog_id || data.post_id)
}, {
  message: "Exactly one of listing_id, blog_id, or post_id is required."
})

export type CommentInput = z.infer<typeof commentSchema>
