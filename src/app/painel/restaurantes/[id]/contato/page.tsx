import { notFound } from 'next/navigation'
import { ProfileForm } from '@/components/painel/profile-form'
import { PageHeader } from '@/components/shell/page-header'
import { uuidSchema } from '@/domain/common'
import { requireRestaurantAdmin } from '@/server/dal/auth'
import { getRestaurantForMember } from '@/server/dal/restaurants'

export const metadata = { title: 'Contato' }

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
  await requireRestaurantAdmin(restaurant.id)

  return (
    <main className="mx-auto w-full max-w-[720px] flex-1 px-4 py-8 sm:px-6">
      <PageHeader
        title="Nome e contato"
        support="Aparece no topo do cardápio. Os contatos viram botões."
      />
      <ProfileForm
        restaurantId={restaurant.id}
        name={restaurant.name}
        description={restaurant.description}
        contact={restaurant.contact}
      />
    </main>
  )
}
