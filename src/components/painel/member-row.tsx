'use client'

import { useState, useTransition } from 'react'
import { RiDeleteBinLine } from 'react-icons/ri'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/native-select'
import { TableCell, TableRow } from '@/components/ui/table'
import { toast } from '@/components/ui/toast'
import {
  MEMBER_ROLE_LABELS,
  type MemberDTO,
  type MemberRole,
} from '@/domain/invite'
import {
  changeMemberRoleAction,
  removeMemberAction,
} from '@/server/actions/members'

export function MemberRow({ member }: { member: MemberDTO }) {
  const [pending, startTransition] = useTransition()
  const [papel, setPapel] = useState<MemberRole>(member.role)
  const [removeOpen, setRemoveOpen] = useState(false)

  function trocarPapel(novo: MemberRole) {
    const anterior = papel
    setPapel(novo)

    startTransition(async () => {
      const result = await changeMemberRoleAction({
        membershipId: member.membershipId,
        role: novo,
      })

      if (result.ok) {
        toast.add({ title: 'Papel atualizado', type: 'success' })
      } else {
        // Reverte. Um seletor mostrando o papel novo depois de a gravação ter
        // falhado mente sobre o estado do sistema — e o caso mais comum aqui
        // é justamente a trava do último administrador.
        setPapel(anterior)
        toast.add({ title: result.error, type: 'error' })
      }
    })
  }

  function remover() {
    startTransition(async () => {
      const result = await removeMemberAction(member.membershipId)
      toast.add(
        result.ok
          ? { title: 'Membro removido', type: 'success' }
          : { title: result.error, type: 'error' },
      )
    })
  }

  return (
    <TableRow className="h-14">
      <TableCell>
        <span className="font-medium">
          {member.displayName ?? member.email ?? 'Sem identificação'}
        </span>
        {member.displayName && member.email ? (
          <span className="block text-small text-muted-foreground">
            {member.email}
          </span>
        ) : null}
      </TableCell>

      <TableCell>
        <NativeSelect
          value={papel}
          disabled={pending}
          aria-label={`Papel de ${member.email ?? member.displayName ?? 'membro'}`}
          onChange={(event) => trocarPapel(event.target.value as MemberRole)}
        >
          {(Object.keys(MEMBER_ROLE_LABELS) as MemberRole[]).map((role) => (
            <option key={role} value={role}>
              {MEMBER_ROLE_LABELS[role]}
            </option>
          ))}
        </NativeSelect>
      </TableCell>

      <TableCell className="text-muted-foreground">
        {new Date(member.joinedAt).toLocaleDateString('pt-BR')}
      </TableCell>

      <TableCell>
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => setRemoveOpen(true)}
        >
          <RiDeleteBinLine className="size-4" />
          Remover
        </Button>

        {/* Irmão do botão, controlado por estado. Diálogo montado dentro de
            menu suspenso some junto com o menu e nunca chega a aparecer. */}
        <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Remover {member.email ?? member.displayName ?? 'este membro'}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                A pessoa perde o acesso a este restaurante na hora. Para voltar,
                precisará de um convite novo.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={remover}>Remover</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  )
}
