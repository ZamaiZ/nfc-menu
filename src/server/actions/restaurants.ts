'use server'

import { revalidatePath } from 'next/cache'
import * as dal from '@/server/dal/restaurants'
import { runAction, type ActionResult } from './result'

export async function createRestaurantAction(
  input: unknown,
): Promise<ActionResult<{ id: string; slug: string }>> {
  return runAction(async () => {
    // A autorizacao acontece DENTRO da DAL. Nao basta a pagina ter
    // verificado: a action e um endpoint POST publico por construcao e
    // pode ser chamada direto, sem passar por tela nenhuma.
    const restaurant = await dal.createRestaurant(input)
    revalidatePath('/')
    return { id: restaurant.id, slug: restaurant.slug }
  })
}

export async function updateRestaurantProfileAction(
  input: unknown,
): Promise<ActionResult> {
  return runAction(async () => {
    await dal.updateRestaurantProfile(input)
    revalidatePath('/')
  })
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
