import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-8">
      <Skeleton className="mb-8 h-9 w-72" />
      <div className="space-y-8">
        {[0, 1, 2].map((block) => (
          <Skeleton key={block} className="h-48 w-full" />
        ))}
      </div>
    </main>
  )
}
