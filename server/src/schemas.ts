import { z } from 'zod'

// Egyptian mobile numbers: 010, 011, 012, 015 (with or without +20)
const EG_MOBILE = /^(?:\+20|0020|20|0)?(1[0125]\d{8})$/

export const phoneSchema = z
  .string()
  .transform((s) => s.replace(/[\s-]/g, ''))
  .refine((s) => EG_MOBILE.test(s), 'Please write a valid Egyptian mobile number, like 01012345678')
  .transform((s) => `0${EG_MOBILE.exec(s)![1]}`)

const referenceSchema = z
  .string()
  .trim()
  .min(4, 'The Instapay reference is too short')
  .max(40, 'The Instapay reference is too long')
  .regex(/^[A-Za-z0-9_-]+$/, 'The Instapay reference can have only letters, numbers, - and _')

const screenshotPathSchema = z
  .string()
  .trim()
  .max(200)
  .regex(/^[0-9a-f-]{36}\/[A-Za-z0-9._-]+\.(png|jpe?g|webp)$/i, 'Bad screenshot path')

export const createOrderSchema = z
  .object({
    items: z
      .array(
        z.object({
          productId: z.string().uuid(),
          sizeId: z.string().uuid().nullable().optional(),
          colorId: z.string().uuid().nullable().optional(),
          quantity: z.number().int().min(1).max(20),
        }),
      )
      .min(1, 'Your bag is empty')
      .max(30, 'You can order up to 30 different items at once.'),
    paymentMethod: z.enum(['cod', 'instapay']),
    customer: z.object({
      name: z.string().trim().min(2, 'Please write your name').max(80),
      phone: phoneSchema,
    }),
    address: z.object({
      text: z.string().trim().min(10, 'Please write your full address (at least 10 letters)').max(300),
      latitude: z.number().min(-90).max(90).nullable().optional(),
      longitude: z.number().min(-180).max(180).nullable().optional(),
    }),
    notes: z.string().trim().max(300).optional(),
    instapayReference: referenceSchema.optional(),
    screenshotPath: screenshotPathSchema.optional(),
  })
  .refine((o) => o.paymentMethod !== 'instapay' || o.instapayReference || o.screenshotPath, {
    message: 'For Instapay, add your reference number or a screenshot',
    path: ['instapayReference'],
  })

export const paymentProofSchema = z
  .object({
    instapayReference: referenceSchema.optional(),
    screenshotPath: screenshotPathSchema.optional(),
  })
  .refine((o) => o.instapayReference || o.screenshotPath, {
    message: 'Add your reference number or a screenshot',
    path: ['instapayReference'],
  })

export const rejectSchema = z.object({ note: z.string().trim().max(200).optional() })

export const statusSchema = z.object({
  status: z.enum(['confirmed', 'preparing', 'out_for_delivery', 'completed', 'cancelled']),
})

export const idParam = z.string().uuid()
