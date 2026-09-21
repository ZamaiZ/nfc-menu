import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <main className="tavvi-page">
      <div className="mb-8 flex items-center justify-between gap-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-10 w-44" />
      </div>
      <div className="tavvi-surface space-y-2 p-3">
        {/* Alturas iguais às da tabela real, para a tela não pular quando o
            conteúdo chega. */}
        {[0, 1, 2, 3].map((row) => (
          <Skeleton key={row} className="h-14 w-full" />
        ))}
      </div>
    </main>
  )
}
