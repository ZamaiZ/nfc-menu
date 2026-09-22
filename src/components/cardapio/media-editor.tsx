'use client'

import { useCallback, useEffect, useImperativeHandle, useRef, useState, useTransition } from 'react'
import { MediaDropzone } from '@/components/cardapio/media-dropzone'
import { MediaFocal } from '@/components/cardapio/media-focal'
import { formatFileSize, MediaItem } from '@/components/cardapio/media-item'
import { AttachmentGroup } from '@/components/ui/attachment'
import { toast } from '@/components/ui/toast'
import { MAX_MIDIAS_POR_ITEM as MAX_MEDIA_PER_ITEM, MEDIA_LIMITS } from '@/domain/media'
import type { OwnerMenuItemDTO } from '@/domain/menu'
import { comprimirImagem as compressImage } from '@/lib/media/comprimir-imagem'
import { comprimirVideo as compressVideo } from '@/lib/media/comprimir-video'
import type { MidiaPendente as PendingMedia } from '@/lib/media/tipos'
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
  reorderItemMediaAction,
} from '@/server/actions/media'

const MAX_VIDEO_MS = 15_000

const ACCEPTED_TYPES = [
  ...MEDIA_LIMITS.image.mimes,
  ...MEDIA_LIMITS.video.mimes,
] as readonly string[]

export type MediaEditorHandle = {
  /** Sobe tudo o que está pendente. `false` se alguma falhou. */
  uploadPending: (itemId: string) => Promise<boolean>
  /** Quantas pendentes existem agora. O diálogo usa para avisar ao fechar. */
  getPendingCount: () => number
}

