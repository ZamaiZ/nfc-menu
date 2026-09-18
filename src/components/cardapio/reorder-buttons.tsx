'use client'

import { RiArrowDownSLine, RiArrowUpSLine } from 'react-icons/ri'
import { Button } from '@/components/ui/button'

export function ReorderButtons({
  label,
  isFirst,
  isLast,
  disabled,
  onUp,
  onDown,
}: {
  label: string
  isFirst: boolean
  isLast: boolean
  disabled?: boolean
  onUp: () => void
  onDown: () => void
}) {
  return (
    <div className="flex items-center">
      {/* A primeira linha não ganha seta para cima, em vez de ganhar uma
          desabilitada — botão morto parece defeito. O espaço é reservado
          para as linhas não dançarem de largura. */}
      {isFirst ? (
        <span className="size-9" aria-hidden="true" />
      ) : (
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          onClick={onUp}
          aria-label={`Mover ${label} para cima`}
        >
          <RiArrowUpSLine className="size-4" />
        </Button>
      )}

      {isLast ? (
        <span className="size-9" aria-hidden="true" />
      ) : (
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          onClick={onDown}
          aria-label={`Mover ${label} para baixo`}
        >
          <RiArrowDownSLine className="size-4" />
        </Button>
      )}
    </div>
  )
}
