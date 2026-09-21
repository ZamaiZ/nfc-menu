import { TavviShell } from '@/components/shell/tavvi-shell'
import { getAdminNavigation } from '@/components/shell/navigation'
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

  // Sem `territorio-painel`: o console é sóbrio de propósito, e a ausência é
  // a decisão. Desde a Fase 5 isso importa menos — a serifada saiu da
  // herança —, mas a classe continua sendo o marcador de território.
  if (!user) {
    return <div className="territorio-admin flex min-h-dvh flex-col">{children}</div>
  }

  return (
    <div className="territorio-admin min-h-dvh">
      <TavviShell
        config={{
          homeHref: '/',
          userLabel: user.email,
          contextLabel: 'Console',
          contextDescription: 'Administração da plataforma',
          items: getAdminNavigation(),
        }}
      >
        {children}
      </TavviShell>
    </div>
  )
}
