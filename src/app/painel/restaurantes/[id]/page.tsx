import Link from 'next/link'
import { notFound } from 'next/navigation'
import { RiExternalLinkLine, RiRestaurantLine } from 'react-icons/ri'
import { CategorySection } from '@/components/cardapio/category-section'
import { ItemRow } from '@/components/cardapio/item-row'
import { NewCategoryButton } from '@/components/cardapio/new-category-button'
import { NewItemButton } from '@/components/cardapio/new-item-button'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { uuidSchema } from '@/domain/common'
import { requireUser } from '@/server/dal/auth'
import { getMenuForOwner } from '@/server/dal/menu'
import { getRestaurantForMember } from '@/server/dal/restaurants'
import { env } from '@/server/env'

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireUser()

  const { id } = await params
  const parsed = uuidSchema.safeParse(id)
  if (!parsed.success) notFound()

  const restaurant = await getRestaurantForMember(parsed.data)
  // Restaurante de outra pessoa cai em 404, não em "sem permissão": não
  // confirmamos nem que o id existe.
  if (!restaurant) notFound()

  const categories = await getMenuForOwner(restaurant.id)

  const publicUrl = `http://${env.NEXT_PUBLIC_ROOT_DOMAIN}/${restaurant.slug}`

  return (
    <main className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold">{restaurant.name}</h1>
          <p className="text-muted-foreground">
            {categories.length}{' '}
            {categories.length === 1 ? 'categoria' : 'categorias'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            render={
              <Link href={publicUrl} target="_blank" rel="noopener noreferrer" />
            }
          >
            <RiExternalLinkLine className="size-4" />
            Ver cardápio público
          </Button>
          {categories.length > 0 ? (
            <NewCategoryButton restaurantId={restaurant.id} />
          ) : null}
        </div>
      </div>

      {categories.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <RiRestaurantLine />
            </EmptyMedia>
            <EmptyTitle>Cardápio vazio</EmptyTitle>
            <EmptyDescription>
              Comece criando uma categoria, como Entradas ou Bebidas.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <NewCategoryButton
              restaurantId={restaurant.id}
              label="Criar primeira categoria"
            />
          </EmptyContent>
        </Empty>
      ) : (
        <div className="space-y-6">
          {categories.map((category, index) => (
            <CategorySection
              key={category.id}
              restaurantId={restaurant.id}
              category={category}
              index={index}
              all={categories}
            >
              {category.items.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="mb-4 text-muted-foreground">
                    Nenhum item nesta categoria.
                  </p>
                  <NewItemButton
                    restaurantId={restaurant.id}
                    categoryId={category.id}
                    label="Adicionar o primeiro item"
                    variant="outline"
                    size="default"
                  />
                </div>
              ) : (
                <>
                  {category.items.map((item, itemIndex) => (
                    <ItemRow
                      key={item.id}
                      restaurantId={restaurant.id}
                      item={item}
                      index={itemIndex}
                      all={category.items}
                      categories={categories}
                    />
                  ))}
                  <div className="px-4 py-3">
                    <NewItemButton
                      restaurantId={restaurant.id}
                      categoryId={category.id}
                    />
                  </div>
                </>
              )}
            </CategorySection>
          ))}
        </div>
      )}
    </main>
  )
}
