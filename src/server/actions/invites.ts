'use server'

import { revalidatePath } from 'next/cache'
import * as dal from '@/server/dal/invites'
import { runAction, type ActionResult } from './result'

export async function createInviteAction(
  input: unknown,
): Promise<ActionResult<{ id: string; link: string }>> {
  return runAction(async () => {
    const invite = await dal.createInvite(input)
    revalidatePath('/')
    // O link volta UMA vez. Quem chamar precisa mostrar agora; nem o banco
    // nem esta action conseguem produzi-lo de novo.
    return invite
  })
}

export async function revokeInviteAction(
  inviteId: unknown,
): Promise<ActionResult> {
  return runAction(async () => {
    await dal.revokeInvite(inviteId)
    revalidatePath('/')
  })
}

export async function redeemInviteAction(
  token: unknown,
): Promise<ActionResult<{ restaurantId: string }>> {
  return runAction(async () => {
    const restaurantId = await dal.redeemInvite(token)
    revalidatePath('/')
    return { restaurantId }
  })
}
