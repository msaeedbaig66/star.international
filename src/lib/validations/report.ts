import { z } from 'zod'

export const reportSchema = z.object({
 target_type: z.enum(['listing', 'blog', 'community', 'comment', 'user']),
 target_id: z.string().uuid(),
 category: z.enum(['spam', 'fraudulent', 'misleading', 'inappropriate', 'harassment', 'copyright', 'other']),
 description: z.string().max(1000).optional(),
 evidence_url: z.string().url().optional().or(z.literal('')),
})

export type ReportInput = z.infer<typeof reportSchema>
