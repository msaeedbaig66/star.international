import { z } from 'zod'

export const ratingSchema = z.object({
 subject_id: z.string().uuid(),
 listing_id: z.string().uuid().optional().nullable(),
 score: z.number().min(1).max(5),
})

export type RatingInput = z.infer<typeof ratingSchema>
