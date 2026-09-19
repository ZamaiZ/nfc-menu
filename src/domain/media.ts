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
    // Teto por item. Não é limite técnico: é o ponto em que a galeria de um
    // prato deixa de ajudar a decidir e passa a atrapalhar.
    maxPerItem: 6,
    mimes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
  },
  video: {
    bucket: VIDEO_BUCKET,
    maxBytes: 10_485_760,
    // Vídeo é caro em tráfego, e o limite de um já estava na Fase 0.
    maxPerItem: 1,
    mimes: ['video/mp4', 'video/webm'],
  },
} as const

// A marca do restaurante: logo e capa. Vive no mesmo bucket de imagem do
// cardápio, sob o prefixo `${restaurantId}/brand/`, o que faz a política de
// storage já valer — ela lê o PRIMEIRO segmento do caminho para descobrir o
// inquilino, e esse segmento continua sendo o id do restaurante.
export const brandSlotSchema = z.enum(['logo', 'cover'])
export type BrandSlot = z.infer<typeof brandSlotSchema>

export const BRAND_SLOT_LABELS: Record<BrandSlot, string> = {
  logo: 'Logo',
  cover: 'Foto de capa',
}

export const setBrandImageSchema = z.object({
  restaurantId: uuidSchema,
  slot: brandSlotSchema,
  // Nulo remove a imagem. É a mesma operação vista do outro lado, e separar
  // em duas ações criaria dois caminhos para o mesmo apagamento de arquivo.
  storagePath: z.string().min(1).max(400).nullable(),
})

export const registerMediaSchema = z.object({
  itemId: uuidSchema,
  kind: mediaKindSchema,
  storagePath: z.string().min(1).max(400),
  // Só faz sentido quando kind = 'video'. Anulável porque a captura pode
  // falhar, e falhar em capturar não impede subir o vídeo.
  posterPath: z.string().min(1).max(400).optional(),
  altText: plainTextSchema(160).optional(),
  width: z.int().min(1).max(10_000).optional(),
  height: z.int().min(1).max(10_000).optional(),
  // 15 segundos. Validado no navegador; o servidor não consegue conferir
  // duração sem transcodificar. Limitação registrada na spec.
  durationMs: z.int().min(1).max(15_000).optional(),
})
