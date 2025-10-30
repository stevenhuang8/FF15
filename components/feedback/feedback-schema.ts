import { z } from 'zod'

export const feedbackTypes = ['bug', 'feature', 'complaint', 'general'] as const

export const feedbackSchema = z.object({
  feedbackType: z.enum(feedbackTypes, {
    message: 'Please select a feedback type',
  }),
  description: z
    .string()
    .min(10, 'Please provide at least 10 characters')
    .max(2000, 'Description must be less than 2000 characters'),
  email: z
    .string()
    .email('Please enter a valid email address')
    .optional()
    .or(z.literal('')),
  file: z
    .instanceof(File)
    .refine((file) => file.size <= 5 * 1024 * 1024, 'File size must be less than 5MB')
    .refine(
      (file) => ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'].includes(file.type),
      'Only image files (JPEG, PNG, GIF, WebP, HEIC) are allowed'
    )
    .optional()
    .nullable(),
})

export type FeedbackFormData = z.infer<typeof feedbackSchema>
