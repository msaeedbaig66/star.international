import { z } from 'zod'

export const signupSchema = z.object({
 first_name: z.string().trim().min(1, 'First name is required').max(60, 'First name must be at most 60 characters'),
 last_name: z.string().trim().min(1, 'Last name is required').max(60, 'Last name must be at most 60 characters'),
 email: z.string().email('Please enter a valid email address'),
 phone_number: z.string()
 .trim()
 .max(30, 'Phone number must be at most 30 characters')
 .optional()
 .or(z.literal(''))
 .refine((value) => !value || /^[+0-9][0-9\\s-]{6,29}$/.test(value), {
 message: 'Please enter a valid phone number',
 }),
 sector_type_id: z.string().uuid('Please select a valid sector type'),
 institution_id: z.string().uuid('Please select a valid institution'),
 department_id: z.string().uuid('Please select a valid department'),
 password: z.string()
 .min(8,'Password must be at least 8 characters')
 .regex(/[A-Z]/,'Password must contain at least one uppercase letter')
 .regex(/[0-9]/,'Password must contain at least one number'),
 confirm_password: z.string(),
 terms: z.boolean().refine(v => v === true,'You must agree to the Terms and Conditions'),
}).refine(d => d.password === d.confirm_password, {
 message: 'Passwords do not match',
 path: ['confirm_password'],
})

export const loginSchema = z.object({
 email: z.string().email('Please enter a valid email address'),
 password: z.string().min(1,'Password is required'),
 remember_me: z.boolean().optional(),
})

export const forgotPasswordSchema = z.object({
 email: z.string().email('Please enter a valid email address'),
})

export const resetPasswordSchema = z.object({
 password: z.string()
 .min(8,'Password must be at least 8 characters')
 .regex(/[A-Z]/,'Password must contain at least one uppercase letter')
 .regex(/[0-9]/,'Password must contain at least one number'),
 confirm_password: z.string(),
}).refine(d => d.password === d.confirm_password, {
 message: 'Passwords do not match',
 path: ['confirm_password'],
})

export type SignupInput = z.infer<typeof signupSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
