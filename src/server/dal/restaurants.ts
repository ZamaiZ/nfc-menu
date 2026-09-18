import 'server-only'
import { slugSchema, uuidSchema } from '@/domain/common'
import {
  createRestaurantSchema,
  setRestaurantStatusSchema,
  updateRestaurantProfileSchema,
  type RestaurantAdminDTO,
  type RestaurantMemberDTO,
  type RestaurantPublicDTO,
  type RestaurantStatus,
} from '@/domain/restaurant'
import { recordAudit } from '@/server/security/audit'
import { createUserClient } from './_client'
import {
  currentTerritory,
  requireOwner,
  requirePlatformAdmin,
  requireUser,
} from './auth'

async function db() {
  return createUserClient(await currentTerritory())
}

type AdminRow = {
  id: string
  slug: string
  name: string
  status: RestaurantStatus
  created_at: string
  deleted_at: string | null
}

function toAdminDTO(row: AdminRow): RestaurantAdminDTO {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    status: row.status,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
  }
}

export async function createRestaurant(
  input: unknown,
): Promise<RestaurantAdminDTO> {
  const data = createRestaurantSchema.parse(input)
  const user = await requirePlatformAdmin()

  const supabase = await db()
  const { data: row, error } = await supabase
    .from('restaurants')
    .insert({
      slug: data.slug,
      name: data.name,
      description: data.description ?? null,
      created_by: user.id,
    })
    .select('id, slug, name, status, created_at, deleted_at')
    .single()

  if (error) {
    throw new Error(`Não foi possível criar o restaurante: ${error.message}`)
  }

  await recordAudit({
    action: 'restaurant.created',
    subjectType: 'restaurant',
    subjectId: row.id,
    restaurantId: row.id,
    metadata: { slug: row.slug },
  })

  return toAdminDTO(row as AdminRow)
}

export async function updateRestaurantProfile(input: unknown): Promise<void> {
  const data = updateRestaurantProfileSchema.parse(input)
  // Autorizacao por POSSE do recurso, nao so por estar autenticado. E o
  // que fecha IDOR: saber o id de outro restaurante nao basta.
  await requireOwner(data.restaurantId)

  const supabase = await db()
  const { error } = await supabase
    .from('restaurants')
    .update({
      name: data.name,
      description: data.description ?? null,
      contact: data.contact,
    })
    .eq('id', data.restaurantId)

  if (error) throw new Error(`Não foi possível salvar: ${error.message}`)

  await recordAudit({
    action: 'restaurant.profile_updated',
    subjectType: 'restaurant',
    subjectId: data.restaurantId,
    restaurantId: data.restaurantId,
  })
}

export async function setRestaurantStatus(input: unknown): Promise<void> {
  const data = setRestaurantStatusSchema.parse(input)
  await requirePlatformAdmin()

  const supabase = await db()
  const { error } = await supabase
    .from('restaurants')
    .update({ status: data.status })
    .eq('id', data.restaurantId)

  if (error) {
    throw new Error(`Não foi possível alterar a situação: ${error.message}`)
  }

  await recordAudit({
    action: 'restaurant.status_changed',
    subjectType: 'restaurant',
    subjectId: data.restaurantId,
    restaurantId: data.restaurantId,
    metadata: { status: data.status },
  })
}

export async function softDeleteRestaurant(
  restaurantId: unknown,
): Promise<void> {
  const id = uuidSchema.parse(restaurantId)
  await requirePlatformAdmin()

  const supabase = await db()
  const { error } = await supabase
    .from('restaurants')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(`Não foi possível remover: ${error.message}`)

  await recordAudit({
    action: 'restaurant.soft_deleted',
    subjectType: 'restaurant',
    subjectId: id,
    restaurantId: id,
  })
}

export async function listRestaurantsForAdmin(): Promise<RestaurantAdminDTO[]> {
  await requirePlatformAdmin()

  const supabase = await db()
  const { data, error } = await supabase
    .from('restaurants')
    .select('id, slug, name, status, created_at, deleted_at')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Não foi possível listar: ${error.message}`)
  return ((data ?? []) as AdminRow[]).map(toAdminDTO)
}

export async function listMyRestaurants(): Promise<RestaurantMemberDTO[]> {
  await requireUser()

  const supabase = await db()
  // O !inner em memberships limita aos restaurantes de que a pessoa
  // participa. A RLS ja garantiria isso; o filtro explicito existe porque
  // a DAL nao delega sua decisao ao banco -- as duas camadas concordam, e
  // uma falha em qualquer uma e contida pela outra.
  const { data, error } = await supabase
    .from('restaurants')
    .select(
      'id, slug, name, description, status, logo_path, cover_path, contact, memberships!inner(user_id)',
    )
    .is('deleted_at', null)
    .order('name')

  if (error) throw new Error(`Não foi possível listar: ${error.message}`)

  return (data ?? []).map((row) => ({
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    description: row.description as string | null,
    status: row.status as RestaurantStatus,
    logoPath: row.logo_path as string | null,
    coverPath: row.cover_path as string | null,
    contact: (row.contact ?? {}) as Record<string, string>,
  }))
}

export async function getRestaurantForMember(
  restaurantId: unknown,
): Promise<RestaurantMemberDTO | null> {
  const id = uuidSchema.parse(restaurantId)
  await requireUser()

  const supabase = await db()
  const { data, error } = await supabase
    .from('restaurants')
    .select('id, slug, name, description, status, logo_path, cover_path, contact')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error || !data) return null

  return {
    id: data.id as string,
    slug: data.slug as string,
    name: data.name as string,
    description: data.description as string | null,
    status: data.status as RestaurantStatus,
    logoPath: data.logo_path as string | null,
    coverPath: data.cover_path as string | null,
    contact: (data.contact ?? {}) as Record<string, string>,
  }
}

export async function getRestaurantBySlugPublic(
  slug: unknown,
): Promise<RestaurantPublicDTO | null> {
  const parsed = slugSchema.safeParse(slug)
  // Slug fora do formato nunca chega ao banco. Nao e so validacao: e um
  // filtro de entrada antes de qualquer consulta.
  if (!parsed.success) return null

  const supabase = await db()
  const { data, error } = await supabase
    .from('restaurants')
    .select('slug, name, description, logo_path, cover_path, contact')
    .eq('slug', parsed.data)
    .eq('status', 'active')
    .is('deleted_at', null)
    .maybeSingle()

  if (error || !data) return null

  return {
    slug: data.slug as string,
    name: data.name as string,
    description: data.description as string | null,
    logoPath: data.logo_path as string | null,
    coverPath: data.cover_path as string | null,
    contact: (data.contact ?? {}) as Record<string, string>,
  }
}
