import Link from 'next/link'
import { redirect } from 'next/navigation'
import { RiStore2Line } from 'react-icons/ri'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@/components/ui/item'
import { requireUser } from '@/server/dal/auth'
import { listMyRestaurants } from '@/server/dal/restaurants'
import { env } from '@/server/env'

export const metadata = { title: 'Seus restaurantes' }

export default async function Page() {
  await requireUser()
  const restaurants = await listMyRestaurants()

  // Uma tela de escolha com um item só é um clique que não escolhe nada.
  // O desvio acontece no servidor, antes de renderizar, então a lista nem
  // chega a piscar.
  if (restaurants.length === 1) {
    redirect(`/restaurantes/${restaurants[0].id}`)
  }

  return (
    <main className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-8">
      <h1 className="mb-8 text-[28px] font-semibold">Seus restaurantes</h1>

      {restaurants.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <RiStore2Line />
            </EmptyMedia>
            <EmptyTitle>Nenhum restaurante ainda</EmptyTitle>
            <EmptyDescription>
              Peça um convite para quem administra a plataforma.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-4">
          {restaurants.map((restaurant) => (
            <Item key={restaurant.id} variant="outline">
              <ItemContent>
                <ItemTitle>
                  <Link
                    href={`/restaurantes/${restaurant.id}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {restaurant.name}
                  </Link>
                </ItemTitle>
                <ItemDescription>
                  {env.NEXT_PUBLIC_ROOT_DOMAIN}/{restaurant.slug}
                </ItemDescription>
              </ItemContent>
            </Item>
          ))}
        </div>
      )}
    </main>
  )
}
