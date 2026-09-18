import { notFound } from 'next/navigation'
import { IdentityForm } from '@/components/admin/identity-form'
import { SlugForm } from '@/components/admin/slug-form'
import { StatusBadge } from '@/components/admin/status-badge'
import { StatusForm } from '@/components/admin/status-form'
import { TeamSection } from '@/components/admin/team-section'
import { uuidSchema } from '@/domain/common'
import { requirePlatformAdmin } from '@/server/dal/auth'
import { listInvites } from '@/server/dal/invites'
import { listMembers } from '@/server/dal/members'
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

  // As duas consultas são independentes: buscar em paralelo evita somar as
  // latências.
  const [members, invites] = await Promise.all([
    listMembers(restaurant.id),
    listInvites(restaurant.id),
  ])

  return (
    <main className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-8">
      <div className="mb-8 flex items-center gap-4">
        <h1 className="text-[28px] font-semibold">{restaurant.name}</h1>
        <StatusBadge status={restaurant.status} />
      </div>

      <div className="space-y-8">
        <section className="rounded-lg border border-border p-6">
          <h2 className="mb-6 text-xl font-semibold">Identidade</h2>
          <IdentityForm
            restaurantId={restaurant.id}
            name={restaurant.name}
            description={restaurant.description}
            contact={restaurant.contact}
          />
        </section>

        <section className="rounded-lg border border-border p-6">
          <h2 className="mb-6 text-xl font-semibold">Endereço público</h2>
          <SlugForm
            restaurantId={restaurant.id}
            slug={restaurant.slug}
            rootDomain={env.NEXT_PUBLIC_ROOT_DOMAIN}
          />
        </section>

        <section className="rounded-lg border border-border p-6">
          <h2 className="mb-6 text-xl font-semibold">Situação</h2>
          <StatusForm restaurantId={restaurant.id} status={restaurant.status} />
        </section>

        <section className="rounded-lg border border-border p-6">
          <h2 className="mb-6 text-xl font-semibold">Equipe e convites</h2>
          <TeamSection
            restaurantId={restaurant.id}
            members={members}
            invites={invites}
          />
        </section>
      </div>
    </main>
  )
}
