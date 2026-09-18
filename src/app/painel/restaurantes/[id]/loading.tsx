import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-10 w-52" />
      </div>
      <div className="space-y-6">
        {[0, 1].map((block) => (
          <Skeleton key={block} className="h-40 w-full" />
        ))}
      </div>
    </main>
  )
}
