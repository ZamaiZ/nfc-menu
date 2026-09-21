'use client'

import { useEffect, useRef, useState } from 'react'
import { RiUploadCloud2Line } from 'react-icons/ri'
import { cn } from 'cn'

// A área de envio, no lugar do botão que existia até a Fase 4.
//
// Aceita os três caminhos que uma pessoa realmente usa: arrastar do
// explorador, colar do clipboard, e clicar. Um input só, `multiple`, sem
// separar foto de vídeo — no feed o cliente não distingue tipo, e o dono
// também não deveria precisar escolher a gaveta antes de escolher o arquivo.
export function MediaDropzone({
  onArquivos,
  aceitos,
  desabilitado = false,
  restantes,
}: {
  onArquivos: (arquivos: File[]) => void
  aceitos: readonly string[]
  desabilitado?: boolean
  /** Quantas telas ainda cabem. Zero desabilita e a área diz o teto. */
  restantes: number
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  // Contador, e não booleano: `dragleave` dispara ao passar por cima de um
  // FILHO, e com booleano o estado pisca a cada movimento do mouse.
  const profundidade = useRef(0)
  const [sobre, setSobre] = useState(false)

  const bloqueado = desabilitado || restantes <= 0

  // Colar. Ouve na janela porque o alvo do `paste` é o que estiver em foco, e
  // ninguém foca uma área de envio antes de colar.
  useEffect(() => {
    if (bloqueado) return

    function aoColar(evento: ClipboardEvent) {
      const arquivos = Array.from(evento.clipboardData?.files ?? [])
      if (arquivos.length === 0) return
      evento.preventDefault()
      onArquivos(arquivos)
    }

    window.addEventListener('paste', aoColar)
    return () => window.removeEventListener('paste', aoColar)
  }, [bloqueado, onArquivos])

  return (
    <div
      onDragEnter={(evento) => {
        evento.preventDefault()
        if (bloqueado) return
        profundidade.current += 1
        setSobre(true)
      }}
      onDragOver={(evento) => evento.preventDefault()}
      onDragLeave={() => {
        profundidade.current -= 1
        if (profundidade.current <= 0) {
          profundidade.current = 0
          setSobre(false)
        }
      }}
      onDrop={(evento) => {
        evento.preventDefault()
        profundidade.current = 0
        setSobre(false)
        if (bloqueado) return
        onArquivos(Array.from(evento.dataTransfer.files))
      }}
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors',
        bloqueado
          ? 'border-border bg-muted/30 text-muted-foreground'
          : sobre
            ? 'border-primary bg-primary/5 text-foreground'
            : 'border-border bg-surface-1 text-muted-foreground hover:border-primary/50',
      )}
    >
      <RiUploadCloud2Line
        className={cn('size-7', sobre ? 'text-primary' : undefined)}
        aria-hidden="true"
      />

      {bloqueado ? (
        <p className="text-small font-medium">
          Este prato já está com todas as telas preenchidas.
        </p>
      ) : (
        <>
          <p className="text-small">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="font-medium text-foreground underline underline-offset-4"
            >
              Escolha os arquivos
            </button>{' '}
            ou arraste para cá. Também dá para colar.
          </p>
          <p className="text-micro text-muted-foreground">
            Fotos e vídeos juntos. Cabem mais {restantes}{' '}
            {restantes === 1 ? 'tela' : 'telas'}.
          </p>
        </>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        // Um input só, com os dois tipos. Separar em dois obrigava o dono a
        // decidir "é foto ou vídeo?" antes de abrir a gaveta.
        accept={aceitos.join(',')}
        className="hidden"
        onChange={(evento) => {
          const arquivos = Array.from(evento.target.files ?? [])
          if (arquivos.length > 0) onArquivos(arquivos)
          // Zerar permite escolher o MESMO arquivo de novo depois de removê-lo.
          evento.target.value = ''
        }}
      />
    </div>
  )
}
