'use client'

import { RouteErrorState } from '@/components/shell/route-error-state'

export default function PainelError({ retry }: { retry: () => void }) {
  return <RouteErrorState retry={retry} />
}
