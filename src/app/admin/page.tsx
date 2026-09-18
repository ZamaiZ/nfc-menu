import Link from 'next/link'
import { RiStore2Line } from 'react-icons/ri'
import { CreateRestaurantDialog } from '@/components/admin/create-restaurant-dialog'
import { StatusBadge } from '@/components/admin/status-badge'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { requirePlatformAdmin } from '@/server/dal/auth'
import { listRestaurantsForAdmin } from '@/server/dal/restaurants'
import { env } from '@/server/env'

export const metadata = { title: 'Restaurantes' }

export default async function Page() {
  // O proxy já redirecionou quem não tem cookie, mas checagem otimista não
  // é autorização. Quem autoriza é esta linha.
  await requirePlatformAdmin()
  const restaurants = await listRestaurantsForAdmin()

  return (
    <main className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-[28px] font-semibold">Restaurantes</h1>
        {restaurants.length > 0 ? (
          <CreateRestaurantDialog rootDomain={env.NEXT_PUBLIC_ROOT_DOMAIN} />
        ) : null}
      </div>

      {restaurants.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <RiStore2Line />
            </EmptyMedia>
            <EmptyTitle>Nenhum restaurante ainda</EmptyTitle>
            <EmptyDescription>
              Cadastre o primeiro para gerar o convite do dono.
            </EmptyDescription>
          </EmptyHeader>
          {/* O vazio traz a ação junto: dizer "está vazio" sem oferecer o
              próximo passo obriga a pessoa a procurar o que fazer. */}
          <EmptyContent>
            <CreateRestaurantDialog rootDomain={env.NEXT_PUBLIC_ROOT_DOMAIN} />
          </EmptyContent>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Endereço</TableHead>
              <TableHead>Situação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {restaurants.map((restaurant) => (
              // h-14 são os 56px de altura de linha da direção visual.
              <TableRow key={restaurant.id} className="h-14">
                <TableCell>
                  <Link
                    href={`/restaurantes/${restaurant.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {restaurant.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  /{restaurant.slug}
                </TableCell>
                <TableCell>
                  <StatusBadge status={restaurant.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </main>
  )
}
