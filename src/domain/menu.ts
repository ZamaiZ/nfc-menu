import { z } from 'zod'
import {
  plainTextSchema,
  positionSchema,
  priceCentsSchema,
  uuidSchema,
} from './common'

export const createCategorySchema = z.object({
  restaurantId: uuidSchema,
  name: plainTextSchema(80, 2),
  description: plainTextSchema(300).optional(),
})

export const updateCategorySchema = z.object({
  categoryId: uuidSchema,
  name: plainTextSchema(80, 2),
  description: plainTextSchema(300).optional(),
  isVisible: z.boolean(),
})

export const reorderSchema = z.object({
  restaurantId: uuidSchema,
  order: z.array(z.object({ id: uuidSchema, position: positionSchema })).min(1),
})

export const createItemSchema = z.object({
  restaurantId: uuidSchema,
  categoryId: uuidSchema,
  name: plainTextSchema(120, 2),
  description: plainTextSchema(600).optional(),
  basePriceCents: priceCentsSchema,
  dietaryTags: z.array(plainTextSchema(30)).max(10).default([]),
})

export const updateItemSchema = createItemSchema
  .omit({ restaurantId: true, categoryId: true })
  .extend({
    itemId: uuidSchema,
    isVisible: z.boolean(),
    isAvailable: z.boolean(),
  })

export const setItemAvailabilitySchema = z.object({
  itemId: uuidSchema,
  isAvailable: z.boolean(),
})

export const createVariantSchema = z.object({
  itemId: uuidSchema,
  name: plainTextSchema(60, 1),
  priceCents: priceCentsSchema,
})

export const updateVariantSchema = createVariantSchema.extend({
  variantId: uuidSchema,
  isAvailable: z.boolean(),
})

export type MenuMediaDTO = {
  kind: 'image' | 'video'
  storagePath: string
  altText: string | null
  durationMs: number | null
}

export type MenuItemDTO = {
  id: string
  name: string
  description: string | null
  basePriceCents: number
  isAvailable: boolean
  variants: {
    id: string
    name: string
    priceCents: number
    isAvailable: boolean
  }[]
  media: MenuMediaDTO[]
  dietaryTags: string[]
}

export type MenuCategoryDTO = {
  id: string
  name: string
  description: string | null
  items: MenuItemDTO[]
}

export type PublicMenuDTO = {
  restaurant: {
    slug: string
    name: string
    description: string | null
    logoPath: string | null
    coverPath: string | null
    contact: Record<string, string>
  }
  categories: MenuCategoryDTO[]
}