// O editor de mídia, reescrito na Fase 5 sobre STAGING.
//
// Até a Fase 4 cada arquivo subia no instante em que era escolhido. Isso
// gravava arquivo de quem desistiu do item no meio, e — pior — tornava
// impossível anexar mídia ao CRIAR um item, porque `registerItemMedia` exige
// um `itemId` que ainda não existe.
//
// Agora os arquivos ficam em blob até o dono confirmar. `itemId` nulo é
// exatamente o caso de criação: o editor acumula e quem sobe é o diálogo,
// depois que o item nasce.
export function MediaEditor({
  itemId,
  media,
  ref,
  onPendingChange,
}: {
  itemId: string | null
  media: OwnerMenuItemDTO['media']
  ref?: React.Ref<MediaEditorHandle>
  onPendingChange?: (count: number) => void
}) {
  const [pendingMedia, setPendingMedia] = useState<PendingMedia[]>([])
  const [error, setError] = useState<string | null>(null)
  const [transitionPending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(
    media[0]?.id ?? null,
  )

  const savedMedia = [...media].sort((a, b) => a.position - b.position)
  const remainingSlots = Math.max(
    0,
    MAX_MEDIA_PER_ITEM - savedMedia.length - pendingMedia.length,
  )
  const selectedMedia =
    savedMedia.find((entry) => entry.id === selectedId) ??
    savedMedia[0] ??
    null

  // `useRef` do array para a limpeza no desmonte enxergar o valor ATUAL. Um
  // efeito com `[]` de dependências fecharia sobre o array vazio inicial e
  // não revogaria nada — e um dono que troca dez fotos numa sessão seguraria
  // dez blobs na memória do celular.
  const pendingMediaRef = useRef<PendingMedia[]>([])
  pendingMediaRef.current = pendingMedia

  useEffect(() => {
    return () => {
      for (const pendingItem of pendingMediaRef.current) {
        URL.revokeObjectURL(pendingItem.previewUrl)
      }
    }
  }, [])

  useEffect(() => {
    onPendingChange?.(pendingMedia.length)
  }, [pendingMedia.length, onPendingChange])

  const updatePending = useCallback(
    (idLocal: string, changes: Partial<PendingMedia>) => {
      setPendingMedia((current) =>
        current.map((pendingItem) =>
          pendingItem.idLocal === idLocal
            ? { ...pendingItem, ...changes }
            : pendingItem,
        ),
      )
    },
    [],
  )

  function handleFiles(files: File[]) {
    setError(null)

    const newMedia: PendingMedia[] = []
    let availableSlots = remainingSlots

    for (const file of files) {
      // Recusado AQUI, antes de qualquer processamento. Errar o formato não
      // deve nem acender indicador de carregamento.
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError(`"${file.name}" não é uma foto nem um vídeo aceito.`)
        continue
      }
      if (availableSlots <= 0) {
        setError(`Este prato já chegou a ${MAX_MEDIA_PER_ITEM} telas.`)
        break
      }

      newMedia.push({
        idLocal: crypto.randomUUID(),
        arquivo: file,
        previewUrl: URL.createObjectURL(file),
        kind: file.type.startsWith('video/') ? 'video' : 'image',
        estado: 'pendente',
        progresso: 0,
      })
      availableSlots -= 1
    }

    if (newMedia.length > 0) {
      setPendingMedia((current) => [...current, ...newMedia])
    }
  }

  function removePending(idLocal: string) {
    setPendingMedia((current) => {
      const target = current.find((pendingItem) => pendingItem.idLocal === idLocal)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return current.filter((pendingItem) => pendingItem.idLocal !== idLocal)
    })
  }

  function movePending(index: number, direction: -1 | 1) {
    setPendingMedia((current) => {
      const destination = index + direction
      if (destination < 0 || destination >= current.length) return current
      const nextOrder = [...current]
      const [moved] = nextOrder.splice(index, 1)
      nextOrder.splice(destination, 0, moved)
      return nextOrder
    })
  }

  function moveSaved(index: number, direction: -1 | 1) {
    if (!itemId) return
    const destination = index + direction
    if (destination < 0 || destination >= savedMedia.length) return

    const nextOrder = [...savedMedia]
    const [moved] = nextOrder.splice(index, 1)
    nextOrder.splice(destination, 0, moved)

    startTransition(async () => {
      const result = await reorderItemMediaAction({
        itemId,
        order: nextOrder.map((entry, position) => ({
          id: entry.id,
          position,
        })),
      })
      if (!result.ok) toast.add({ title: result.error, type: 'error' })
    })
  }

  function removeSaved(mediaId: string) {
    startTransition(async () => {
      const result = await deleteItemMediaAction(mediaId)
      if (!result.ok) toast.add({ title: result.error, type: 'error' })
    })
  }

  // A capa é opcional POR CONSTRUÇÃO (decisão C5 da Fase 2). Toda falha aqui
  // devolve undefined e o vídeo sobe do mesmo jeito.
  async function uploadPoster(
    targetItemId: string,
    file: File,
  ): Promise<string | undefined> {
    const poster = await captureVideoPoster(file)
    if (!poster) return undefined

    // O tipo que o navegador DEVOLVEU, não o que foi pedido. Safari antigo
    // aceita o pedido de WebP e entrega PNG calado; subir esse arquivo como
    // .webp daria uma capa que nada desenha.
    const mimeType = poster.type
    if (!(MEDIA_LIMITS.image.mimes as readonly string[]).includes(mimeType)) {
      return undefined
    }

    const ticket = await createUploadTicketAction({
      itemId: targetItemId,
      kind: 'image',
      mimeType,
    })
    if (!ticket.ok) return undefined

    try {
      await uploadToSignedUrl(ticket.data.signedUrl, poster, mimeType)
      return ticket.data.path
    } catch {
      // Capa perdida, vídeo segue. Não vale interromper por isso.
      return undefined
    }
  }

  async function uploadOne(
    targetItemId: string,
    pendingItem: PendingMedia,
  ): Promise<boolean> {
    const { idLocal, arquivo: file, kind } = pendingItem

    try {
      updatePending(idLocal, { estado: 'comprimindo', progresso: 0, erro: undefined })

      let blob: Blob = file
      let width: number | undefined
      let height: number | undefined
      let durationMs: number | null = null

      if (kind === 'image') {
        const result = await compressImage(file)
        blob = result.blob
        width = result.largura
        height = result.altura
      } else {
        durationMs = await readVideoDurationMs(file)
        if (durationMs !== null && durationMs > MAX_VIDEO_MS) {
          updatePending(idLocal, {
            estado: 'erro',
            erro: 'Mais de 15 segundos.',
          })
          return false
        }

        const result = await compressVideo(file, (progress) =>
          updatePending(idLocal, { progresso: progress }),
        )
        // `null` não é erro: é o fallback. Sem WebCodecs, ou com entrada que
        // a biblioteca não lê, o original sobe e o teto de peso protege.
        if (result) {
          blob = result.blob
          width = result.largura
          height = result.altura
        }
      }

      // O teto de peso vale sobre o arquivo QUE VAI SUBIR, e não sobre o
      // original — é o que torna a compressão útil em vez de decorativa.
      const maxBytes = MEDIA_LIMITS[kind].maxBytes
      if (blob.size > maxBytes) {
        updatePending(idLocal, {
          estado: 'erro',
          erro: `Ficou em ${formatFileSize(blob.size)}, acima do limite.`,
        })
        return false
      }

      updatePending(idLocal, { estado: 'enviando', progresso: 0 })

      const posterPath =
        kind === 'video' ? await uploadPoster(targetItemId, file) : undefined

      // O tipo do BLOB, não o do arquivo: depois da compressão eles divergem,
      // e mandar o antigo grava um arquivo com content-type errado.
      const mimeType = blob.type || file.type

      const ticket = await createUploadTicketAction({
        itemId: targetItemId,
        kind,
        mimeType,
      })
      if (!ticket.ok) {
        updatePending(idLocal, { estado: 'erro', erro: ticket.error })
        return false
      }

      await uploadToSignedUrl(ticket.data.signedUrl, blob, mimeType)
      updatePending(idLocal, { progresso: 100 })

      const registered = await registerItemMediaAction({
        itemId: targetItemId,
        kind,
        storagePath: ticket.data.path,
        posterPath,
        width,
        height,
        durationMs: durationMs ?? undefined,
      })

      if (!registered.ok) {
        updatePending(idLocal, { estado: 'erro', erro: registered.error })
        return false
      }

      updatePending(idLocal, { estado: 'pronta', progresso: 100 })
      return true
    } catch {
      updatePending(idLocal, {
        estado: 'erro',
        erro: 'Falha ao enviar. Tente de novo.',
      })
      return false
    }
  }

  useImperativeHandle(
    ref,
    () => ({
      getPendingCount: () =>
        pendingMediaRef.current.filter((pendingItem) => pendingItem.estado !== 'pronta').length,

      async uploadPending(targetItemId: string) {
        const queue = pendingMediaRef.current.filter(
          (pendingItem) => pendingItem.estado !== 'pronta',
        )
        if (queue.length === 0) return true

        setUploading(true)
        let allSucceeded = true

        // Uma de cada vez, em ORDEM: a posição no banco é a ordem de chegada,
        // e enviar em paralelo embaralharia as telas do prato.
        //
        // Falha é ISOLADA: um `catch` por mídia dentro de `enviarUma`. A que
        // falhou fica em erro com o motivo; as outras seguem.
        for (const pendingItem of queue) {
          const succeeded = await uploadOne(targetItemId, pendingItem)
          if (!succeeded) allSucceeded = false
        }

        setUploading(false)

        if (allSucceeded) {
          for (const pendingItem of pendingMediaRef.current) {
            URL.revokeObjectURL(pendingItem.previewUrl)
          }
          setPendingMedia([])
        }

        return allSucceeded
      },
    }),
    // `enviarUma` é recriada a cada render, mas só lê `pendentesRef` e props
    // estáveis. A lista de dependências fica vazia de propósito: o handle
    // precisa ser estável para o diálogo guardá-lo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const busy = transitionPending || uploading

  return (
    <div className="space-y-3">
      {savedMedia.length === 0 && pendingMedia.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          O cardápio público é um feed de fotos. Um prato sem foto nem vídeo
          não aparece nele — e impede a publicação.
        </p>
      ) : (
        <AttachmentGroup className="scroll-fade-x scrollbar-none gap-2">
          {savedMedia.map((entry, index) => (
            <div key={entry.id} className="flex flex-col gap-2">
              <MediaItem
                title={entry.kind === 'video' ? 'Vídeo' : 'Foto'}
                previewUrl={
                  entry.kind === 'image'
                    ? publicMediaUrl('image', entry.storagePath)
                    : entry.posterPath
                      ? publicMediaUrl('image', entry.posterPath)
                      : null
                }
                kind={entry.kind}
                state="pronta"
                progress={100}
                first={index === 0}
                last={index === savedMedia.length - 1 && pendingMedia.length === 0}
                busy={busy}
                selected={selectedMedia?.id === entry.id}
                onSelect={() => setSelectedId(entry.id)}
                onMoveUp={() => moveSaved(index, -1)}
                onMoveDown={() => moveSaved(index, 1)}
                onRemove={() => removeSaved(entry.id)}
              />
            </div>
          ))}

          {pendingMedia.map((pendingItem, index) => (
            <MediaItem
              key={pendingItem.idLocal}
              title={pendingItem.arquivo.name}
              description={formatFileSize(pendingItem.arquivo.size)}
              previewUrl={pendingItem.kind === 'image' ? pendingItem.previewUrl : null}
              kind={pendingItem.kind}
              state={pendingItem.estado}
              progress={pendingItem.progresso}
              mediaError={pendingItem.erro}
              first={savedMedia.length === 0 && index === 0}
              last={index === pendingMedia.length - 1}
              busy={busy}
              onMoveUp={() => movePending(index, -1)}
              onMoveDown={() => movePending(index, 1)}
              onRemove={() => removePending(pendingItem.idLocal)}
            />
          ))}
        </AttachmentGroup>
      )}

      {selectedMedia ? <MediaFocal key={selectedMedia.id} media={selectedMedia} /> : null}

      <MediaDropzone
        onFiles={handleFiles}
        acceptedTypes={ACCEPTED_TYPES}
        disabled={busy}
        remaining={remainingSlots}
      />

      {pendingMedia.length > 0 ? (
        <p className="text-small text-muted-foreground">
          {pendingMedia.length === 1
            ? '1 arquivo ainda não foi enviado.'
            : `${pendingMedia.length} arquivos ainda não foram enviados.`}{' '}
          Eles sobem quando você salvar o item.
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
