'use server'

import { revalidatePath } from 'next/cache'
import * as dal from '@/server/dal/menu'
import { runAction, type ActionResult } from './result'

export async function createCategoryAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const id = await dal.createCategory(input)
    revalidatePath('/')
    return { id }
  })
}

export async function updateCategoryAction(
  input: unknown,
): Promise<ActionResult> {
  return runAction(async () => {
    await dal.updateCategory(input)
    revalidatePath('/')
  })
}

export async function deleteCategoryAction(
  categoryId: unknown,
): Promise<ActionResult> {
  return runAction(async () => {
    await dal.deleteCategory(categoryId)
    revalidatePath('/')
  })
}

export async function reorderCategoriesAction(
  input: unknown,
): Promise<ActionResult> {
  return runAction(async () => {
    await dal.reorderCategories(input)
    revalidatePath('/')
  })
}

export async function createItemAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const id = await dal.createItem(input)
    revalidatePath('/')
    return { id }
  })
}

export async function updateItemAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    await dal.updateItem(input)
    revalidatePath('/')
  })
}

export async function deleteItemAction(itemId: unknown): Promise<ActionResult> {
  return runAction(async () => {
    await dal.deleteItem(itemId)
    revalidatePath('/')
  })
}

export async function reorderItemsAction(
  input: unknown,
): Promise<ActionResult> {
  return runAction(async () => {
    await dal.reorderItems(input)
    revalidatePath('/')
  })
}

export async function setItemAvailabilityAction(
  input: unknown,
): Promise<ActionResult> {
  return runAction(async () => {
    await dal.setItemAvailability(input)
    revalidatePath('/')
  })
}

export async function createVariantAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const id = await dal.createVariant(input)
    revalidatePath('/')
    return { id }
  })
}

export async function updateVariantAction(
  input: unknown,
): Promise<ActionResult> {
  return runAction(async () => {
    await dal.updateVariant(input)
    revalidatePath('/')
  })
}

export async function deleteVariantAction(
  variantId: unknown,
): Promise<ActionResult> {
  return runAction(async () => {
    await dal.deleteVariant(variantId)
    revalidatePath('/')
  })
}
