'use client'

import { useRef, useState, useTransition } from 'react'
import { RiDeleteBinLine, RiImageAddLine } from 'react-icons/ri'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { BRAND_SLOT_LABELS, MEDIA_LIMITS, type BrandSlot } from '@/domain/media'
import { publicMediaUrl } from '@/lib/media-url'
import { uploadToSignedUrl } from '@/lib/upload'
import {
  createBrandUploadTicketAction,
  setBrandImageAction,
} from '@/server/actions/media'

const AJUDA: Record<BrandSlot, string> = {
  logo: 'Quadrada funciona melhor. Aparece sobre a capa, no topo do cardápio.',
  cover: 'Deitada, bem larga. É a primeira coisa que o cliente vê.',
}

function Slot({
  restaurantId,
  slot,
  path,
}: {
  restaurantId: string
  slot: BrandSlot
  path: string | null
}) {
  const input = useRef<HTMLInputElement>(null)
  const [atual, setAtual] = useState<string | null>(path)
  const [pending, startTransition] = useTransition()

  function enviar(file: File) {
    if (file.size > MEDIA_LIMITS.image.maxBytes) {
      toast.add({
        title: 'Arquivo grande demais',
        description: `O limite é ${Math.round(MEDIA_LIMITS.image.maxBytes / 1_048_576)} MB.`,
        type: 'error',
      })
      return
    }

    // As actions vão DENTRO de startTransition por virem de manipulador de
    // evento — contrato documentado do Next 16.3.5. Fora dela, a revalidação
    // pode não voltar aplicada e a tela fica velha depois de um envio que
    // deu certo.
    startTransition(async () => {
      const ticket = await createBrandUploadTicketAction({
        restaurantId,
        slot,
        mimeType: file.type,
      })
      if (!ticket.ok) {
        toast.add({ title: ticket.error, type: 'error' })
        return
      }

      try {
        await uploadToSignedUrl(ticket.data.signedUrl, file, file.type)
      } catch {
        toast.add({ title: 'Não foi possível enviar o arquivo.', type: 'error' })
        return
      }

      const salvo = await setBrandImageAction({
        restaurantId,
        slot,
        storagePath: ticket.data.path,
      })
      if (salvo.ok) {
        setAtual(ticket.data.path)
        toast.add({ title: `${BRAND_SLOT_LABELS[slot]} atualizada`, type: 'success' })
      } else {
        toast.add({ title: salvo.error, type: 'error' })
      }
    })
  }

  function remover() {
    startTransition(async () => {
      const result = await setBrandImageAction({
        restaurantId,
        slot,
        storagePath: null,
      })
      if (result.ok) {
        setAtual(null)
        toast.add({ title: `${BRAND_SLOT_LABELS[slot]} removida`, type: 'success' })
      } else {
        toast.add({ title: result.error, type: 'error' })
      }
    })
  }

  return (
    <div>
      <p className="text-small font-medium">{BRAND_SLOT_LABELS[slot]}</p>

      <div
        className={`mt-2 overflow-hidden rounded-lg border border-border bg-surface-1 ${
          slot === 'logo' ? 'size-24' : 'h-24 w-full'
        }`}
      >
        {atual ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={publicMediaUrl('image', atual)}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <RiImageAddLine className="size-6" aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <input
          ref={input}
          type="file"
          accept={MEDIA_LIMITS.image.mimes.join(',')}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            // Limpa o valor para que escolher o MESMO arquivo de novo depois
            // de um erro volte a disparar o onChange.
            event.target.value = ''
            if (file) enviar(file)
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => input.current?.click()}
        >
          {pending ? <Spinner className="size-4" /> : <RiImageAddLine className="size-4" />}
          {atual ? 'Trocar' : 'Enviar'}
        </Button>
        {atual ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={remover}
          >
            <RiDeleteBinLine className="size-4" />
            Remover
          </Button>
        ) : null}
      </div>

      <p className="mt-1.5 text-small text-muted-foreground">{AJUDA[slot]}</p>
    </div>
  )
}

export function BrandImages({
  restaurantId,
  logoPath,
  coverPath,
}: {
  restaurantId: string
  logoPath: string | null
  coverPath: string | null
}) {
  return (
    <div className="grid gap-6 sm:grid-cols-[auto_minmax(0,1fr)]">
      <Slot restaurantId={restaurantId} slot="logo" path={logoPath} />
      <Slot restaurantId={restaurantId} slot="cover" path={coverPath} />
    </div>
  )
}
