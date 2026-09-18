'use server'

import { revalidatePath } from 'next/cache'
import type { MediaKind } from '@/domain/media'
import * as dal from '@/server/dal/media'
import { runAction, type ActionResult } from './result'

export async function createUploadTicketAction(input: {
  itemId: string
  kind: MediaKind
  mimeType: string
}): Promise<ActionResult<{ bucket: string; path: string; signedUrl: string }>> {
  return runAction(() => dal.createUploadTicket(input))
}

export async function registerItemMediaAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const id = await dal.registerItemMedia(input)
    revalidatePath('/')
    return { id }
  })
}

export async function deleteItemMediaAction(
  mediaId: unknown,
): Promise<ActionResult> {
  return runAction(async () => {
    await dal.deleteItemMedia(mediaId)
    revalidatePath('/')
  })
}
