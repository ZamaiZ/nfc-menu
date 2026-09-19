'use server'

import { revalidatePath } from 'next/cache'
import * as dal from '@/server/dal/members'
import { runAction, type ActionResult } from './result'

export async function removeMemberAction(
  membershipId: unknown,
): Promise<ActionResult> {
  return runAction(async () => {
    await dal.removeMember(membershipId)
    revalidatePath('/')
  })
}

export async function changeMemberRoleAction(
  input: unknown,
): Promise<ActionResult> {
  return runAction(async () => {
    await dal.changeMemberRole(input)
    revalidatePath('/')
  })
}
