import { AuthShell } from '@/components/auth/auth-shell'
import { SignInForm } from '@/components/auth/sign-in-form'
import { SignUpForm } from '@/components/auth/sign-up-form'
import { AcceptInviteButton } from '@/components/painel/accept-invite-button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getCurrentUser } from '@/server/dal/auth'
import { previewInvite } from '@/server/dal/invites'

export const metadata = { title: 'Convite' }

export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  // previewInvite já aplica rate limit e já valida o formato. Token
  // desconhecido, vencido, revogado e já usado devolvem todos null — são
  // indistinguíveis daqui, que é exatamente o ponto.
  const invite = await previewInvite(token)

  if (!invite) {
    return (
      <AuthShell
        title="Convite indisponível"
        subtitle="Este convite não é mais válido. Peça um novo para quem enviou."
      />
    )
  }

  const user = await getCurrentUser()

  if (user) {
    return (
      <AuthShell
        title={invite.restaurantName}
        subtitle={`Você foi convidado a gerenciar este restaurante, entrando como ${user.email ?? 'sua conta'}.`}
      >
        <AcceptInviteButton token={token} />
      </AuthShell>
    )
  }

  // Repare no que esta página NÃO mostra: quem emitiu o convite, o e-mail
  // amarrado, ou a data. Apenas o nome do restaurante e o convite existir.
  return (
    <AuthShell
      title={invite.restaurantName}
      subtitle="Você foi convidado a gerenciar este restaurante. Entre ou crie sua conta para aceitar."
    >
      <Tabs defaultValue="criar">
        <TabsList className="w-full">
          <TabsTrigger value="criar" className="flex-1">
            Criar conta
          </TabsTrigger>
          <TabsTrigger value="entrar" className="flex-1">
            Já tenho conta
          </TabsTrigger>
        </TabsList>

        <TabsContent value="criar" className="pt-6">
          <SignUpForm />
        </TabsContent>

        <TabsContent value="entrar" className="pt-6">
          {/* O destino é esta mesma página: depois de entrar, a pessoa
              precisa voltar aqui para clicar em aceitar. O token vive no
              caminho, então atravessa a autenticação sem se perder. */}
          <SignInForm next={`/convite/${token}`} />
        </TabsContent>
      </Tabs>
    </AuthShell>
  )
}
