import { TopBar } from '@/components/shell/top-bar'
import { getCurrentUser } from '@/server/dal/auth'

export default async function PainelLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Sem requireUser aqui: este layout também envolve /entrar e
  // /convite/{token}, que precisam ser alcançáveis sem sessão.
  const user = await getCurrentUser()

  return (
    <div className="flex min-h-dvh flex-col">
      {user ? <TopBar title="Painel do restaurante" email={user.email} /> : null}
      {children}
    </div>
  )
}
