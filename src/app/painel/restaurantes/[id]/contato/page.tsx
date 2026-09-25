import { notFound } from 'next/navigation'
import { ProfileForm } from '@/components/painel/profile-form'
import { ThemePreview } from '@/components/painel/theme-preview'
import { PageHeader } from '@/components/shell/page-header'
import { uuidSchema } from '@/domain/common'
import { requireRestaurantAdmin } from '@/server/dal/auth'
import { getRestaurantWorkspace } from '@/server/dal/restaurant-workspace'
import { themeSchema } from '@/domain/theme'

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
  const parsedTheme = themeSchema.safeParse(restaurant.theme ?? {})
  const previewTheme = parsedTheme.success
    ? parsedTheme.data
    : { preset: 'grao' as const, base: null, accent: null, density: 'confortavel' as const }

  return (
      <main className="tavvi-page">
      <PageHeader
        className="tv-page-header"
        eyebrow="Informações públicas"
        title="Nome e contato"
        description="Estes dados aparecem no topo do cardápio e ajudam o cliente a encontrar ou chamar o restaurante."
      />
      <div className="tv-contact-layout">
        <ProfileForm
          restaurantId={restaurant.id}
          name={restaurant.name}
          description={restaurant.description}
          contact={restaurant.contact}
        />
        <aside className="tv-contact-preview tavvi-surface p-4">
          <h2 className="text-sm font-semibold">No topo do cardápio</h2>
          <p className="mt-1 text-xs text-muted-foreground">Prévia com as cores e a tipografia da Identidade.</p>
          <div className="mt-4"><ThemePreview theme={previewTheme} name={restaurant.name} mode="light" /></div>
        </aside>
      </div>
    </main>
  )
}
