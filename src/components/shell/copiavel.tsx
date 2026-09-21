'use client'

import { useEffect, useRef, useState } from 'react'
import { RiCheckLine, RiFileCopyLine } from 'react-icons/ri'
import { Button } from '@/components/ui/button'
import { cn } from 'cn'

// Texto que o dono precisa levar para outro lugar — endereço público, link de
// convite, token de plaquinha — com RETORNO VISÍVEL ao copiar.
//
// Até a Fase 5 esses três apareciam como texto morto: o link de convite volta
// UMA vez e o administrador copiava às cegas, sem saber se pegou.
export function Copiavel({
  valor,
  rotulo,
  className,
}: {
  valor: string
  /** Nome do que está sendo copiado, para o leitor de tela. */
  rotulo: string
  className?: string
}) {
  const [estado, setEstado] = useState<'parado' | 'copiado' | 'falhou'>('parado')
  const tempo = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (tempo.current !== null) window.clearTimeout(tempo.current)
    }
  }, [])

  async function copiar() {
    try {
      await navigator.clipboard.writeText(valor)
      setEstado('copiado')
    } catch {
      // `writeText` LANÇA em contexto não seguro (http sem localhost) e
      // quando a permissão é negada. Dizer isso é melhor que um botão que
      // parece não fazer nada.
      setEstado('falhou')
    }

    if (tempo.current !== null) window.clearTimeout(tempo.current)
    tempo.current = window.setTimeout(() => setEstado('parado'), 2000)
  }

  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-1 rounded-lg border border-border bg-surface-1 py-1 pl-3 pr-1',
        className,
      )}
    >
      <span className="min-w-0 flex-1 truncate font-mono text-small">
        {valor}
      </span>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={copiar}
        aria-label={`Copiar ${rotulo}`}
      >
        {estado === 'copiado' ? (
          <RiCheckLine className="size-4 text-status-active" />
        ) : (
          <RiFileCopyLine className="size-4" />
        )}
      </Button>

      {/* `role="status"` faz o leitor de tela anunciar sem roubar o foco. O
          retorno não pode ser só a troca do ícone: quem não enxerga também
          precisa saber que copiou. */}
      <span role="status" className="sr-only">
        {estado === 'copiado'
          ? `${rotulo} copiado`
          : estado === 'falhou'
            ? `Não foi possível copiar ${rotulo}`
            : ''}
      </span>

      {estado === 'falhou' ? (
        <span className="shrink-0 pr-2 text-micro text-destructive">
          Copie à mão
        </span>
      ) : null}
    </div>
  )
}
