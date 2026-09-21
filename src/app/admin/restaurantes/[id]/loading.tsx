import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <main className="tavvi-page">
      <Skeleton className="mb-8 h-9 w-72" />
      <div className="space-y-8">
        {[0, 1, 2].map((block) => (
          <Skeleton key={block} className="h-48 w-full rounded-[20px]" />
        ))}
      </div>
    </main>
  )
}
