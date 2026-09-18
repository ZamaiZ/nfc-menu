import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-10 w-44" />
      </div>
      <div className="space-y-2">
        {/* Alturas iguais às da tabela real, para a tela não pular quando o
            conteúdo chega. */}
        {[0, 1, 2, 3].map((row) => (
          <Skeleton key={row} className="h-14 w-full" />
        ))}
      </div>
    </main>
  )
}
