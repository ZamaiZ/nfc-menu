import { AuthShell } from '@/components/auth/auth-shell'
import { SignInForm } from '@/components/auth/sign-in-form'
import { safeNextPath } from '@/domain/common'

export const metadata = { title: 'Entrar' }

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams

  return (
    <AuthShell
      title="Console da plataforma"
      subtitle="Entre para gerenciar os restaurantes."
    >
      {/* Sanitizado aqui E de novo dentro da action. O campo oculto é
          controlado pelo navegador, então o valor volta pelo formulário e
          não pode ser confiado só porque saiu daqui limpo. */}
      <SignInForm next={safeNextPath(next, '/')} />
    </AuthShell>
  )
}
