import { notFound } from 'next/navigation'
import { RiRestaurantLine } from 'react-icons/ri'
import { CategorySection } from '@/components/cardapio/category-section'
import { ItemRow } from '@/components/cardapio/item-row'
import { NewCategoryButton } from '@/components/cardapio/new-category-button'
import { NewItemButton } from '@/components/cardapio/new-item-button'
import { PublishBar } from '@/components/painel/publish-bar'
import { PageHeader } from '@/components/shell/page-header'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { uuidSchema } from '@/domain/common'
import { myRole, requireUser } from '@/server/dal/auth'
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

  // O papel decide o que APARECE. Quem chamar a action na mão continua barrado
  // pela DAL e pela RLS — são três camadas dizendo a mesma coisa.
  const role = await myRole(restaurant.id)
  const canEdit = role === 'admin'

  const categories = await getMenuForOwner(restaurant.id)
  const publicUrl = `http://${env.NEXT_PUBLIC_ROOT_DOMAIN}/${restaurant.slug}`

  return (
    <main className="mx-auto w-full max-w-[1180px] flex-1 px-4 py-8 sm:px-6">
      <PageHeader
        title={restaurant.name}
        support={`${categories.length} ${
          categories.length === 1 ? 'categoria' : 'categorias'
        }`}
      >
        {canEdit && categories.length > 0 ? (
          <NewCategoryButton restaurantId={restaurant.id} />
        ) : null}
      </PageHeader>

      {/* O atalho para o cardápio público vive aqui agora, ao lado da situação
          — que é onde ele faz sentido — e não solto no cabeçalho. */}
      <PublishBar
        restaurantId={restaurant.id}
        status={restaurant.status}
        publicUrl={publicUrl}
        canEdit={canEdit}
      />

      {categories.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <RiRestaurantLine />
            </EmptyMedia>
            <EmptyTitle>Cardápio vazio</EmptyTitle>
            {/* Dizer "crie uma categoria" para quem não pode criar é pior que
                não dizer nada. */}
            <EmptyDescription>
              {canEdit
                ? 'Comece criando uma categoria, como Entradas ou Bebidas.'
                : 'O administrador ainda não montou o cardápio.'}
            </EmptyDescription>
          </EmptyHeader>
          {canEdit ? (
            <EmptyContent>
              <NewCategoryButton
                restaurantId={restaurant.id}
                label="Criar primeira categoria"
              />
            </EmptyContent>
          ) : null}
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
              canEdit={canEdit}
            >
              {category.items.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="mb-4 text-muted-foreground">
                    Nenhum item nesta categoria.
                  </p>
                  {canEdit ? (
                    <NewItemButton
                      restaurantId={restaurant.id}
                      categoryId={category.id}
                      label="Adicionar o primeiro item"
                      variant="outline"
                      size="default"
                    />
                  ) : null}
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
                      canEdit={canEdit}
                    />
                  ))}
                  {canEdit ? (
                    <div className="px-4 py-3">
                      <NewItemButton
                        restaurantId={restaurant.id}
                        categoryId={category.id}
                      />
                    </div>
                  ) : null}
                </>
              )}
            </CategorySection>
          ))}
        </div>
      )}
    </main>
  )
}
