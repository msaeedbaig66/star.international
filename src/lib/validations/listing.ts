import { z } from 'zod'

const listingTypeSchema = z.enum(['sell', 'rent', 'both', 'free', 'request'])
const rentalPeriodSchema = z.enum(['day', 'week', 'month', 'semester'])
const contactPreferenceSchema = z.enum(['chat', 'phone'])

export const baseListingSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(2000),
  price: z.number().min(0),
  category: z.string(),
  condition: z.enum(['new', 'like_new', 'good', 'fair', 'poor']),
  campus: z.string(),
  images: z.array(z.string().url()).min(1).max(4),
  listing_type: listingTypeSchema.default('sell'),
  rental_price: z.number().min(0).nullable().optional(),
  rental_period: rentalPeriodSchema.nullable().optional(),
  rental_deposit: z.number().min(0).nullable().optional(),
  contact_preference: contactPreferenceSchema.default('chat'),
  is_official: z.boolean().optional().default(false),
})

export const listingSchema = baseListingSchema.superRefine((data, ctx) => {
  if (data.listing_type === 'rent' || data.listing_type === 'both') {
    if (!Number.isFinite(Number(data.rental_price)) || Number(data.rental_price) <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['rental_price'],
        message: 'Rental price is required when listing is for rent.',
      })
    }
    if (!data.rental_period) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['rental_period'],
        message: 'Rental period is required when listing is for rent.',
      })
    }
  }
})

export type ListingInput = z.infer<typeof listingSchema>
