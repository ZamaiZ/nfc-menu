'use server'

import { revalidatePath } from 'next/cache'
import * as dal from '@/server/dal/restaurants'
import { runAction, type ActionResult } from './result'

export async function updateRestaurantProfileAction(
  input: unknown,
): Promise<ActionResult> {
  return runAction(async () => {
    await dal.updateRestaurantProfile(input)
    revalidatePath('/')
  })
}

export async function setPublishedAction(
  input: unknown,
): Promise<ActionResult> {
  return runAction(async () => {
    await dal.setPublished(input)
    revalidatePath('/')
  })
}

export async function updateIdentityAction(
  input: unknown,
): Promise<ActionResult> {
  return runAction(async () => {
    await dal.updateIdentity(input)
    revalidatePath('/')
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
    await dal.setRestaurantStatus(input)
    revalidatePath('/')
  })
}

export async function softDeleteRestaurantAction(
  restaurantId: unknown,
): Promise<ActionResult> {
  return runAction(async () => {
    await dal.softDeleteRestaurant(restaurantId)
    revalidatePath('/')
  })
}

export async function updateRestaurantSlugAction(
  input: unknown,
): Promise<ActionResult> {
  return runAction(async () => {
    await dal.updateRestaurantSlug(input)
    revalidatePath('/')
  })
}
