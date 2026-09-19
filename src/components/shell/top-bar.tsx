import Link from 'next/link'
import { cn } from 'cn'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { SignOutButton } from './sign-out-button'

export function TopBar({
  title,
  email,
  variant = 'painel',
}: {
  title: string
  email: string | null
  variant?: 'console' | 'painel'
}) {
  return (
    <header
      className={cn(
        'sticky top-0 z-30 border-b border-border/70',
        // O desfoque só existe onde há o que desfocar. O fundo opaco fica de
        // pé no navegador sem backdrop-filter, para o texto da barra nunca
        // acabar por cima da página rolando embaixo.
        'bg-background/85',
        'supports-[backdrop-filter]:bg-background/70 supports-[backdrop-filter]:backdrop-blur-md',
      )}
    >
      {/* h-16 dá os 64px que acomodam alvo de toque de 44px com folga. */}
      <div className="mx-auto flex h-16 w-full max-w-[1180px] items-center gap-4 px-4 sm:px-6">
        {/* Caminho EXTERNO: dentro de admin. isto leva à lista, porque o proxy
            reescreve. Escrever /admin aqui produziria /admin/admin. */}
        <Link
          href="/"
          className={cn(
            'font-heading font-semibold outline-none transition-opacity hover:opacity-80',
            'rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            // A FACE vem de `font-heading` e segue o território sozinha. O que
            // a variante controla é só o tamanho e o espacejamento: o console
            // é mais apertado porque densidade é o caráter dele.
            variant === 'painel'
              ? 'text-section'
              : 'text-card tracking-[0.01em]',
          )}
        >
          {title}
        </Link>

        <div className="ml-auto flex items-center gap-2">
          {email ? (
            <span className="hidden max-w-[220px] truncate text-small text-muted-foreground sm:inline">
              {email}
            </span>
          ) : null}
          <ThemeToggle />
          <SignOutButton />
        </div>
      </div>
    </header>
  )
}
