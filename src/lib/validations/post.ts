import { z } from 'zod'

export const postSchema = z.object({
 community_id: z.string().uuid(),
 title: z.string().min(3).max(150),
 content: z.string().min(10),
 is_question: z.boolean().optional().default(false),
 is_anonymous: z.boolean().optional().default(false),
 image_url: z.string().url().optional().nullable(),
 file_url: z.string().url().optional().nullable(),
})

export type PostInput = z.infer<typeof postSchema>
