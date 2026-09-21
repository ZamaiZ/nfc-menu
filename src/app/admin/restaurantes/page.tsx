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
    <main className="tavvi-page">
      <PageHeader
        eyebrow="Plataforma"
        title="Restaurantes"
        description="Acompanhe os estabelecimentos, endereços públicos e situação de publicação."
      />

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
        <>
          <div className="tavvi-surface hidden overflow-hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/35">
                  <TableHead>Nome</TableHead>
                  <TableHead>Endereço</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {restaurants.map((restaurant) => (
                  <TableRow key={restaurant.id} className="h-16">
                    <TableCell>
                      <Link
                        href={`/restaurantes/${restaurant.id}`}
                        className="font-semibold underline-offset-4 hover:text-primary hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-ring/60"
                      >
                        {restaurant.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">/{restaurant.slug}</TableCell>
                    <TableCell className="text-muted-foreground">{restaurant.segment ?? 'Não informado'}</TableCell>
                    <TableCell><StatusBadge status={restaurant.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="grid gap-3 md:hidden">
            {restaurants.map((restaurant) => (
              <Link
                key={restaurant.id}
                href={`/restaurantes/${restaurant.id}`}
                className="tavvi-surface block p-4 outline-none transition-transform active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{restaurant.name}</p>
                    <p className="mt-1 truncate text-sm text-muted-foreground">/{restaurant.slug}</p>
                  </div>
                  <StatusBadge status={restaurant.status} />
                </div>
                <p className="mt-4 text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">
                  {restaurant.segment ?? 'Tipo não informado'}
                </p>
              </Link>
            ))}
          </div>
        </>
      )}
    </main>
  )
}
