'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from 'cn'

export type NavItem = { href: string; label: string }

// Os caminhos são EXTERNOS: dentro de admin. escreve-se `/restaurantes`, e o
// proxy reescreve para `/admin/restaurantes`. Escrever o prefixo aqui
// produziria `/admin/admin/restaurantes`.
export function TerritoryNav({
  items,
  hideOn,
}: {
  items: NavItem[]
  /** Trechos de caminho onde a barra não aparece. O assistente de criação usa
      isto: durante o onboarding, uma navegação para "Equipe" é ruído. */
  hideOn?: string[]
}) {
  const pathname = usePathname()

  if (hideOn?.some((trecho) => pathname.includes(trecho))) return null

  return (
    <nav className="border-b border-border/70">
      <div className="mx-auto flex w-full max-w-[1180px] gap-1 px-4 sm:px-6">
        {items.map((item) => {
          // O pathname que o cliente enxerga JÁ vem reescrito pelo proxy, com
          // o prefixo do território. Comparar com o caminho externo exige
          // olhar o fim, não a igualdade.
          const active =
            item.href === '/'
              ? pathname.replace(/^\/(admin|painel)/, '') === ''
              : pathname.endsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative -mb-px flex min-h-11 items-center px-3 text-small font-medium transition-colors',
                'border-b-2',
                active
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
