import { z } from 'zod'

export const blogSchema = z.object({
 title: z.string().min(5).max(150),
 content: z.string().min(50),
 excerpt: z.string().max(300).optional().nullable(),
 cover_image: z.union([z.string().url(), z.literal('')]).optional().nullable(),
 images: z.array(z.string().url()).max(5).optional().default([]),
 tags: z.array(z.string()).optional().default([]),
 field: z.string().optional(),
 community_id: z.string().uuid().optional().nullable(),
})

export type BlogInput = z.infer<typeof blogSchema>
