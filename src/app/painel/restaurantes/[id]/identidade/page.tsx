import { notFound } from 'next/navigation'
import { IdentityForm } from '@/components/painel/identity-form'
import { PageHeader } from '@/components/shell/page-header'
import { uuidSchema } from '@/domain/common'
import { requireRestaurantAdmin } from '@/server/dal/auth'
import { getRestaurantForMember } from '@/server/dal/restaurants'

export const metadata = { title: 'Identidade' }

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const parsed = uuidSchema.safeParse(id)
  if (!parsed.success) notFound()

  const restaurant = await getRestaurantForMember(parsed.data)
  if (!restaurant) notFound()

  // Identidade é do administrador. A página confirma antes de desenhar, e a
  // DAL confirma de novo ao gravar.
  await requireRestaurantAdmin(restaurant.id)

  return (
    <main className="mx-auto w-full max-w-[1180px] flex-1 px-4 py-8 sm:px-6">
      <PageHeader
        title="Identidade"
        support="Tema, cores e tipo de restaurante. É o que o cliente vê na mesa."
      />
      <IdentityForm
        restaurantId={restaurant.id}
        name={restaurant.name}
        segment={restaurant.segment}
        theme={restaurant.theme}
        logoPath={restaurant.logoPath}
        coverPath={restaurant.coverPath}
      />
    </main>
  )
}
