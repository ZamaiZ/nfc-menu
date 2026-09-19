'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import {
  RiExternalLinkLine,
  RiEyeOffLine,
  RiGlobalLine,
  RiSendPlaneLine,
} from 'react-icons/ri'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import type { RestaurantStatus } from '@/domain/restaurant'
import { setPublishedAction } from '@/server/actions/restaurants'

const APOIO: Record<RestaurantStatus, string> = {
  active: 'Quem encostar o celular na plaquinha vê o cardápio.',
  draft: 'Só você vê. Publique quando terminar de montar.',
  suspended: 'Fale com o administrador da plataforma.',
}

const ROTULO: Record<RestaurantStatus, string> = {
  active: 'No ar',
  draft: 'Rascunho',
  suspended: 'Suspenso',
}

export function PublishBar({
  restaurantId,
  status,
  publicUrl,
  canEdit,
}: {
  restaurantId: string
  status: RestaurantStatus
  publicUrl: string
  canEdit: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [situacao, setSituacao] = useState<RestaurantStatus>(status)

  function alternar(published: boolean) {
    // A action vai DENTRO de startTransition: é o contrato documentado do
    // Next 16.3.5 para chamada vinda de manipulador de evento. Fora dela, a
    // revalidação pode não voltar aplicada, e a tela fica velha depois de uma
    // operação que deu certo.
    startTransition(async () => {
      const result = await setPublishedAction({ restaurantId, published })
      if (result.ok) {
        setSituacao(published ? 'active' : 'draft')
        toast.add({
          title: published ? 'Cardápio publicado' : 'Cardápio despublicado',
          type: 'success',
        })
      } else {
        // Sem atualizar a situação: a gravação falhou, e uma faixa mostrando
        // "no ar" depois de uma falha mente sobre o estado do sistema.
        toast.add({ title: result.error, type: 'error' })
      }
    })
  }

  const noAr = situacao === 'active'

  return (
    <div className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border border-border bg-surface-2 p-4 shadow-[var(--shadow-1)]">
      <span className="flex items-center gap-2 text-card font-semibold">
        <RiGlobalLine
          className={noAr ? 'size-4 text-status-active' : 'size-4 text-muted-foreground'}
          aria-hidden="true"
        />
        {ROTULO[situacao]}
      </span>

      <p className="text-small text-muted-foreground">{APOIO[situacao]}</p>

      <div className="ml-auto flex flex-wrap gap-2">
        {noAr ? (
          <Button
            variant="outline"
            render={
              <Link href={publicUrl} target="_blank" rel="noopener noreferrer" />
            }
          >
            <RiExternalLinkLine className="size-4" />
            Ver no ar
          </Button>
        ) : null}

        {canEdit && situacao !== 'suspended' ? (
          <Button
            disabled={pending}
            variant={noAr ? 'outline' : 'default'}
            onClick={() => alternar(!noAr)}
          >
            {pending ? (
              <Spinner className="size-4" />
            ) : noAr ? (
              <RiEyeOffLine className="size-4" />
            ) : (
              <RiSendPlaneLine className="size-4" />
            )}
            {noAr ? 'Despublicar' : 'Publicar cardápio'}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
