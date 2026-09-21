'use server'

import * as dal from '@/server/dal/restaurants'
import {
  revalidateCaminhoPublico,
  revalidateListas,
  revalidateRestaurant,
} from '@/server/revalidate'
import { runAction, type ActionResult } from './result'

export async function updateRestaurantProfileAction(
  input: unknown,
): Promise<ActionResult> {
  return runAction(async () => {
    revalidateRestaurant(await dal.updateRestaurantProfile(input))
  })
}

export async function setPublishedAction(
  input: unknown,
): Promise<ActionResult> {
  return runAction(async () => {
    revalidateRestaurant(await dal.setPublished(input))
    // A lista mostra a situação de cada restaurante, e publicar muda
    // exatamente isso.
    revalidateListas()
  })
}

export async function updateIdentityAction(
  input: unknown,
): Promise<ActionResult> {
  return runAction(async () => {
    revalidateRestaurant(await dal.updateIdentity(input))
  })
}

// Consulta, não mutação — mas passa por action porque o assistente é
// componente de cliente e não pode importar a DAL.
export async function checkSlugAction(
  candidate: unknown,
): Promise<ActionResult<boolean>> {
  return runAction(async () => dal.checkSlug(candidate))
}

export async function suggestSlugAction(
  name: unknown,
): Promise<ActionResult<string | null>> {
  return runAction(async () => dal.suggestSlug(name))
}

export async function setRestaurantStatusAction(
  input: unknown,
): Promise<ActionResult> {
  return runAction(async () => {
    revalidateRestaurant(await dal.setRestaurantStatus(input))
    revalidateListas()
  })
}

export async function softDeleteRestaurantAction(
  restaurantId: unknown,
): Promise<ActionResult> {
  return runAction(async () => {
    revalidateRestaurant(await dal.softDeleteRestaurant(restaurantId))
    revalidateListas()
  })
}

export async function updateRestaurantSlugAction(
  input: unknown,
): Promise<ActionResult> {
  return runAction(async () => {
    const { slugAnterior, ...alvo } = await dal.updateRestaurantSlug(input)
    revalidateRestaurant(alvo)
    // O endereço antigo também: sem esta linha `/{slugAnterior}` continuaria
    // servindo um cardápio que mudou de endereço.
    revalidateCaminhoPublico(slugAnterior)
    revalidateListas()
  })
}
