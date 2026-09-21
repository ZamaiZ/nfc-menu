import { notFound } from 'next/navigation'
import { TavviShell } from '@/components/shell/tavvi-shell'
import { getRestaurantNavigation } from '@/components/shell/navigation'
import { uuidSchema } from '@/domain/common'
import { getCurrentUser } from '@/server/dal/auth'
import { getRestaurantWorkspace } from '@/server/dal/restaurant-workspace'

export default async function RestauranteLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const parsed = uuidSchema.safeParse(id)
  if (!parsed.success) notFound()

  // Só o papel e o nome, e só para montar a casca. A autorização de verdade é
  // de cada página, e depois da DAL, e depois da RLS.
  const [workspace, user] = await Promise.all([
    getRestaurantWorkspace(parsed.data),
    getCurrentUser(),
  ])
  if (!workspace) notFound()

  return (
    <TavviShell
      config={{
        homeHref: `/restaurantes/${parsed.data}`,
        userLabel: user?.email ?? null,
        contextLabel: workspace.restaurant.name,
        contextDescription: 'Painel do restaurante',
        items: getRestaurantNavigation(parsed.data, workspace.canEdit),
      }}
    >
      {children}
    </TavviShell>
  )
}
