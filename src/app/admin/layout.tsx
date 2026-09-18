import { TopBar } from '@/components/shell/top-bar'
import { getCurrentUser } from '@/server/dal/auth'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Sem requirePlatformAdmin aqui: o layout também envolve a tela de
  // entrar, que precisa ser alcançável sem sessão. Cada página privada faz
  // a própria checagem.
  const user = await getCurrentUser()

  return (
    <div className="flex min-h-dvh flex-col">
      {user ? <TopBar title="Console da plataforma" email={user.email} /> : null}
      {children}
    </div>
  )
}
