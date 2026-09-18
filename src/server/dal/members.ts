import 'server-only'
import { uuidSchema } from '@/domain/common'
import type { MemberDTO, MembershipRole } from '@/domain/invite'
import { recordAudit } from '@/server/security/audit'
import { createUserClient } from './_client'
import { currentTerritory, requireOwner, UserFacingError } from './auth'

async function db() {
  return createUserClient(await currentTerritory())
}

export async function listMembers(restaurantId: unknown): Promise<MemberDTO[]> {
  const id = uuidSchema.parse(restaurantId)
  // A função no banco já checa pertencimento, mas checamos aqui também: as
  // duas camadas concordam, e uma falha em qualquer uma é contida pela outra.
  await requireOwner(id)

  const supabase = await db()
  const { data, error } = await supabase.rpc('list_restaurant_members', {
    p_restaurant_id: id,
  })

  if (error) {
    throw new Error(`Não foi possível listar a equipe: ${error.message}`)
  }

  return (data ?? []).map((row) => ({
    membershipId: row.membership_id,
    userId: row.user_id,
    email: row.email,
    displayName: row.display_name,
    role: row.member_role as MembershipRole,
    joinedAt: row.joined_at,
  }))
}

export async function removeMember(membershipId: unknown): Promise<void> {
  const id = uuidSchema.parse(membershipId)

  const supabase = await db()
  // Descobrimos o restaurante dono ANTES de autorizar. Confiar num
  // restaurantId vindo do cliente seria exatamente a brecha de IDOR.
  const { data: row, error: lookupError } = await supabase
    .from('memberships')
    .select('restaurant_id, user_id')
    .eq('id', id)
    .single()

  if (lookupError || !row) throw new UserFacingError('Membro não encontrado.')
  await requireOwner(row.restaurant_id)

  const { error } = await supabase.from('memberships').delete().eq('id', id)
  if (error) {
    throw new Error(`Não foi possível remover o membro: ${error.message}`)
  }

  await recordAudit({
    action: 'membership.removed',
    subjectType: 'membership',
    subjectId: id,
    restaurantId: row.restaurant_id,
    metadata: { removedUserId: row.user_id },
  })
}
