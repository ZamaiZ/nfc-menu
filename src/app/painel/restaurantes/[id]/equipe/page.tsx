import { notFound } from 'next/navigation'
import { InviteDialog } from '@/components/convites/invite-dialog'
import { InviteList } from '@/components/convites/invite-list'
import { MemberRow } from '@/components/painel/member-row'
import { PageHeader } from '@/components/shell/page-header'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { uuidSchema } from '@/domain/common'
import { inviteStatus } from '@/domain/invite'
import { requireRestaurantAdmin } from '@/server/dal/auth'
import { listInvites } from '@/server/dal/invites'
import { listMembers } from '@/server/dal/members'
import { getRestaurantWorkspace } from '@/server/dal/restaurant-workspace'

export const metadata = { title: 'Equipe' }

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

  // As duas consultas são independentes: buscar em paralelo evita somar as
  // latências.
  const [members, invites] = await Promise.all([
    listMembers(restaurant.id),
    listInvites(restaurant.id),
  ])

  const pendentes = invites.filter(
    (invite) => inviteStatus(invite) === 'pendente',
  )

  return (
    <main className="tavvi-page">
      <PageHeader
        eyebrow="Acessos"
        title="Equipe"
        description="Administradores editam o restaurante. Caixa, atendente e garçom consultam o cardápio e os preços."
        actions={<InviteDialog mode="team" restaurantId={restaurant.id} />}
      />

      <div className="tavvi-surface hidden overflow-hidden md:block">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/35">
            <TableHead>Pessoa</TableHead>
            <TableHead className="w-48">Papel</TableHead>
            <TableHead>Desde</TableHead>
            <TableHead className="w-px" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <MemberRow key={member.membershipId} member={member} />
          ))}
        </TableBody>
      </Table>
      </div>

      <div className="grid gap-3 md:hidden">
        {members.map((member) => (
          <MemberRow key={member.membershipId} member={member} variant="card" />
        ))}
      </div>

      {pendentes.length > 0 ? (
        <section className="mt-12">
          <h2 className="mb-4 text-lg font-semibold tracking-[-0.02em]">
            Convites pendentes
          </h2>
          {/* `showRole` aqui, e não no console: convite de equipe carrega
              papel, o de plataforma é sempre administrador. */}
          <InviteList invites={pendentes} showRole />
        </section>
      ) : null}
    </main>
  )
}
