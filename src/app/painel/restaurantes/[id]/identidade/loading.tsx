import { Skeleton } from '@/components/ui/skeleton'

// A tela de identidade é a mais pesada do painel: ela carrega as nove fontes
// de tema e as duas pré-visualizações. O esqueleto espelha as duas colunas —
// formulário à esquerda, os dois celulares de pré-visualização à direita —
// para a página não reorganizar quando chegar.
export default function Loading() {
  return (
    <main className="tavvi-page">
      <div className="mb-8 space-y-2">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_480px]">
        <div className="tavvi-surface space-y-8 p-5 sm:p-7">
          {/* Logo e capa. */}
          <div className="grid gap-6 sm:grid-cols-[auto_minmax(0,1fr)]">
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="size-24 rounded-lg" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          </div>

          {/* Segmento. */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>

          {/* Os oito temas. */}
          <div className="space-y-3">
            <Skeleton className="h-4 w-36" />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((tema) => (
                <Skeleton key={tema} className="h-20 rounded-lg" />
              ))}
            </div>
          </div>

          {/* As duas cores. */}
          <div className="grid gap-6 sm:grid-cols-2">
            {[0, 1].map((cor) => (
              <div key={cor} className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-11 w-full rounded-md" />
              </div>
            ))}
          </div>
        </div>

        {/* As duas faces, clara e escura. */}
        <div className="flex gap-4 overflow-hidden lg:grid lg:grid-cols-2">
          {[0, 1].map((face) => (
            <div key={face} className="space-y-2">
              <Skeleton className="mx-auto h-3 w-12" />
              <Skeleton className="mx-auto h-[432px] w-[232px] rounded-[24px]" />
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
