import 'server-only'
import { slugSchema, uuidSchema } from '@/domain/common'
import {
  createCategorySchema,
  createItemSchema,
  createVariantSchema,
  reorderSchema,
  setItemAvailabilitySchema,
  updateCategorySchema,
  updateItemSchema,
  updateVariantSchema,
  type MenuCategoryDTO,
  type OwnerMenuCategoryDTO,
  type OwnerMenuItemDTO,
  type PublicMenuDTO,
} from '@/domain/menu'
import type { AlvoRevalidacao } from '@/server/revalidate'
import { alvoDoRestaurante } from './_alvo'
import { createUserClient } from './_client'
import {
  currentTerritory,
  requireMember,
  requireRestaurantAdmin,
} from './auth'

async function db() {
  return createUserClient(await currentTerritory())
}

type ChildTable = 'menu_categories' | 'menu_items' | 'menu_item_variants'

// Descobre o restaurante dono de um recurso filho ANTES de autorizar. Sem
// isto a autorizacao dependeria de um restaurantId enviado pelo cliente,
// que e exatamente por onde entra o IDOR: basta trocar o id no corpo da
// requisicao.
async function ownerRestaurantOf(
  table: ChildTable,
  id: string,
): Promise<string> {
  const supabase = await db()
  const { data, error } = await supabase
    .from(table)
    .select('restaurant_id')
    .eq('id', id)
    .single()

  if (error || !data) throw new Error('Recurso não encontrado')
  return data.restaurant_id as string
}

type RawVariant = {
  id: string
  name: string
  price_cents: number
  is_available: boolean
  position: number
}

type RawMedia = {
  kind: 'image' | 'video'
  storage_path: string
  poster_path: string | null
  alt_text: string | null
  duration_ms: number | null
  position: number
  focal_x: number
  focal_y: number
  // Nulos nas mídias enviadas antes da Fase 5, que é quando a compressão
  // passou a gravá-los. O feed trata o nulo caindo no `onLoad`.
  width: number | null
  height: number | null
}

type RawItem = {
  id: string
  name: string
  description: string | null
  base_price_cents: number
  is_available: boolean
  is_visible: boolean
  position: number
  dietary_tags: string[] | null
  menu_item_variants: RawVariant[] | null
  menu_item_media: RawMedia[] | null
}

type RawCategory = {
  id: string
  name: string
  description: string | null
  position: number
  is_visible: boolean
  menu_items: RawItem[] | null
}

export async function getPublicMenu(
  slug: unknown,
): Promise<PublicMenuDTO | null> {
  const parsed = slugSchema.safeParse(slug)
  if (!parsed.success) return null

  const supabase = await db()
  const { data, error } = await supabase
    .from('restaurants')
    .select(
      `slug, name, description, logo_path, cover_path, contact, theme,
       menu_categories (
         id, name, description, position, is_visible,
         menu_items (
           id, name, description, base_price_cents, is_available, is_visible,
           position, dietary_tags,
           menu_item_variants ( id, name, price_cents, is_available, position ),
           menu_item_media ( kind, storage_path, poster_path, alt_text, duration_ms, position, focal_x, focal_y, width, height )
         )
       )`,
    )
    .eq('slug', parsed.data)
    .eq('status', 'active')
    .is('deleted_at', null)
    .maybeSingle()

  if (error || !data) return null

  // O filtro de visibilidade acontece AQUI tambem, e nao so na RLS. Para um
  // visitante anonimo a RLS ja bastaria, mas o dono do restaurante esta
  // autenticado: a politica de membro deixaria ele ver os itens ocultos na
  // propria pagina publica. Na duvida entre confiar na RLS e filtrar de
  // novo, filtramos de novo.
  const rawCategories = (data.menu_categories ?? []) as RawCategory[]

  const categories: MenuCategoryDTO[] = rawCategories
    .filter((category) => category.is_visible)
    .sort((a, b) => a.position - b.position)
    .map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      items: (category.menu_items ?? [])
        // Item sem mídia não entra no feed, nem num cardápio publicado. A
        // publicação já recusa (ver `setPublished`), mas esta linha cobre o
        // caminho que a recusa não alcança: apagar a última foto de um prato
        // com o cardápio JÁ no ar. O item some, o painel avisa, e o cliente
        // na mesa nunca vê uma coluna vazia.
        .filter(
          (item) =>
            item.is_visible && (item.menu_item_media ?? []).length > 0,
        )
        .sort((a, b) => a.position - b.position)
        .map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          basePriceCents: item.base_price_cents,
          isAvailable: item.is_available,
          dietaryTags: item.dietary_tags ?? [],
          variants: (item.menu_item_variants ?? [])
            .sort((a, b) => a.position - b.position)
            .map((variant) => ({
              id: variant.id,
              name: variant.name,
              priceCents: variant.price_cents,
              isAvailable: variant.is_available,
            })),
          media: (item.menu_item_media ?? [])
            .sort((a, b) => a.position - b.position)
            .map((media) => ({
              kind: media.kind,
              storagePath: media.storage_path,
              posterPath: media.poster_path,
              altText: media.alt_text,
              durationMs: media.duration_ms,
              focalX: media.focal_x,
              focalY: media.focal_y,
              width: media.width,
              height: media.height,
            })),
        })),
    }))

  // Categoria que ficou sem item nenhum some do trilho. Um trilho com uma
  // categoria que não leva a lugar nenhum é pior que um trilho mais curto.
  const comItens = categories.filter((category) => category.items.length > 0)

  return {
    restaurant: {
      slug: data.slug as string,
      name: data.name as string,
      description: data.description as string | null,
      logoPath: data.logo_path as string | null,
      coverPath: data.cover_path as string | null,
      contact: (data.contact ?? {}) as Record<string, string>,
      theme: data.theme,
    },
    categories: comItens,
  }
}

