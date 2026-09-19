'use server'

import { revalidatePath } from 'next/cache'
import * as dal from '@/server/dal/invites'
import { runAction, type ActionResult } from './result'

export async function createPlatformInviteAction(
  input: unknown,
): Promise<ActionResult<{ id: string; link: string }>> {
  return runAction(async () => {
    // A autorização acontece DENTRO da DAL. Não basta a página ter
    // verificado: a action é um endpoint POST público por construção e pode
    // ser chamada direto, sem passar por tela nenhuma.
    const invite = await dal.createPlatformInvite(input)
    revalidatePath('/')
    // O link volta UMA vez. Quem chamar precisa mostrar agora; nem o banco
    // nem esta action conseguem produzi-lo de novo.
    return invite
  })
}

export async function createTeamInviteAction(
  input: unknown,
): Promise<ActionResult<{ id: string; link: string }>> {
  return runAction(async () => {
    const invite = await dal.createTeamInvite(input)
    revalidatePath('/')
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

export async function redeemPlatformInviteAction(
  input: unknown,
): Promise<ActionResult<{ restaurantId: string }>> {
  return runAction(async () => {
    const restaurantId = await dal.redeemPlatformInvite(input)
    revalidatePath('/')
    return { restaurantId }
  })
}
