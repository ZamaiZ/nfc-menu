import { z } from 'zod'
import { uuidSchema } from './common'

export const membershipRoleSchema = z.enum(['owner', 'manager'])
export type MembershipRole = z.infer<typeof membershipRoleSchema>

export const createInviteSchema = z.object({
  restaurantId: uuidSchema,
  role: membershipRoleSchema.default('owner'),
  email: z.email({ error: 'E-mail inválido' }).optional(),
  expiresInDays: z.int().min(1).max(30).default(7),
})

// O token é uma credencial ao portador. Formato base64url, 43 caracteres
// para 32 bytes.
export const inviteTokenSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{43}$/, { error: 'Convite inválido' })

export type InviteDTO = {
  id: string
  role: MembershipRole
  email: string | null
  expiresAt: string
  redeemedAt: string | null
  revokedAt: string | null
}

// Devolvido UMA única vez, na criação. O banco guarda só o hash e não
// consegue reconstruir este link.
export type CreatedInviteDTO = {
  id: string
  link: string
}

export type InvitePreviewDTO = {
  restaurantName: string
  role: MembershipRole
}

export type MemberDTO = {
  membershipId: string
  userId: string
  email: string | null
  displayName: string | null
  role: MembershipRole
  joinedAt: string
}