// Item visível e sem nenhuma mídia. É o que impede a publicação a partir da
// Fase 4. A junção é `!left` porque o que se procura é justamente a AUSÊNCIA
// do lado direito.
export async function contarItensSemMidia(
  restaurantId: string,
): Promise<number> {
  const supabase = await db()
  const { data, error } = await supabase
    .from('menu_items')
    .select('id, menu_item_media!left ( id )')
    .eq('restaurant_id', restaurantId)
    .eq('is_visible', true)

  if (error) {
    throw new Error(`Não foi possível conferir as fotos: ${error.message}`)
  }

  return (data ?? []).filter(
    (item) =>
      ((item as { menu_item_media: unknown[] }).menu_item_media ?? []).length ===
      0,
  ).length
}

export async function getMenuForOwner(
  restaurantId: unknown,
): Promise<OwnerMenuCategoryDTO[]> {
  const id = uuidSchema.parse(restaurantId)
  await requireMember(id)

  const supabase = await db()
  const { data, error } = await supabase
    .from('menu_categories')
    .select(
      `id, name, description, position, is_visible,
       menu_items (
         id, name, description, base_price_cents, is_available, is_visible,
         position, dietary_tags,
         menu_item_variants ( id, name, price_cents, is_available, position ),
         menu_item_media ( id, kind, storage_path, poster_path, alt_text, position, focal_x, focal_y, width, height )
       )`,
    )
    .eq('restaurant_id', id)
    .order('position')

  if (error) {
    throw new Error(`Não foi possível carregar o cardápio: ${error.message}`)
  }

  // Sem filtro de visibilidade, ao contrário de getPublicMenu. A ordenação
  // dos aninhados vem em JavaScript porque o PostgREST ordena o nível de
  // cima, mas não os embutidos.
  return (data ?? []).map((category) => ({
    id: category.id,
    name: category.name,
    description: category.description,
    position: category.position,
    isVisible: category.is_visible,
    items: (category.menu_items ?? [])
      .sort((a, b) => a.position - b.position)
      .map((item): OwnerMenuItemDTO => ({
        id: item.id,
        categoryId: category.id,
        name: item.name,
        description: item.description,
        basePriceCents: item.base_price_cents,
        isAvailable: item.is_available,
        isVisible: item.is_visible,
        position: item.position,
        dietaryTags: item.dietary_tags ?? [],
        variants: (item.menu_item_variants ?? [])
          .sort((a, b) => a.position - b.position)
          .map((variant) => ({
            id: variant.id,
            name: variant.name,
            priceCents: variant.price_cents,
            isAvailable: variant.is_available,
          })),
        media: (item.menu_item_media ?? [])
          .sort((a, b) => a.position - b.position)
          .map((media) => ({
            id: media.id,
            kind: media.kind,
            storagePath: media.storage_path,
            posterPath: media.poster_path,
            altText: media.alt_text,
            position: media.position,
            focalX: media.focal_x,
            focalY: media.focal_y,
          })),
        // Visível e sem nenhuma mídia. É o que impede a publicação e o que
        // faz o item sumir do feed.
        semMidia:
          item.is_visible && (item.menu_item_media ?? []).length === 0,
      })),
  }))
}

