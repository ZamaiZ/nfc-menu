import { RiMailLine } from 'react-icons/ri'
import { InviteDialog } from '@/components/convites/invite-dialog'
import { InviteList } from '@/components/convites/invite-list'
import { PageHeader } from '@/components/shell/page-header'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { requirePlatformAdmin } from '@/server/dal/auth'
import { listPlatformInvites } from '@/server/dal/invites'

export const metadata = { title: 'Convites' }

export default async function Page() {
  // O proxy já redirecionou quem não tem cookie, mas checagem otimista não é
  // autorização. Quem autoriza é esta linha.
  await requirePlatformAdmin()
  const invites = await listPlatformInvites()

  return (
    <main className="tavvi-page">
      <PageHeader
        eyebrow="Plataforma"
        title="Convites"
        description="Crie acessos seguros para que novos clientes cadastrem e administrem seus restaurantes."
        actions={invites.length > 0 ? <InviteDialog mode="platform" /> : null}
      />

      {invites.length === 0 ? (
        <Empty className="tavvi-surface min-h-[360px]">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <RiMailLine />
            </EmptyMedia>
            <EmptyTitle>Nenhum convite ainda</EmptyTitle>
            <EmptyDescription>
              Emita o primeiro. Quem receber cria a conta, cria o restaurante e
              já entra como administrador dele.
            </EmptyDescription>
          </EmptyHeader>
          {/* O vazio traz a ação junto: dizer "está vazio" sem oferecer o
              próximo passo obriga a pessoa a procurar o que fazer. */}
          <EmptyContent>
            <InviteDialog mode="platform" />
          </EmptyContent>
        </Empty>
      ) : (
        <InviteList invites={invites} />
      )}
    </main>
  )
}
