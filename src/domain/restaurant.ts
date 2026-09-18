import { z } from 'zod'
import { plainTextSchema, slugSchema, uuidSchema } from './common'

export const restaurantStatusSchema = z.enum(['draft', 'active', 'suspended'])
export type RestaurantStatus = z.infer<typeof restaurantStatusSchema>

export const createRestaurantSchema = z.object({
  slug: slugSchema,
  name: plainTextSchema(120, 2),
  description: plainTextSchema(500).optional(),
})
export type CreateRestaurantInput = z.infer<typeof createRestaurantSchema>

export const updateRestaurantProfileSchema = z.object({
  restaurantId: uuidSchema,
  name: plainTextSchema(120, 2),
  description: plainTextSchema(500).optional(),
  contact: z
    .object({
      phone: plainTextSchema(30).optional(),
      whatsapp: plainTextSchema(30).optional(),
      instagram: plainTextSchema(60).optional(),
      address: plainTextSchema(200).optional(),
    })
    .default({}),
})
export type UpdateRestaurantProfileInput = z.infer<
  typeof updateRestaurantProfileSchema
>

export const setRestaurantStatusSchema = z.object({
  restaurantId: uuidSchema,
  status: restaurantStatusSchema,
})

// DTOs: o que sai da DAL. Nunca a linha crua do banco.
export type RestaurantPublicDTO = {
  slug: string
  name: string
  description: string | null
  logoPath: string | null
  coverPath: string | null
  contact: Record<string, string>
}

export type RestaurantAdminDTO = {
  id: string
  slug: string
  name: string
  status: RestaurantStatus
  createdAt: string
  deletedAt: string | null
}

export type RestaurantMemberDTO = {
  id: string
  slug: string
  name: string
  description: string | null
  status: RestaurantStatus
  logoPath: string | null
  coverPath: string | null
  contact: Record<string, string>
}
