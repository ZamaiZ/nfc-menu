'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import {
  RiExternalLinkLine,
  RiEyeOffLine,
  RiGlobalLine,
  RiSendPlaneLine,
} from 'react-icons/ri'
import { Copiavel } from '@/components/shell/copiavel'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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
  semMidia,
}: {
  restaurantId: string
  status: RestaurantStatus
  publicUrl: string
  canEdit: boolean
  /** Itens visíveis sem foto nem vídeo. Zero libera a publicação. */
  semMidia: number
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
    // `Card`, e não `rounded-xl border bg-surface-2` montado à mão. O
    // primitivo existia desde a Fase 1 e nunca tinha sido importado por
    // nenhuma tela — era uma das 42 peças do sistema de design que o painel
    // ignorava, e é por isso que cada superfície tinha números um pouco
    // diferentes.
    <Card className="mb-8 flex-row flex-wrap items-center gap-x-4 gap-y-3 rounded-[18px] border-border/70 p-4 shadow-[var(--shadow-1)] sm:p-5">
      <span className="flex items-center gap-2 text-card font-semibold">
        <RiGlobalLine
          className={noAr ? 'size-4 text-status-active' : 'size-4 text-muted-foreground'}
          aria-hidden="true"
        />
        {ROTULO[situacao]}
      </span>

      <p className="text-small text-muted-foreground">{APOIO[situacao]}</p>

      {/* O endereço público passa a ser COPIÁVEL. Ele é a coisa que o dono
          mais precisa levar para fora do painel — vai na plaquinha, no
          Instagram, no WhatsApp — e até aqui era texto morto. */}
      {noAr ? (
        <Copiavel
          valor={publicUrl}
          rotulo="endereço do cardápio"
          className="w-full sm:w-auto sm:min-w-[18rem]"
        />
      ) : null}

      <div className="ml-auto flex flex-wrap gap-2">
        {noAr ? (
          // Link estilizado, e não Button com `render`. A doc local do Base UI
          // (`button.md:150`) é explícita: âncora tem semântica própria e não
          // deve receber semântica de botão pelo `render`. Era esta a origem
          // do erro de console "expected a native <button>".
          <Link
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: 'outline' })}
          >
            <RiExternalLinkLine className="size-4" />
            Ver no ar
          </Link>
        ) : null}

        {canEdit && situacao !== 'suspended' ? (
          <Button
            // Travar o botão é CORTESIA. A regra é o `setPublished`, que
            // recusa de novo no servidor — e quem chamar a action na mão
            // continua barrado.
            disabled={pending || (!noAr && semMidia > 0)}
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
            {pending
              ? noAr ? 'Despublicando…' : 'Publicando…'
              : noAr ? 'Despublicar' : 'Publicar cardápio'}
          </Button>
        ) : null}
      </div>

      {!noAr && semMidia > 0 ? (
        <p className="w-full text-small text-status-suspended">
          {semMidia === 1
            ? 'Um item visível ainda está sem foto nem vídeo.'
            : `${semMidia} itens visíveis ainda estão sem foto nem vídeo.`}{' '}
          O cardápio é um feed de fotos — procure a marca{' '}
          <strong>Sem foto</strong> na lista abaixo.
        </p>
      ) : null}
    </Card>
  )
}
