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
import { requireUser } from '@/server/dal/auth'
import { getMenuForOwner } from '@/server/dal/menu'
import { getRestaurantWorkspace } from '@/server/dal/restaurant-workspace'
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

  const workspace = await getRestaurantWorkspace(parsed.data)
  // Restaurante de outra pessoa cai em 404, não em "sem permissão": não
  // confirmamos nem que o id existe.
  if (!workspace) notFound()

  const { restaurant, canEdit } = workspace

  // O papel decide o que APARECE. Quem chamar a action na mão continua barrado
  // pela DAL e pela RLS — são três camadas dizendo a mesma coisa.
  const categories = await getMenuForOwner(restaurant.id)
  const publicUrl = `http://${env.NEXT_PUBLIC_ROOT_DOMAIN}/${restaurant.slug}`

  // Quantos itens visíveis estão sem mídia. É o que a faixa de publicação
  // mostra e o que trava o botão — a regra de verdade é o `setPublished`,
  // que recusa de novo.
  const semMidia = categories
    .flatMap((category) => category.items)
    .filter((item) => item.semMidia).length

  return (
    <main className="tavvi-page">
      <PageHeader
        eyebrow="Cardápio"
        title={restaurant.name}
        description={`${categories.length} ${
          categories.length === 1 ? 'categoria' : 'categorias'
        }`}
        actions={canEdit && categories.length > 0 ? (
          <NewCategoryButton restaurantId={restaurant.id} />
        ) : null}
      />

      {/* O atalho para o cardápio público vive aqui agora, ao lado da situação
          — que é onde ele faz sentido — e não solto no cabeçalho. */}
      <PublishBar
        restaurantId={restaurant.id}
        status={restaurant.status}
        publicUrl={publicUrl}
        canEdit={canEdit}
        semMidia={semMidia}
      />

      {categories.length === 0 ? (
        <Empty className="tavvi-surface min-h-[360px]">
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
        <div className="space-y-4">
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
                <div className="px-4 py-6 text-center">
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
                    <div className="px-4 py-2.5">
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
