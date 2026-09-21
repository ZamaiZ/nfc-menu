'use client'

import { useCallback, useEffect, useImperativeHandle, useRef, useState, useTransition } from 'react'
import { MediaDropzone } from '@/components/cardapio/media-dropzone'
import { MediaFocal } from '@/components/cardapio/media-focal'
import { formatarTamanho, MediaItem } from '@/components/cardapio/media-item'
import { AttachmentGroup } from '@/components/ui/attachment'
import { toast } from '@/components/ui/toast'
import { MAX_MIDIAS_POR_ITEM, MEDIA_LIMITS } from '@/domain/media'
import type { OwnerMenuItemDTO } from '@/domain/menu'
import { comprimirImagem } from '@/lib/media/comprimir-imagem'
import { comprimirVideo } from '@/lib/media/comprimir-video'
import type { MidiaPendente } from '@/lib/media/tipos'
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

const ACEITOS = [
  ...MEDIA_LIMITS.image.mimes,
  ...MEDIA_LIMITS.video.mimes,
] as readonly string[]

export type MediaEditorHandle = {
  /** Sobe tudo o que está pendente. `false` se alguma falhou. */
  enviarPendentes: (itemId: string) => Promise<boolean>
  /** Quantas pendentes existem agora. O diálogo usa para avisar ao fechar. */
  quantasPendentes: () => number
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
  onPendentesChange,
}: {
  itemId: string | null
  media: OwnerMenuItemDTO['media']
  ref?: React.Ref<MediaEditorHandle>
  onPendentesChange?: (quantidade: number) => void
}) {
  const [pendentes, setPendentes] = useState<MidiaPendente[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, startTransition] = useTransition()
  const [enviando, setEnviando] = useState(false)

  const gravadas = [...media].sort((a, b) => a.position - b.position)
  const restantes = Math.max(
    0,
    MAX_MIDIAS_POR_ITEM - gravadas.length - pendentes.length,
  )

  // `useRef` do array para a limpeza no desmonte enxergar o valor ATUAL. Um
  // efeito com `[]` de dependências fecharia sobre o array vazio inicial e
  // não revogaria nada — e um dono que troca dez fotos numa sessão seguraria
  // dez blobs na memória do celular.
  const pendentesRef = useRef<MidiaPendente[]>([])
  pendentesRef.current = pendentes

  useEffect(() => {
    return () => {
      for (const p of pendentesRef.current) URL.revokeObjectURL(p.previewUrl)
    }
  }, [])

  useEffect(() => {
    onPendentesChange?.(pendentes.length)
  }, [pendentes.length, onPendentesChange])

  const atualizar = useCallback(
    (idLocal: string, mudanca: Partial<MidiaPendente>) => {
      setPendentes((atuais) =>
        atuais.map((p) => (p.idLocal === idLocal ? { ...p, ...mudanca } : p)),
      )
    },
    [],
  )

  function aoEscolher(arquivos: File[]) {
    setErro(null)

    const novos: MidiaPendente[] = []
    let cabem = restantes

    for (const arquivo of arquivos) {
      // Recusado AQUI, antes de qualquer processamento. Errar o formato não
      // deve nem acender indicador de carregamento.
      if (!ACEITOS.includes(arquivo.type)) {
        setErro(`"${arquivo.name}" não é uma foto nem um vídeo aceito.`)
        continue
      }
      if (cabem <= 0) {
        setErro(`Este prato já chegou a ${MAX_MIDIAS_POR_ITEM} telas.`)
        break
      }

      novos.push({
        idLocal: crypto.randomUUID(),
        arquivo,
        previewUrl: URL.createObjectURL(arquivo),
        kind: arquivo.type.startsWith('video/') ? 'video' : 'image',
        estado: 'pendente',
        progresso: 0,
      })
      cabem -= 1
    }

    if (novos.length > 0) setPendentes((atuais) => [...atuais, ...novos])
  }

  function removerPendente(idLocal: string) {
    setPendentes((atuais) => {
      const alvo = atuais.find((p) => p.idLocal === idLocal)
      if (alvo) URL.revokeObjectURL(alvo.previewUrl)
      return atuais.filter((p) => p.idLocal !== idLocal)
    })
  }

  function moverPendente(indice: number, direcao: -1 | 1) {
    setPendentes((atuais) => {
      const destino = indice + direcao
      if (destino < 0 || destino >= atuais.length) return atuais
      const nova = [...atuais]
      const [movida] = nova.splice(indice, 1)
      nova.splice(destino, 0, movida)
      return nova
    })
  }

  function moverGravada(indice: number, direcao: -1 | 1) {
    if (!itemId) return
    const destino = indice + direcao
    if (destino < 0 || destino >= gravadas.length) return

    const nova = [...gravadas]
    const [movida] = nova.splice(indice, 1)
    nova.splice(destino, 0, movida)

    startTransition(async () => {
      const resultado = await reorderItemMediaAction({
        itemId,
        order: nova.map((entrada, posicao) => ({
          id: entrada.id,
          position: posicao,
        })),
      })
      if (!resultado.ok) toast.add({ title: resultado.error, type: 'error' })
    })
  }

  function removerGravada(mediaId: string) {
    startTransition(async () => {
      const resultado = await deleteItemMediaAction(mediaId)
      if (!resultado.ok) toast.add({ title: resultado.error, type: 'error' })
    })
  }

  // A capa é opcional POR CONSTRUÇÃO (decisão C5 da Fase 2). Toda falha aqui
  // devolve undefined e o vídeo sobe do mesmo jeito.
  async function subirCapa(
    alvoItemId: string,
    arquivo: File,
  ): Promise<string | undefined> {
    const capa = await captureVideoPoster(arquivo)
    if (!capa) return undefined

    // O tipo que o navegador DEVOLVEU, não o que foi pedido. Safari antigo
    // aceita o pedido de WebP e entrega PNG calado; subir esse arquivo como
    // .webp daria uma capa que nada desenha.
    const mimeType = capa.type
    if (!(MEDIA_LIMITS.image.mimes as readonly string[]).includes(mimeType)) {
      return undefined
    }

    const ticket = await createUploadTicketAction({
      itemId: alvoItemId,
      kind: 'image',
      mimeType,
    })
    if (!ticket.ok) return undefined

    try {
      await uploadToSignedUrl(ticket.data.signedUrl, capa, mimeType)
      return ticket.data.path
    } catch {
      // Capa perdida, vídeo segue. Não vale interromper por isso.
      return undefined
    }
  }

  async function enviarUma(
    alvoItemId: string,
    pendente: MidiaPendente,
  ): Promise<boolean> {
    const { idLocal, arquivo, kind } = pendente

    try {
      atualizar(idLocal, { estado: 'comprimindo', progresso: 0, erro: undefined })

      let blob: Blob = arquivo
      let largura: number | undefined
      let altura: number | undefined
      let duracaoMs: number | null = null

      if (kind === 'image') {
        const resultado = await comprimirImagem(arquivo)
        blob = resultado.blob
        largura = resultado.largura
        altura = resultado.altura
      } else {
        duracaoMs = await readVideoDurationMs(arquivo)
        if (duracaoMs !== null && duracaoMs > MAX_VIDEO_MS) {
          atualizar(idLocal, {
            estado: 'erro',
            erro: 'Mais de 15 segundos.',
          })
          return false
        }

        const resultado = await comprimirVideo(arquivo, (pct) =>
          atualizar(idLocal, { progresso: pct }),
        )
        // `null` não é erro: é o fallback. Sem WebCodecs, ou com entrada que
        // a biblioteca não lê, o original sobe e o teto de peso protege.
        if (resultado) {
          blob = resultado.blob
          largura = resultado.largura
          altura = resultado.altura
        }
      }

      // O teto de peso vale sobre o arquivo QUE VAI SUBIR, e não sobre o
      // original — é o que torna a compressão útil em vez de decorativa.
      const teto = MEDIA_LIMITS[kind].maxBytes
      if (blob.size > teto) {
        atualizar(idLocal, {
          estado: 'erro',
          erro: `Ficou em ${formatarTamanho(blob.size)}, acima do limite.`,
        })
        return false
      }

      atualizar(idLocal, { estado: 'enviando', progresso: 0 })

      const posterPath =
        kind === 'video' ? await subirCapa(alvoItemId, arquivo) : undefined

      // O tipo do BLOB, não o do arquivo: depois da compressão eles divergem,
      // e mandar o antigo grava um arquivo com content-type errado.
      const mimeType = blob.type || arquivo.type

      const ticket = await createUploadTicketAction({
        itemId: alvoItemId,
        kind,
        mimeType,
      })
      if (!ticket.ok) {
        atualizar(idLocal, { estado: 'erro', erro: ticket.error })
        return false
      }

      await uploadToSignedUrl(ticket.data.signedUrl, blob, mimeType)
      atualizar(idLocal, { progresso: 100 })

      const registrada = await registerItemMediaAction({
        itemId: alvoItemId,
        kind,
        storagePath: ticket.data.path,
        posterPath,
        width: largura,
        height: altura,
        durationMs: duracaoMs ?? undefined,
      })

      if (!registrada.ok) {
        atualizar(idLocal, { estado: 'erro', erro: registrada.error })
        return false
      }

      atualizar(idLocal, { estado: 'pronta', progresso: 100 })
      return true
    } catch {
      atualizar(idLocal, {
        estado: 'erro',
        erro: 'Falha ao enviar. Tente de novo.',
      })
      return false
    }
  }

  useImperativeHandle(
    ref,
    () => ({
      quantasPendentes: () =>
        pendentesRef.current.filter((p) => p.estado !== 'pronta').length,

      async enviarPendentes(alvoItemId: string) {
        const fila = pendentesRef.current.filter((p) => p.estado !== 'pronta')
        if (fila.length === 0) return true

        setEnviando(true)
        let tudoCerto = true

        // Uma de cada vez, em ORDEM: a posição no banco é a ordem de chegada,
        // e enviar em paralelo embaralharia as telas do prato.
        //
        // Falha é ISOLADA: um `catch` por mídia dentro de `enviarUma`. A que
        // falhou fica em erro com o motivo; as outras seguem.
        for (const pendente of fila) {
          const certo = await enviarUma(alvoItemId, pendente)
          if (!certo) tudoCerto = false
        }

        setEnviando(false)

        if (tudoCerto) {
          for (const p of pendentesRef.current) URL.revokeObjectURL(p.previewUrl)
          setPendentes([])
        }

        return tudoCerto
      },
    }),
    // `enviarUma` é recriada a cada render, mas só lê `pendentesRef` e props
    // estáveis. A lista de dependências fica vazia de propósito: o handle
    // precisa ser estável para o diálogo guardá-lo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const bloqueado = ocupado || enviando

  return (
    <div className="space-y-4">
      {gravadas.length === 0 && pendentes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          O cardápio público é um feed de fotos. Um prato sem foto nem vídeo
          não aparece nele — e impede a publicação.
        </p>
      ) : (
        <AttachmentGroup className="scroll-fade-x scrollbar-none">
          {gravadas.map((entrada, indice) => (
            <div key={entrada.id} className="flex flex-col gap-2">
              <MediaItem
                titulo={entrada.kind === 'video' ? 'Vídeo' : 'Foto'}
                previewUrl={
                  entrada.kind === 'image'
                    ? publicMediaUrl('image', entrada.storagePath)
                    : entrada.posterPath
                      ? publicMediaUrl('image', entrada.posterPath)
                      : null
                }
                kind={entrada.kind}
                estado="pronta"
                progresso={100}
                primeira={indice === 0}
                ultima={indice === gravadas.length - 1 && pendentes.length === 0}
                ocupado={bloqueado}
                onSubir={() => moverGravada(indice, -1)}
                onDescer={() => moverGravada(indice, 1)}
                onRemover={() => removerGravada(entrada.id)}
              />
              <MediaFocal media={entrada} />
            </div>
          ))}

          {pendentes.map((pendente, indice) => (
            <MediaItem
              key={pendente.idLocal}
              titulo={pendente.arquivo.name}
              descricao={formatarTamanho(pendente.arquivo.size)}
              previewUrl={pendente.kind === 'image' ? pendente.previewUrl : null}
              kind={pendente.kind}
              estado={pendente.estado}
              progresso={pendente.progresso}
              erro={pendente.erro}
              primeira={gravadas.length === 0 && indice === 0}
              ultima={indice === pendentes.length - 1}
              ocupado={bloqueado}
              onSubir={() => moverPendente(indice, -1)}
              onDescer={() => moverPendente(indice, 1)}
              onRemover={() => removerPendente(pendente.idLocal)}
            />
          ))}
        </AttachmentGroup>
      )}

      <MediaDropzone
        onArquivos={aoEscolher}
        aceitos={ACEITOS}
        desabilitado={bloqueado}
        restantes={restantes}
      />

      {pendentes.length > 0 ? (
        <p className="text-small text-muted-foreground">
          {pendentes.length === 1
            ? '1 arquivo ainda não foi enviado.'
            : `${pendentes.length} arquivos ainda não foram enviados.`}{' '}
          Eles sobem quando você salvar o item.
        </p>
      ) : null}

      {erro ? (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      ) : null}
    </div>
  )
}
