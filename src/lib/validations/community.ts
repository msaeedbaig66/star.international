import { z } from 'zod'

export const communitySchema = z.object({
 name: z.string().min(3).max(100),
 description: z.string().max(1000).optional(),
 type: z.enum(['field', 'project']),
 field: z.string().optional(),
 avatar_url: z.string().url().optional().or(z.literal('')),
 banner_url: z.string().url().optional().or(z.literal('')),
 rules: z.string().max(2000).optional(),
})

export type CommunityInput = z.infer<typeof communitySchema>
