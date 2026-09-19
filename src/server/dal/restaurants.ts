import 'server-only'
import { plainTextSchema, slugSchema, uuidSchema } from '@/domain/common'
import {
  setPublishedSchema,
  setRestaurantStatusSchema,
  updateIdentitySchema,
  updateRestaurantProfileSchema,
  updateSlugSchema,
  type RestaurantDetailDTO,
  type RestaurantAdminDTO,
  type RestaurantMemberDTO,
  type RestaurantPublicDTO,
  type RestaurantStatus,
} from '@/domain/restaurant'
import { contrastRatio } from '@/lib/color'
import { nextSlugCandidate, slugify } from '@/lib/slug'
import { isBaseInRange, PRESETS } from '@/lib/theme/presets'
import { recordAudit } from '@/server/security/audit'
import { rateLimitIdentity } from '@/server/security/client-ip'
import { enforceRateLimit } from '@/server/security/rate-limit'
import { createUserClient } from './_client'
import {
  ConflictError,
  currentTerritory,
  requireRestaurantAdmin,
  requirePlatformAdmin,
  requireUser,
  UserFacingError,
} from './auth'

async function db() {
  return createUserClient(await currentTerritory())
}

type AdminRow = {
  id: string
  slug: string
  name: string
  status: RestaurantStatus
  segment: string | null
  created_at: string
  deleted_at: string | null
}

function toAdminDTO(row: AdminRow): RestaurantAdminDTO {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    status: row.status,
    segment: row.segment,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
  }
}

