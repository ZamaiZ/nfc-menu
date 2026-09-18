import { z } from 'zod'
import { plainTextSchema, uuidSchema } from './common'

export const mediaKindSchema = z.enum(['image', 'video'])
export type MediaKind = z.infer<typeof mediaKindSchema>

export const IMAGE_BUCKET = 'menu-images'
export const VIDEO_BUCKET = 'menu-videos'

export const MEDIA_LIMITS = {
  image: {
    bucket: IMAGE_BUCKET,
    maxBytes: 5_242_880,
    mimes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
  },
  video: {
    bucket: VIDEO_BUCKET,
    maxBytes: 10_485_760,
    mimes: ['video/mp4', 'video/webm'],
  },
} as const

export const registerMediaSchema = z.object({
  itemId: uuidSchema,
  kind: mediaKindSchema,
  storagePath: z.string().min(1).max(400),
  altText: plainTextSchema(160).optional(),
  width: z.int().min(1).max(10_000).optional(),
  height: z.int().min(1).max(10_000).optional(),
  // 15 segundos. Validado no navegador; o servidor não consegue conferir
  // duração sem transcodificar. Limitação registrada na spec.
  durationMs: z.int().min(1).max(15_000).optional(),
})
