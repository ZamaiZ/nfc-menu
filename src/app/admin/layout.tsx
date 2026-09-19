import { TerritoryNav } from '@/components/shell/territory-nav'
import { TopBar } from '@/components/shell/top-bar'
import { getCurrentUser } from '@/server/dal/auth'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Sem requirePlatformAdmin aqui: o layout também envolve a tela de entrar,
  // que precisa ser alcançável sem sessão. Cada página privada faz a própria
  // checagem.
  const user = await getCurrentUser()

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Sem `territorio-painel` aqui, e sem display: o console é sóbrio de
          propósito. A ausência é a decisão. */}
      {user ? (
        <>
          <TopBar
            title="Console da plataforma"
            email={user.email}
            variant="console"
          />
          <TerritoryNav
            items={[
              { href: '/', label: 'Convites' },
              { href: '/restaurantes', label: 'Restaurantes' },
            ]}
          />
        </>
      ) : null}
      {children}
    </div>
  )
}
