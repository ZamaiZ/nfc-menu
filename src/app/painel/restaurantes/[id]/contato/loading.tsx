import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <main className="tavvi-page">
      <div className="mb-8 space-y-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="tv-contact-layout">
        <div className="space-y-4">
          {[2, 3, 1].map((section, index) => <div key={index} className="tavvi-surface space-y-4 p-5 sm:p-6">
            <Skeleton className="h-5 w-32" />
            {Array.from({ length: section }).map((_, field) => <div key={field} className="space-y-2"><Skeleton className="h-4 w-28" /><Skeleton className="h-10 w-full rounded-xl" /></div>)}
          </div>)}
          <Skeleton className="h-14 w-full rounded-[18px]" />
        </div>
        <aside className="tv-contact-preview tavvi-surface p-4"><Skeleton className="mb-4 h-5 w-40" /><Skeleton className="mx-auto h-[484px] w-[236px] rounded-[30px]" /></aside>
      </div>
    </main>
  )
}