export async function updateRestaurantProfile(input: unknown): Promise<void> {
  const data = updateRestaurantProfileSchema.parse(input)
  // Autorizacao por POSSE do recurso, nao so por estar autenticado. E o
  // que fecha IDOR: saber o id de outro restaurante nao basta.
  await requireRestaurantAdmin(data.restaurantId)

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

export async function setPublished(input: unknown): Promise<void> {
  const data = setPublishedSchema.parse(input)
  await requireRestaurantAdmin(data.restaurantId)

  const supabase = await db()

  if (data.published) {
    // Publicar cardápio vazio só produz cliente confuso na mesa. A conferência
    // é uma consulta, e não uma regra de banco, porque "ao menos um item
    // visível" muda com o produto, e travar isso num CHECK seria rigidez.
    const { count, error: countError } = await supabase
      .from('menu_items')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', data.restaurantId)
      .eq('is_visible', true)

    if (countError) {
      throw new Error(`Não foi possível conferir o cardápio: ${countError.message}`)
    }
    if ((count ?? 0) === 0) {
      throw new UserFacingError(
        'Adicione ao menos um item visível antes de publicar o cardápio.',
      )
    }
  }

  const { error } = await supabase
    .from('restaurants')
    .update({ status: data.published ? 'active' : 'draft' })
    .eq('id', data.restaurantId)

  if (error) {
    // O gatilho do 0011 recusa entrar ou sair de 'suspended' para quem não é
    // plataforma. Traduzir aqui evita mostrar errcode do Postgres na tela.
    if (error.code === '42501') {
      throw new UserFacingError(
        'Este restaurante está suspenso. Fale com o administrador da plataforma.',
      )
    }
    throw new Error(`Não foi possível alterar a publicação: ${error.message}`)
  }

  await recordAudit({
    action: data.published ? 'restaurant.published' : 'restaurant.unpublished',
    subjectType: 'restaurant',
    subjectId: data.restaurantId,
    restaurantId: data.restaurantId,
  })
}

// O assistente pergunta isto a cada tecla digitada. O balde é o mesmo do
// preview de convite, porque sem limite este endpoint vira um enumerador
// barato de endereços — ainda que o endereço já seja público por natureza.
export async function checkSlug(candidate: unknown): Promise<boolean> {
  await requireUser()
  await enforceRateLimit('invite:preview', await rateLimitIdentity())

  const parsed = slugSchema.safeParse(candidate)
  // Endereço fora do formato nunca chega ao banco.
  if (!parsed.success) return false

  const supabase = await db()
  const { data, error } = await supabase.rpc('is_slug_available', {
    p_slug: parsed.data,
  })
  return !error && data === true
}

// Deriva do nome e, se já existir, sufixa até achar um livre. O teto de dez
// existe porque onze restaurantes com o mesmo nome é outro problema, e um
// laço sem teto contra o banco é um pedido de negação de serviço.
export async function suggestSlug(name: unknown): Promise<string | null> {
  const parsedName = plainTextSchema(120, 2).safeParse(name)
  if (!parsedName.success) return null

  const base = slugify(parsedName.data)
  if (await checkSlug(base)) return base

  for (let attempt = 2; attempt <= 10; attempt += 1) {
    const candidate = nextSlugCandidate(base, attempt)
    if (await checkSlug(candidate)) return candidate
  }
  return null
}

export async function updateIdentity(input: unknown): Promise<void> {
  const data = updateIdentitySchema.parse(input)
  await requireRestaurantAdmin(data.restaurantId)

  // A faixa do preset e o contraste são conferidos AQUI, no servidor, e não
  // só no seletor de cor. Um seletor é conveniência; a regra é isto.
  if (data.theme.base && !isBaseInRange(data.theme.preset, data.theme.base)) {
    throw new UserFacingError(
      'Esta cor de fundo não combina com o tema escolhido. Escolha um tom dentro da faixa sugerida.',
    )
  }

  if (data.theme.accent) {
    const preset = PRESETS[data.theme.preset]
    const base = data.theme.base ?? preset.light.base
    // 3:1 é o piso do WCAG para texto grande e elemento de interface, que é
    // onde o destaque aparece: preço, rótulo de categoria, botão.
    if (contrastRatio(base, data.theme.accent) < 3) {
      throw new UserFacingError(
        'Esta cor de destaque não contrasta o suficiente com o fundo. Escolha um tom mais escuro ou mais claro.',
      )
    }
  }

  const supabase = await db()
  const { error } = await supabase
    .from('restaurants')
    .update({ segment: data.segment ?? null, theme: data.theme })
    .eq('id', data.restaurantId)

  if (error) throw new Error(`Não foi possível salvar: ${error.message}`)

  await recordAudit({
    action: 'restaurant.identity_updated',
    subjectType: 'restaurant',
    subjectId: data.restaurantId,
    restaurantId: data.restaurantId,
    metadata: { preset: data.theme.preset, segment: data.segment ?? null },
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
    .select('id, slug, name, status, segment, created_at, deleted_at')
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
      'id, slug, name, description, status, logo_path, cover_path, contact, segment, theme, memberships!inner(user_id)',
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
    segment: row.segment as string | null,
    theme: row.theme,
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
    .select(
      'id, slug, name, description, status, logo_path, cover_path, contact, segment, theme',
    )
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
    segment: data.segment as string | null,
    theme: data.theme,
  }
}

export async function getRestaurantForAdmin(
  restaurantId: unknown,
): Promise<RestaurantDetailDTO | null> {
  const id = uuidSchema.parse(restaurantId)
  await requirePlatformAdmin()

  const supabase = await db()
  const { data, error } = await supabase
    .from('restaurants')
    .select('id, slug, name, description, status, contact, created_at, deleted_at')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null

  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    description: data.description,
    status: data.status,
    contact: (data.contact ?? {}) as Record<string, string>,
    createdAt: data.created_at,
    deletedAt: data.deleted_at,
  }
}

export async function updateRestaurantSlug(input: unknown): Promise<void> {
  const data = updateSlugSchema.parse(input)
  // Só a plataforma troca o endereço. O gatilho no banco recusaria de
  // qualquer forma; esta linha dá a mensagem decente antes de chegar lá.
  await requirePlatformAdmin()

  const supabase = await db()
  const { error } = await supabase
    .from('restaurants')
    .update({ slug: data.slug })
    .eq('id', data.restaurantId)

  if (error) {
    if (error.code === '23505') {
      throw new ConflictError('Este endereço já está em uso.')
    }
    throw new Error(`Não foi possível alterar o endereço: ${error.message}`)
  }

  await recordAudit({
    action: 'restaurant.slug_changed',
    subjectType: 'restaurant',
    subjectId: data.restaurantId,
    restaurantId: data.restaurantId,
    metadata: { slug: data.slug },
  })
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
