'use client'

import { RiDeleteBinLine, RiFilmLine } from 'react-icons/ri'
import { ReorderButtons } from '@/components/cardapio/reorder-buttons'
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from '@/components/ui/attachment'
import { Progress } from '@/components/ui/progress'
import type { EstadoMidia } from '@/lib/media/tipos'

// O `state` do primitivo mapeia direto do nosso estado. É para isso que ele
// tem esse prop — e é aí que a classe `shimmer`, que a Fase 5 precisou
// definir à mão, finalmente aparece.
const ESTADO_DO_ANEXO: Record<
  EstadoMidia,
  'idle' | 'uploading' | 'processing' | 'error' | 'done'
> = {
  pendente: 'idle',
  comprimindo: 'processing',
  enviando: 'uploading',
  erro: 'error',
  pronta: 'done',
}

function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Uma mídia da lista. Serve GRAVADA e PENDENTE, de propósito: no feed a
// ordem das duas é a mesma ordem de telas, e mostrá-las em listas separadas
// esconderia do dono exatamente o que o cliente vai ver primeiro.
export function MediaItem({
  titulo,
  descricao,
  previewUrl,
  kind,
  estado,
  progresso,
  erro,
  primeira,
  ultima,
  ocupado,
  onSubir,
  onDescer,
  onRemover,
}: {
  titulo: string
  descricao?: string
  /** `null` num vídeo sem capa: cai no ícone de filme. */
  previewUrl: string | null
  kind: 'image' | 'video'
  estado: EstadoMidia
  progresso: number
  erro?: string
  primeira: boolean
  ultima: boolean
  ocupado: boolean
  onSubir: () => void
  onDescer: () => void
  onRemover: () => void
}) {
  return (
    <Attachment
      orientation="vertical"
      state={ESTADO_DO_ANEXO[estado]}
      className="w-[168px]"
    >
      <AttachmentMedia variant={previewUrl ? 'image' : 'icon'}>
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="" />
        ) : (
          <RiFilmLine aria-hidden="true" />
        )}
      </AttachmentMedia>

      <AttachmentContent>
        {/* A primeira mídia é a tela que ABRE o prato no feed. Dizer isso é o
            que transforma "ordem" em decisão consciente. */}
        <AttachmentTitle>
          {primeira ? 'Abre o prato' : titulo}
        </AttachmentTitle>
        <AttachmentDescription>
          {erro ?? descricao ?? (kind === 'video' ? 'Vídeo' : 'Foto')}
        </AttachmentDescription>

        {estado === 'enviando' || estado === 'comprimindo' ? (
          <Progress value={progresso} className="mt-2" />
        ) : null}
      </AttachmentContent>

      <AttachmentActions>
        <ReorderButtons
          label={titulo}
          isFirst={primeira}
          isLast={ultima}
          disabled={ocupado}
          onUp={onSubir}
          onDown={onDescer}
        />
        <AttachmentAction
          variant="destructive"
          aria-label={`Remover ${titulo}`}
          disabled={ocupado}
          onClick={onRemover}
        >
          <RiDeleteBinLine />
        </AttachmentAction>
      </AttachmentActions>
    </Attachment>
  )
}

export { formatarTamanho }
