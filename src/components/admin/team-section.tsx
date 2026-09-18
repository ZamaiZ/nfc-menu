'use client'

import { useTransition } from 'react'
import { RiDeleteBinLine } from 'react-icons/ri'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from '@/components/ui/toast'
import type { InviteDTO, MemberDTO } from '@/domain/invite'
import { revokeInviteAction } from '@/server/actions/invites'
import { removeMemberAction } from '@/server/actions/members'
import type { ActionResult } from '@/server/actions/result'
import { InviteDialog } from './invite-dialog'

function inviteState(invite: InviteDTO): string {
  if (invite.revokedAt) return 'Revogado'
  if (invite.redeemedAt) return 'Usado'
  if (new Date(invite.expiresAt) < new Date()) return 'Vencido'
  return 'Aguardando'
}

export function TeamSection({
  restaurantId,
  members,
  invites,
}: {
  restaurantId: string
  members: MemberDTO[]
  invites: InviteDTO[]
}) {
  const [pending, startTransition] = useTransition()

  function run(action: () => Promise<ActionResult>, done: string) {
    startTransition(async () => {
      const result = await action()
      toast.add(
        result.ok
          ? { title: done, type: 'success' }
          : { title: result.error, type: 'error' },
      )
    })
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="mb-4 text-base font-semibold">Membros</h3>

        {members.length === 0 ? (
          <p className="text-muted-foreground">
            Ninguém tem acesso ainda. Emita um convite abaixo.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pessoa</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.membershipId} className="h-14">
                  <TableCell>
                    <span className="font-medium">
                      {member.displayName ?? member.email ?? 'Sem identificação'}
                    </span>
                    {member.displayName && member.email ? (
                      <span className="block text-sm text-muted-foreground">
                        {member.email}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {member.role === 'owner' ? 'Dono' : 'Gerente'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() =>
                        run(
                          () => removeMemberAction(member.membershipId),
                          'Membro removido',
                        )
                      }
                    >
                      <RiDeleteBinLine className="size-4" />
                      Remover
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="text-base font-semibold">Convites</h3>
          <InviteDialog restaurantId={restaurantId} />
        </div>

        {invites.length === 0 ? (
          <p className="text-muted-foreground">Nenhum convite emitido.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Situação</TableHead>
                <TableHead>E-mail amarrado</TableHead>
                <TableHead>Vence em</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {invites.map((invite) => {
                const state = inviteState(invite)
                return (
                  <TableRow key={invite.id} className="h-14">
                    {/* Situação é sempre texto, nunca só um ponto colorido. */}
                    <TableCell>{state}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {invite.email ?? 'Qualquer pessoa com o link'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(invite.expiresAt).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      {/* Revogar só aparece em convite que ainda pode ser
                          usado: oferecer o botão num já usado sugeriria que
                          ele faria alguma coisa. */}
                      {state === 'Aguardando' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={pending}
                          onClick={() =>
                            run(
                              () => revokeInviteAction(invite.id),
                              'Convite revogado',
                            )
                          }
                        >
                          Revogar
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
