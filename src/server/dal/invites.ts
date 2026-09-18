import 'server-only'
import { headers } from 'next/headers'
import { uuidSchema } from '@/domain/common'
import {
  createInviteSchema,
  inviteTokenSchema,
  type CreatedInviteDTO,
  type InviteDTO,
  type InvitePreviewDTO,
  type MembershipRole,
} from '@/domain/invite'
import { originFor } from '@/server/territory'
import { recordAudit } from '@/server/security/audit'
import { rateLimitIdentity } from '@/server/security/client-ip'
import { enforceRateLimit } from '@/server/security/rate-limit'
import {
  generateInviteToken,
  hashInviteTokenForDb,
} from '@/server/security/tokens'
import { createUserClient } from './_client'
import { currentTerritory, requireOwner, requirePlatformAdmin } from './auth'

async function db() {
  return createUserClient(await currentTerritory())
}

export async function createInvite(input: unknown): Promise<CreatedInviteDTO> {
  const data = createInviteSchema.parse(input)
  const user = await requirePlatformAdmin()

  const token = generateInviteToken()
  const expiresAt = new Date(Date.now() + data.expiresInDays * 86_400_000)

  const supabase = await db()
  const { data: row, error } = await supabase
    .from('invites')
    .insert({
      restaurant_id: data.restaurantId,
      role: data.role,
      // So o hash vai para o banco. O token em claro existe apenas nesta
      // funcao e no link devolvido uma unica vez.
      token_hash: hashInviteTokenForDb(token),
      email: data.email ?? null,
      created_by: user.id,
      expires_at: expiresAt.toISOString(),
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Não foi possível criar o convite: ${error.message}`)
  }

  await recordAudit({
    action: 'invite.created',
    subjectType: 'invite',
    subjectId: row.id as string,
    restaurantId: data.restaurantId,
    metadata: { role: data.role, boundToEmail: Boolean(data.email) },
  })

  const requestHeaders = await headers()
  const protocol =
    requestHeaders.get('x-forwarded-proto') === 'https' ? 'https:' : 'http:'

  // O convite leva para o territorio onde a pessoa vai trabalhar.
  return {
    id: row.id as string,
    link: `${originFor('painel', protocol)}/convite/${token}`,
  }
}

export async function listInvites(restaurantId: unknown): Promise<InviteDTO[]> {
  const id = uuidSchema.parse(restaurantId)
  await requireOwner(id)

  const supabase = await db()
  const { data, error } = await supabase
    .from('invites')
    // token_hash NUNCA e selecionado. Nem para o dono do restaurante: nao
    // ha uso legitimo para ele fora das funcoes do banco.
    .select('id, role, email, expires_at, redeemed_at, revoked_at')
    .eq('restaurant_id', id)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Não foi possível listar convites: ${error.message}`)
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    role: row.role as MembershipRole,
    email: row.email as string | null,
    expiresAt: row.expires_at as string,
    redeemedAt: row.redeemed_at as string | null,
    revokedAt: row.revoked_at as string | null,
  }))
}

export async function revokeInvite(inviteId: unknown): Promise<void> {
  const id = uuidSchema.parse(inviteId)
  await requirePlatformAdmin()

  const supabase = await db()
  const { error } = await supabase
    .from('invites')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .is('redeemed_at', null)

  if (error) throw new Error(`Não foi possível revogar: ${error.message}`)

  await recordAudit({
    action: 'invite.revoked',
    subjectType: 'invite',
    subjectId: id,
  })
}

export async function previewInvite(
  token: unknown,
): Promise<InvitePreviewDTO | null> {
  // Rate limit ANTES de qualquer consulta. Sem isso, o endpoint vira um
  // oraculo para adivinhar tokens por forca bruta.
  await enforceRateLimit('invite:preview', await rateLimitIdentity())

  const parsed = inviteTokenSchema.safeParse(token)
  if (!parsed.success) return null

  const supabase = await db()
  const { data, error } = await supabase.rpc('preview_invite', {
    p_token: parsed.data,
  })

  if (error || !data || data.length === 0) return null

  return {
    restaurantName: data[0].restaurant_name as string,
    role: data[0].invite_role as MembershipRole,
  }
}

export async function redeemInvite(token: unknown): Promise<string> {
  await enforceRateLimit('invite:redeem', await rateLimitIdentity())

  const parsed = inviteTokenSchema.safeParse(token)
  // Mensagem identica a de token valido porem expirado, revogado ou ja
  // usado. Nao revelamos qual condicao falhou.
  if (!parsed.success) throw new Error('Convite inválido')

  const supabase = await db()
  const { data, error } = await supabase.rpc('redeem_invite', {
    p_token: parsed.data,
  })

  if (error || !data) throw new Error('Convite inválido')
  return data as string
}
