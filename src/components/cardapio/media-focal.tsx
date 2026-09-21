'use client'

import { useState, useTransition } from 'react'
import { RiCrosshair2Line } from 'react-icons/ri'
import { toast } from '@/components/ui/toast'
import type { OwnerMenuItemDTO } from '@/domain/menu'
import { publicMediaUrl } from '@/lib/media-url'
import { setMediaFocalAction } from '@/server/actions/media'

// Um clique, e não um editor de recorte. No feed a foto é desenhada em tela
// cheia com `cover`, e o que se perde é a sobra fora do quadro. O que o dono
// precisa dizer é uma coisa só: qual ponto não pode sair. Um editor de
// recorte seria uma tela inteira para o mesmo ganho.
export function MediaFocal({
  media,
}: {
  media: OwnerMenuItemDTO['media'][number]
}) {
  const [ponto, setPonto] = useState({ x: media.focalX, y: media.focalY })
  const [pending, startTransition] = useTransition()

  const preview =
    media.kind === 'image'
      ? publicMediaUrl('image', media.storagePath)
      : media.posterPath
        ? publicMediaUrl('image', media.posterPath)
        : null

  if (!preview) return null

  function marcar(event: React.MouseEvent<HTMLButtonElement>) {
    const caixa = event.currentTarget.getBoundingClientRect()
    const x = Math.min(1, Math.max(0, (event.clientX - caixa.left) / caixa.width))
    const y = Math.min(1, Math.max(0, (event.clientY - caixa.top) / caixa.height))
    setPonto({ x, y })

    // A action vai DENTRO de startTransition: é o contrato do Next 16.3.5
    // para chamada vinda de manipulador de evento.
    startTransition(async () => {
      const result = await setMediaFocalAction({
        mediaId: media.id,
        focalX: x,
        focalY: y,
      })
      if (result.ok) {
        toast.add({ title: 'Enquadramento salvo', type: 'success' })
      } else {
        // A marca volta para onde estava: mostrar a marca nova depois de uma
        // gravação que falhou mentiria sobre o estado do sistema.
        setPonto({ x: media.focalX, y: media.focalY })
        toast.add({ title: result.error, type: 'error' })
      }
    })
  }

  return (
    <div>
      <p className="mb-1.5 text-small text-muted-foreground">
        Clique no ponto que não pode sair do quadro.
      </p>
      <button
        type="button"
        onClick={marcar}
        disabled={pending}
        aria-label="Marcar o ponto de enquadramento"
        className="relative block aspect-[9/16] w-[120px] overflow-hidden rounded-lg border border-border disabled:opacity-60"
      >
        {/* A miniatura é 9:16 de propósito: ela mostra o enquadramento COMO O
            CLIENTE VAI VER, e não a foto inteira. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={preview}
          alt=""
          className="h-full w-full object-cover"
          style={{ objectPosition: `${ponto.x * 100}% ${ponto.y * 100}%` }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-white drop-shadow-[0_0_3px_rgba(0,0,0,0.9)]"
          style={{ left: `${ponto.x * 100}%`, top: `${ponto.y * 100}%` }}
        >
          <RiCrosshair2Line className="size-6" />
        </span>
      </button>
    </div>
  )
}
