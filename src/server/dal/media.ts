import 'server-only'
import { randomUUID } from 'node:crypto'
import { uuidSchema } from '@/domain/common'
import { MEDIA_LIMITS, registerMediaSchema, type MediaKind } from '@/domain/media'
import { createUserClient } from './_client'
import { currentTerritory, requireMember } from './auth'

async function db() {
  return createUserClient(await currentTerritory())
}

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
}

// O caminho e montado no SERVIDOR, a partir do restaurante resolvido no
// servidor. O navegador nunca escolhe onde grava: o prefixo do caminho e a
// fronteira do inquilino, e deixar o cliente decidi-lo anularia a politica
// de storage inteira.
export async function buildUploadPath(input: {
  itemId: string
  kind: MediaKind
  mimeType: string
}): Promise<{ bucket: string; path: string }> {
  const itemId = uuidSchema.parse(input.itemId)

  const limits = MEDIA_LIMITS[input.kind]
  if (!(limits.mimes as readonly string[]).includes(input.mimeType)) {
    throw new Error('Formato de arquivo não aceito')
  }

  const supabase = await db()
  const { data, error } = await supabase
    .from('menu_items')
    .select('restaurant_id')
    .eq('id', itemId)
    .single()

  if (error || !data) throw new Error('Item não encontrado')
  const restaurantId = data.restaurant_id as string
  await requireMember(restaurantId)

  const extension = EXTENSION_BY_MIME[input.mimeType]
  return {
    bucket: limits.bucket,
    path: `${restaurantId}/${itemId}/${randomUUID()}.${extension}`,
  }
}

export async function registerItemMedia(input: unknown): Promise<string> {
  const data = registerMediaSchema.parse(input)

  const supabase = await db()
  const { data: item, error: lookupError } = await supabase
    .from('menu_items')
    .select('restaurant_id')
    .eq('id', data.itemId)
    .single()

  if (lookupError || !item) throw new Error('Item não encontrado')
  const restaurantId = item.restaurant_id as string
  await requireMember(restaurantId)

  // Revalidamos o prefixo aqui mesmo com o CHECK do banco fazendo o mesmo.
  // O CHECK e a garantia; esta linha e a mensagem de erro decente.
  if (!data.storagePath.startsWith(`${restaurantId}/`)) {
    throw new Error('Caminho de arquivo inválido')
  }

  const { data: row, error } = await supabase
    .from('menu_item_media')
    .insert({
      restaurant_id: restaurantId,
      item_id: data.itemId,
      kind: data.kind,
      storage_path: data.storagePath,
      alt_text: data.altText ?? null,
      width: data.width ?? null,
      height: data.height ?? null,
      duration_ms: data.durationMs ?? null,
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Não foi possível registrar a mídia: ${error.message}`)
  }
  return row.id as string
}

export async function deleteItemMedia(mediaId: unknown): Promise<void> {
  const id = uuidSchema.parse(mediaId)

  const supabase = await db()
  const { data: row, error: lookupError } = await supabase
    .from('menu_item_media')
    .select('restaurant_id, kind, storage_path')
    .eq('id', id)
    .single()

  if (lookupError || !row) throw new Error('Mídia não encontrada')
  await requireMember(row.restaurant_id as string)

  const bucket = MEDIA_LIMITS[row.kind as MediaKind].bucket
  // Remove o arquivo ANTES da linha. Se a ordem fosse invertida e a segunda
  // etapa falhasse, sobraria arquivo sem dono e sem rastro no banco -- o
  // pior dos dois estados possiveis.
  await supabase.storage.from(bucket).remove([row.storage_path as string])

  const { error } = await supabase.from('menu_item_media').delete().eq('id', id)
  if (error) {
    throw new Error(`Não foi possível remover a mídia: ${error.message}`)
  }
}
