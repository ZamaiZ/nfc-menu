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

  // `territorio-painel` troca a face de título pela serifada, e com isso todo
  // Card, Dialog, Sheet e Empty daqui para baixo herda o display sem saber
  // que existe território. O console não recebe a classe.
  return (
    <div className="territorio-painel flex min-h-dvh flex-col">
      {user ? <TopBar title="Painel do restaurante" email={user.email} /> : null}
      {children}
    </div>
  )
}
