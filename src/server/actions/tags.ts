'use server'

import { revalidatePath } from 'next/cache'
import type { TagDTO } from '@/domain/tag'
import * as dal from '@/server/dal/tags'
import { runAction, type ActionResult } from './result'

export async function createTagAction(
  input: unknown,
): Promise<ActionResult<TagDTO>> {
  return runAction(async () => {
    const tag = await dal.createTag(input)
    revalidatePath('/')
    return tag
  })
}

export async function updateTagAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    await dal.updateTag(input)
    revalidatePath('/')
  })
}

export async function deleteTagAction(tagId: unknown): Promise<ActionResult> {
  return runAction(async () => {
    await dal.deleteTag(tagId)
    revalidatePath('/')
  })
}
