import { Skeleton } from '@/components/ui/skeleton'

// Espelha o formulário de contato: cabeçalho e os campos numa coluna
// estreita, com a mesma largura máxima da tela real.
export default function Loading() {
  return (
    <main className="tavvi-page max-w-[840px]">
      <div className="mb-8 space-y-2">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="tavvi-surface space-y-6 p-5 sm:p-7">
        {[0, 1, 2, 3, 4].map((campo) => (
          <div key={campo} className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        ))}
        <Skeleton className="h-9 w-36 rounded-4xl" />
      </div>
    </main>
  )
}
