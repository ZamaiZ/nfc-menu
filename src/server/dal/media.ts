import 'server-only'
import { randomUUID } from 'node:crypto'
import { uuidSchema } from '@/domain/common'
import { MEDIA_LIMITS, registerMediaSchema, type MediaKind } from '@/domain/media'
import { createUserClient } from './_client'
import {
  ConflictError,
  currentTerritory,
  requireMember,
  UserFacingError,
} from './auth'

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
export async function createUploadTicket(input: {
  itemId: string
  kind: MediaKind
  mimeType: string
}): Promise<{ bucket: string; path: string; signedUrl: string }> {
  const itemId = uuidSchema.parse(input.itemId)

  const limits = MEDIA_LIMITS[input.kind]
  if (!(limits.mimes as readonly string[]).includes(input.mimeType)) {
    throw new UserFacingError('Formato de arquivo não aceito.')
  }

  const supabase = await db()
  const { data, error } = await supabase
    .from('menu_items')
    .select('restaurant_id')
    .eq('id', itemId)
    .single()

  if (error || !data) throw new UserFacingError('Item não encontrado.')
  const restaurantId = data.restaurant_id
  await requireMember(restaurantId)

  const extension = EXTENSION_BY_MIME[input.mimeType]
  // O caminho é montado no SERVIDOR, a partir do restaurante resolvido no
  // servidor. O navegador nunca escolhe onde grava: o prefixo do caminho é
  // a fronteira do inquilino, e deixar o cliente decidi-lo anularia a
  // política de storage inteira.
  const path = `${restaurantId}/${itemId}/${randomUUID()}.${extension}`

  // A assinatura também passa pela RLS do storage: se esta sessão não
  // puder escrever neste caminho, o Supabase recusa aqui.
  const { data: ticket, error: signError } = await supabase.storage
    .from(limits.bucket)
    .createSignedUploadUrl(path)

  if (signError || !ticket) {
    throw new UserFacingError('Não foi possível autorizar o envio.')
  }

  return { bucket: limits.bucket, path, signedUrl: ticket.signedUrl }
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

  // Uma consulta, dois problemas. O teto por item e REGRA: o navegador
  // confere para responder na hora, mas quem garante e esta linha. E a
  // contagem do mesmo tipo vira a position da nova midia -- sem isso toda
  // linha fica no default 0, a ordem da galeria passa a depender do que o
  // banco devolver naquele instante, e a miniatura do item troca sozinha.
  const { data: siblings, error: countError } = await supabase
    .from('menu_item_media')
    .select('kind')
    .eq('item_id', data.itemId)

  if (countError) {
    throw new Error(
      `Não foi possível conferir a mídia do item: ${countError.message}`,
    )
  }

  const limits = MEDIA_LIMITS[data.kind]
  const sameKind = (siblings ?? []).filter(
    (row) => row.kind === data.kind,
  ).length

  if (sameKind >= limits.maxPerItem) {
    // ConflictError, nao Error cru: so UserFacingError e suas filhas
    // atravessam o runAction com a mensagem intacta. Um Error comum viraria
    // "Nao foi possivel concluir a operacao" e o dono nao saberia o que fazer.
    throw new ConflictError(
      data.kind === 'image'
        ? `Este item já tem ${limits.maxPerItem} imagens. Remova uma para enviar outra.`
        : 'Este item já tem um vídeo. Remova o atual para enviar outro.',
    )
  }

  const { data: row, error } = await supabase
    .from('menu_item_media')
    .insert({
      restaurant_id: restaurantId,
      item_id: data.itemId,
      kind: data.kind,
      position: sameKind,
      storage_path: data.storagePath,
      poster_path: data.posterPath ?? null,
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
    .select('restaurant_id, kind, storage_path, poster_path')
    .eq('id', id)
    .single()

  if (lookupError || !row) throw new Error('Mídia não encontrada')
  await requireMember(row.restaurant_id as string)

  const bucket = MEDIA_LIMITS[row.kind as MediaKind].bucket
  // Remove o arquivo ANTES da linha. Se a ordem fosse invertida e a segunda
  // etapa falhasse, sobraria arquivo sem dono e sem rastro no banco -- o
  // pior dos dois estados possiveis.
  await supabase.storage.from(bucket).remove([row.storage_path as string])

  // A capa mora no bucket de imagem, mesmo pertencendo a um video. Deixa-la
  // para tras daria um arquivo pago e inalcancavel a cada video trocado --
  // e invisivel, porque nada no banco voltaria a apontar para ele.
  if (row.poster_path) {
    await supabase.storage
      .from(MEDIA_LIMITS.image.bucket)
      .remove([row.poster_path as string])
  }

  const { error } = await supabase.from('menu_item_media').delete().eq('id', id)
  if (error) {
    throw new Error(`Não foi possível remover a mídia: ${error.message}`)
  }
}
