import Link from 'next/link'
import { RiStore2Line } from 'react-icons/ri'
import { StatusBadge } from '@/components/admin/status-badge'
import { PageHeader } from '@/components/shell/page-header'
import {
  Empty,
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

export const metadata = { title: 'Restaurantes' }

export default async function Page() {
  await requirePlatformAdmin()
  const restaurants = await listRestaurantsForAdmin()

  return (
    <main className="mx-auto w-full max-w-[1180px] flex-1 px-4 py-8 sm:px-6">
      <PageHeader title="Restaurantes" />

      {restaurants.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <RiStore2Line />
            </EmptyMedia>
            <EmptyTitle>Nenhum restaurante ainda</EmptyTitle>
            {/* Sem ação aqui, e de propósito: a plataforma não cria mais
                restaurante. Ele nasce quando alguém resgata um convite. */}
            <EmptyDescription>
              Restaurantes aparecem aqui quando alguém resgata um convite.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Endereço</TableHead>
              <TableHead>Tipo</TableHead>
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
                {/* O segmento é opcional no assistente. Um travessão diz
                    "não informado" sem gritar que falta alguma coisa. */}
                <TableCell className="text-muted-foreground">
                  {restaurant.segment ?? '—'}
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
