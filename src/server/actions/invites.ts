'use server'

import * as dal from '@/server/dal/invites'
import { revalidateListas, revalidateRestaurant } from '@/server/revalidate'
import { runAction, type ActionResult } from './result'

export async function createPlatformInviteAction(
  input: unknown,
): Promise<ActionResult<{ id: string; link: string }>> {
  return runAction(async () => {
    // A autorização acontece DENTRO da DAL. Não basta a página ter
    // verificado: a action é um endpoint POST público por construção e pode
    // ser chamada direto, sem passar por tela nenhuma.
    const invite = await dal.createPlatformInvite(input)
    // Convite de plataforma não tem restaurante: só a lista do console muda.
    revalidateListas()
    // O link volta UMA vez. Quem chamar precisa mostrar agora; nem o banco
    // nem esta action conseguem produzi-lo de novo.
    return invite
  })
}

export async function rotatePlatformInviteAction(
  inviteId: unknown,
): Promise<ActionResult<{ id: string; link: string }>> {
  return runAction(async () => {
    const invite = await dal.rotatePlatformInvite(inviteId)
    revalidateListas()
    return invite
  })
}

export async function createTeamInviteAction(
  input: unknown,
): Promise<ActionResult<{ id: string; link: string }>> {
  return runAction(async () => {
    const { alvo, ...invite } = await dal.createTeamInvite(input)
    revalidateRestaurant(alvo)
    return invite
  })
}

export async function revokeInviteAction(
  inviteId: unknown,
): Promise<ActionResult> {
  return runAction(async () => {
    const alvo = await dal.revokeInvite(inviteId)
    // Nulo é convite de plataforma, que não pertence a restaurante nenhum.
    if (alvo) revalidateRestaurant(alvo)
    else revalidateListas()
  })
}

export async function redeemInviteAction(
  token: unknown,
): Promise<ActionResult<{ restaurantId: string }>> {
  return runAction(async () => {
    const alvo = await dal.redeemInvite(token)
    revalidateRestaurant(alvo)
    // Quem resgatou passou a enxergar um restaurante que antes não aparecia
    // na lista dele.
    revalidateListas()
    return { restaurantId: alvo.id }
  })
}

export async function redeemPlatformInviteAction(
  input: unknown,
): Promise<ActionResult<{ restaurantId: string }>> {
  return runAction(async () => {
    const alvo = await dal.redeemPlatformInvite(input)
    revalidateRestaurant(alvo)
    // Este resgate CRIA um restaurante. As duas listas mudam.
    revalidateListas()
    return { restaurantId: alvo.id }
  })
}
