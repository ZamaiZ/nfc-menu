'use client'

import { Button } from '@/components/ui/button'

export default function AdminError({ reset }: { reset: () => void }) {
  // A mensagem é neutra de propósito: o objeto de erro recebido pode
  // carregar detalhe interno, e nada dele vai para a tela.
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-[1100px] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-[28px] font-semibold">Algo deu errado</h1>
      <p className="text-muted-foreground">
        Não foi possível carregar esta página. Tente de novo em instantes.
      </p>
      <Button onClick={reset}>Tentar de novo</Button>
    </main>
  )
}
