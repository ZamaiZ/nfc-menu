import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function AdminNotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-[1100px] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-[28px] font-semibold">Restaurante não encontrado</h1>
      <p className="text-muted-foreground">
        Ele pode ter sido removido, ou o endereço está incorreto.
      </p>
      {/* Base UI compõe com `render`, não com `asChild`. */}
      <Button render={<Link href="/" />}>Voltar para a lista</Button>
    </main>
  )
}
