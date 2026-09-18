'use client'

import { useRef, useState, useTransition } from 'react'
import { RiDeleteBinLine, RiFilmLine, RiImageAddLine } from 'react-icons/ri'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { MEDIA_LIMITS } from '@/domain/media'
import type { OwnerMenuItemDTO } from '@/domain/menu'
import { publicMediaUrl } from '@/lib/media-url'
import {
  captureVideoPoster,
  readVideoDurationMs,
  uploadToSignedUrl,
} from '@/lib/upload'
import {
  createUploadTicketAction,
  deleteItemMediaAction,
  registerItemMediaAction,
} from '@/server/actions/media'

const MAX_VIDEO_MS = 15_000

export function MediaEditor({
  itemId,
  media,
}: {
  itemId: string
  media: OwnerMenuItemDTO['media']
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const limits = MEDIA_LIMITS.image
  const images = media.filter((entry) => entry.kind === 'image')
  const full = images.length >= limits.maxPerItem
  const video = media.find((entry) => entry.kind === 'video')

  function handleFile(file: File) {
    setError(null)

    // As tres checagens de navegador acontecem FORA da transicao: sao
    // instantaneas e nao tocam a rede. Errar o formato nao deve nem acender
    // o indicador de carregamento.
    if (!(limits.mimes as readonly string[]).includes(file.type)) {
      setError('Formato não aceito. Use JPEG, PNG, WebP ou AVIF.')
      return
    }
    if (file.size > limits.maxBytes) {
      setError('Imagem acima de 5 MB. Reduza antes de enviar.')
      return
    }
    if (full) {
      setError(`Máximo de ${limits.maxPerItem} imagens por item.`)
      return
    }

    // Daqui para baixo, tudo dentro de startTransition. O guia de Server
    // Functions do Next 16 e explicito: de um manipulador de evento, a action
    // vai envolvida numa transicao. E assim que a revalidacao volta aplicada
    // e a galeria mostra a foto que acabou de subir.
    startTransition(async () => {
      // 1. O servidor autoriza e devolve o caminho. O navegador nunca escolhe
      //    onde grava.
      const ticket = await createUploadTicketAction({
        itemId,
        kind: 'image',
        mimeType: file.type,
      })
      if (!ticket.ok) {
        setError(ticket.error)
        return
      }

      // 2. O arquivo vai direto para o Storage, sem passar pelo nosso
      //    servidor.
      try {
        await uploadToSignedUrl(ticket.data.signedUrl, file, file.type)
      } catch {
        setError('Falha ao enviar a imagem. Tente de novo.')
        return
      }

      // 3. O servidor revalida o prefixo, confere o teto e grava a linha.
      const registered = await registerItemMediaAction({
        itemId,
        kind: 'image',
        storagePath: ticket.data.path,
      })

      if (registered.ok) {
        toast.add({ title: 'Imagem enviada', type: 'success' })
      } else {
        setError(registered.error)
      }
    })
  }

  // A capa e opcional POR CONSTRUCAO (decisao C5). Toda falha aqui devolve
  // undefined e o video sobe do mesmo jeito.
  async function uploadPoster(file: File): Promise<string | undefined> {
    const poster = await captureVideoPoster(file)
    if (!poster) return undefined

    // O tipo que o navegador DEVOLVEU, nao o que foi pedido. Safari antigo
    // aceita o pedido de WebP e entrega PNG calado; subir esse arquivo como
    // .webp, servido como image/webp, daria uma capa que nada desenha.
    const mimeType = poster.type
    if (!(MEDIA_LIMITS.image.mimes as readonly string[]).includes(mimeType)) {
      return undefined
    }

    const ticket = await createUploadTicketAction({
      itemId,
      kind: 'image',
      mimeType,
    })
    if (!ticket.ok) return undefined

    try {
      await uploadToSignedUrl(ticket.data.signedUrl, poster, mimeType)
      return ticket.data.path
    } catch {
      // Capa perdida, video segue. Nao vale interromper por isso.
      return undefined
    }
  }

  function handleVideo(file: File) {
    setError(null)

    const videoLimits = MEDIA_LIMITS.video
    if (!(videoLimits.mimes as readonly string[]).includes(file.type)) {
      setError('Formato não aceito. Use MP4 ou WebM.')
      return
    }
    if (file.size > videoLimits.maxBytes) {
      setError('Vídeo acima de 10 MB. Reduza antes de enviar.')
      return
    }
    if (video) {
      setError('Este item já tem um vídeo. Remova o atual para enviar outro.')
      return
    }

    startTransition(async () => {
      // A duracao exige decodificar, entao so aqui dentro. Null significa que
      // o navegador nao soube dizer -- nesse caso passamos sem afirmar nada,
      // porque o servidor tambem nao consegue conferir sem transcodificar.
      const durationMs = await readVideoDurationMs(file)
      if (durationMs !== null && durationMs > MAX_VIDEO_MS) {
        setError('O vídeo pode ter no máximo 15 segundos.')
        return
      }

      const posterPath = await uploadPoster(file)

      const ticket = await createUploadTicketAction({
        itemId,
        kind: 'video',
        mimeType: file.type,
      })
      if (!ticket.ok) {
        setError(ticket.error)
        return
      }

      try {
        await uploadToSignedUrl(ticket.data.signedUrl, file, file.type)
      } catch {
        setError('Falha ao enviar o vídeo. Tente de novo.')
        return
      }

      const registered = await registerItemMediaAction({
        itemId,
        kind: 'video',
        storagePath: ticket.data.path,
        posterPath,
        durationMs: durationMs ?? undefined,
      })

      if (!registered.ok) {
        setError(registered.error)
        return
      }

      toast.add(
        posterPath
          ? { title: 'Vídeo enviado', type: 'success' }
          : {
              title: 'Vídeo enviado',
              description:
                'Não foi possível gerar a capa automaticamente. O vídeo funciona normalmente.',
              type: 'info',
            },
      )
    })
  }

  return (
    <div className="space-y-4">
      {images.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Sem imagens. Uma boa foto é o que faz a pessoa escolher o prato.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-3">
          {images.map((entry) => (
            <li key={entry.id} className="relative">
              <img
                src={publicMediaUrl('image', entry.storagePath)}
                alt={entry.altText ?? ''}
                width={96}
                height={96}
                loading="lazy"
                className="size-24 rounded-md object-cover"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                disabled={pending}
                aria-label="Remover imagem"
                className="absolute -right-2 -top-2 size-7"
                onClick={() =>
                  startTransition(async () => {
                    const result = await deleteItemMediaAction(entry.id)
                    if (!result.ok) {
                      toast.add({ title: result.error, type: 'error' })
                    }
                  })
                }
              >
                <RiDeleteBinLine className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {/* O seletor nativo abre camera ou galeria no celular sem componente
          proprio. O input fica escondido e o botao o aciona. */}
      <input
        ref={inputRef}
        type="file"
        accept={limits.mimes.join(',')}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) handleFile(file)
          event.target.value = ''
        }}
      />

      <Button
        type="button"
        variant="outline"
        disabled={pending || full}
        onClick={() => inputRef.current?.click()}
      >
        {pending ? (
          <Spinner className="size-4" />
        ) : (
          <RiImageAddLine className="size-4" />
        )}
        {full ? `Limite de ${limits.maxPerItem} imagens` : 'Enviar imagem'}
      </Button>

      <div className="space-y-3 border-t border-border pt-4">
        {video ? (
          <div className="relative w-fit">
            <video
              src={publicMediaUrl('video', video.storagePath)}
              poster={
                video.posterPath
                  ? publicMediaUrl('image', video.posterPath)
                  : undefined
              }
              controls
              muted
              playsInline
              preload="metadata"
              className="h-40 rounded-md"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              disabled={pending}
              aria-label="Remover vídeo"
              className="absolute -right-2 -top-2 size-7"
              onClick={() =>
                startTransition(async () => {
                  const result = await deleteItemMediaAction(video.id)
                  if (!result.ok) {
                    toast.add({ title: result.error, type: 'error' })
                  }
                })
              }
            >
              <RiDeleteBinLine className="size-3.5" />
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Sem vídeo. Um por item, de até 15 segundos e 10 MB.
          </p>
        )}

        <input
          ref={videoInputRef}
          type="file"
          accept={MEDIA_LIMITS.video.mimes.join(',')}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) handleVideo(file)
            event.target.value = ''
          }}
        />

        <Button
          type="button"
          variant="outline"
          disabled={pending || Boolean(video)}
          onClick={() => videoInputRef.current?.click()}
        >
          {pending ? (
            <Spinner className="size-4" />
          ) : (
            <RiFilmLine className="size-4" />
          )}
          {video ? 'Já tem um vídeo' : 'Enviar vídeo'}
        </Button>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