export async function listCategories(restaurantId: unknown) {
  const id = uuidSchema.parse(restaurantId)
  await requireMember(id)

  const supabase = await db()
  const { data, error } = await supabase
    .from('menu_categories')
    .select('id, name, description, position, is_visible')
    .eq('restaurant_id', id)
    .order('position')

  if (error) {
    throw new Error(`Não foi possível listar categorias: ${error.message}`)
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | null,
    position: row.position as number,
    isVisible: row.is_visible as boolean,
  }))
}

// As escritas devolvem o ALVO da revalidação — id e slug do restaurante
// afetado. Sem isso a action não teria como saber o que invalidar, e era por
// isso que todas chamavam `revalidatePath('/')`, que não invalidava nada do
// que importa. Quem também cria alguma coisa devolve `createdId` junto: `id`
// já é o do restaurante, e dois `id` no mesmo objeto seria armadilha.
export async function createCategory(
  input: unknown,
): Promise<AlvoRevalidacao & { createdId: string }> {
  const data = createCategorySchema.parse(input)
  await requireRestaurantAdmin(data.restaurantId)

  const supabase = await db()
  const { data: row, error } = await supabase
    .from('menu_categories')
    .insert({
      restaurant_id: data.restaurantId,
      name: data.name,
      description: data.description ?? null,
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Não foi possível criar a categoria: ${error.message}`)
  }
  return {
    ...(await alvoDoRestaurante(data.restaurantId)),
    createdId: row.id as string,
  }
}

export async function updateCategory(
  input: unknown,
): Promise<AlvoRevalidacao> {
  const data = updateCategorySchema.parse(input)
  const restaurantId = await ownerRestaurantOf('menu_categories', data.categoryId)
  await requireRestaurantAdmin(restaurantId)

  const supabase = await db()
  const { error } = await supabase
    .from('menu_categories')
    .update({
      name: data.name,
      description: data.description ?? null,
      is_visible: data.isVisible,
    })
    .eq('id', data.categoryId)

  if (error) {
    throw new Error(`Não foi possível salvar a categoria: ${error.message}`)
  }
  return alvoDoRestaurante(restaurantId)
}

export async function deleteCategory(
  categoryId: unknown,
): Promise<AlvoRevalidacao> {
  const id = uuidSchema.parse(categoryId)
  const restaurantId = await ownerRestaurantOf('menu_categories', id)
  await requireRestaurantAdmin(restaurantId)

  // O alvo é lido ANTES do delete. Depois, a linha da categoria não existe
  // mais — mas o restaurante sim, então buscar o alvo aqui também
  // funcionaria. Fica antes por hábito: para item e variação a ordem também
  // não importa, mas para qualquer escrita futura que apague o restaurante
  // importaria, e uma forma só é mais fácil de manter certa.
  const alvo = await alvoDoRestaurante(restaurantId)

  const supabase = await db()
  const { error } = await supabase.from('menu_categories').delete().eq('id', id)
  if (error) {
    throw new Error(`Não foi possível remover a categoria: ${error.message}`)
  }
  return alvo
}

export async function reorderCategories(
  input: unknown,
): Promise<AlvoRevalidacao> {
  const data = reorderSchema.parse(input)
  await requireRestaurantAdmin(data.restaurantId)

  const supabase = await db()
  for (const entry of data.order) {
    const { error } = await supabase
      .from('menu_categories')
      .update({ position: entry.position })
      .eq('id', entry.id)
      // O filtro por restaurante impede reordenar categoria alheia mesmo
      // que o id venha adulterado. A RLS ja negaria; este eq torna a
      // intencao explicita na propria consulta.
      .eq('restaurant_id', data.restaurantId)

    if (error) throw new Error(`Não foi possível reordenar: ${error.message}`)
  }
  return alvoDoRestaurante(data.restaurantId)
}

export async function createItem(
  input: unknown,
): Promise<AlvoRevalidacao & { createdId: string }> {
  const data = createItemSchema.parse(input)
  await requireRestaurantAdmin(data.restaurantId)

  const supabase = await db()
  const { data: row, error } = await supabase
    .from('menu_items')
    .insert({
      restaurant_id: data.restaurantId,
      category_id: data.categoryId,
      name: data.name,
      description: data.description ?? null,
      base_price_cents: data.basePriceCents,
      dietary_tags: data.dietaryTags,
    })
    .select('id')
    .single()

  // Se a categoria for de outro restaurante, quem recusa e a chave
  // estrangeira composta -- nao um if em TypeScript.
  if (error) throw new Error(`Não foi possível criar o item: ${error.message}`)
  return {
    ...(await alvoDoRestaurante(data.restaurantId)),
    createdId: row.id as string,
  }
}

export async function updateItem(input: unknown): Promise<AlvoRevalidacao> {
  const data = updateItemSchema.parse(input)
  const restaurantId = await ownerRestaurantOf('menu_items', data.itemId)
  await requireRestaurantAdmin(restaurantId)

  const supabase = await db()
  const { error } = await supabase
    .from('menu_items')
    .update({
      // Mover para a categoria de OUTRO restaurante continua impossível:
      // quem recusa é a chave estrangeira composta, não um if aqui.
      category_id: data.categoryId,
      name: data.name,
      description: data.description ?? null,
      base_price_cents: data.basePriceCents,
      dietary_tags: data.dietaryTags,
      is_visible: data.isVisible,
      is_available: data.isAvailable,
    })
    .eq('id', data.itemId)

  if (error) throw new Error(`Não foi possível salvar o item: ${error.message}`)
  return alvoDoRestaurante(restaurantId)
}

export async function deleteItem(itemId: unknown): Promise<AlvoRevalidacao> {
  const id = uuidSchema.parse(itemId)
  const restaurantId = await ownerRestaurantOf('menu_items', id)
  await requireRestaurantAdmin(restaurantId)
  const alvo = await alvoDoRestaurante(restaurantId)

  const supabase = await db()
  const { error } = await supabase.from('menu_items').delete().eq('id', id)
  if (error) throw new Error(`Não foi possível remover o item: ${error.message}`)
  return alvo
}

export async function reorderItems(input: unknown): Promise<AlvoRevalidacao> {
  const data = reorderSchema.parse(input)
  await requireRestaurantAdmin(data.restaurantId)

  const supabase = await db()
  for (const entry of data.order) {
    const { error } = await supabase
      .from('menu_items')
      .update({ position: entry.position })
      .eq('id', entry.id)
      .eq('restaurant_id', data.restaurantId)

    if (error) throw new Error(`Não foi possível reordenar: ${error.message}`)
  }
  return alvoDoRestaurante(data.restaurantId)
}

export async function setItemAvailability(
  input: unknown,
): Promise<AlvoRevalidacao> {
  const data = setItemAvailabilitySchema.parse(input)
  const restaurantId = await ownerRestaurantOf('menu_items', data.itemId)
  await requireRestaurantAdmin(restaurantId)

  const supabase = await db()
  const { error } = await supabase
    .from('menu_items')
    .update({ is_available: data.isAvailable })
    .eq('id', data.itemId)

  if (error) {
    throw new Error(`Não foi possível alterar a disponibilidade: ${error.message}`)
  }
  return alvoDoRestaurante(restaurantId)
}

export async function createVariant(
  input: unknown,
): Promise<AlvoRevalidacao & { createdId: string }> {
  const data = createVariantSchema.parse(input)
  const restaurantId = await ownerRestaurantOf('menu_items', data.itemId)
  await requireRestaurantAdmin(restaurantId)

  const supabase = await db()
  const { data: row, error } = await supabase
    .from('menu_item_variants')
    .insert({
      restaurant_id: restaurantId,
      item_id: data.itemId,
      name: data.name,
      price_cents: data.priceCents,
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Não foi possível criar a variação: ${error.message}`)
  }
  return {
    ...(await alvoDoRestaurante(restaurantId)),
    createdId: row.id as string,
  }
}

export async function updateVariant(
  input: unknown,
): Promise<AlvoRevalidacao> {
  const data = updateVariantSchema.parse(input)
  const restaurantId = await ownerRestaurantOf(
    'menu_item_variants',
    data.variantId,
  )
  await requireRestaurantAdmin(restaurantId)

  const supabase = await db()
  const { error } = await supabase
    .from('menu_item_variants')
    .update({
      name: data.name,
      price_cents: data.priceCents,
      is_available: data.isAvailable,
    })
    .eq('id', data.variantId)

  if (error) {
    throw new Error(`Não foi possível salvar a variação: ${error.message}`)
  }
  return alvoDoRestaurante(restaurantId)
}

export async function deleteVariant(
  variantId: unknown,
): Promise<AlvoRevalidacao> {
  const id = uuidSchema.parse(variantId)
  const restaurantId = await ownerRestaurantOf('menu_item_variants', id)
  await requireRestaurantAdmin(restaurantId)
  const alvo = await alvoDoRestaurante(restaurantId)

  const supabase = await db()
  const { error } = await supabase
    .from('menu_item_variants')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Não foi possível remover a variação: ${error.message}`)
  }
  return alvo
}
