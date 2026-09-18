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
      title="Painel do restaurante"
      subtitle="Entre para cuidar do seu cardápio."
    >
      <SignInForm next={safeNextPath(next, '/')} />
    </AuthShell>
  )
}
