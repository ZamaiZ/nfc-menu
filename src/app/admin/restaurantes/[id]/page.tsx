import { notFound } from 'next/navigation'
import { SlugForm } from '@/components/admin/slug-form'
import { StatusBadge } from '@/components/admin/status-badge'
import { StatusForm } from '@/components/admin/status-form'
import { PageHeader } from '@/components/shell/page-header'
import { uuidSchema } from '@/domain/common'
import { requirePlatformAdmin } from '@/server/dal/auth'
import { getRestaurantForAdmin } from '@/server/dal/restaurants'
import { env } from '@/server/env'

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requirePlatformAdmin()

  const { id } = await params
  // O id vem da URL, que é entrada de usuário. Validar antes de consultar
  // impede que lixo vire erro de banco na cara de quem digitou.
  const parsed = uuidSchema.safeParse(id)
  if (!parsed.success) notFound()

  const restaurant = await getRestaurantForAdmin(parsed.data)
  if (!restaurant || restaurant.deletedAt) notFound()

  return (
    <main className="mx-auto w-full max-w-[1180px] flex-1 px-4 py-8 sm:px-6">
      <PageHeader title={restaurant.name}>
        <StatusBadge status={restaurant.status} />
      </PageHeader>

      {/* Identidade e equipe saíram daqui. Identidade é do dono, e equipe é
          do administrador do restaurante — as duas vivem no painel agora. O
          que sobra no console é o que continua sendo privilégio da
          plataforma: o endereço e a suspensão. */}
      <div className="space-y-8">
        <section className="rounded-xl border border-border bg-surface-2 p-6 shadow-[var(--shadow-1)]">
          <h2 className="mb-6 font-heading text-section font-semibold">
            Endereço público
          </h2>
          <SlugForm
            restaurantId={restaurant.id}
            slug={restaurant.slug}
            rootDomain={env.NEXT_PUBLIC_ROOT_DOMAIN}
          />
        </section>

        <section className="rounded-xl border border-border bg-surface-2 p-6 shadow-[var(--shadow-1)]">
          <h2 className="mb-6 font-heading text-section font-semibold">
            Situação
          </h2>
          <StatusForm restaurantId={restaurant.id} status={restaurant.status} />
        </section>
      </div>
    </main>
  )
}
