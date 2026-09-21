import { notFound } from 'next/navigation'
import { ProfileForm } from '@/components/painel/profile-form'
import { PageHeader } from '@/components/shell/page-header'
import { uuidSchema } from '@/domain/common'
import { requireRestaurantAdmin } from '@/server/dal/auth'
import { getRestaurantWorkspace } from '@/server/dal/restaurant-workspace'

export const metadata = { title: 'Contato' }

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const parsed = uuidSchema.safeParse(id)
  if (!parsed.success) notFound()

  const workspace = await getRestaurantWorkspace(parsed.data)
  if (!workspace) notFound()
  const { restaurant } = workspace
  await requireRestaurantAdmin(restaurant.id)

  return (
    <main className="tavvi-page max-w-[840px]">
      <PageHeader
        eyebrow="Informações públicas"
        title="Nome e contato"
        description="Estes dados aparecem no topo do cardápio e ajudam o cliente a encontrar ou chamar o restaurante."
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
