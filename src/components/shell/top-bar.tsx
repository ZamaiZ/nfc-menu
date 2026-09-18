import Link from 'next/link'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { SignOutButton } from './sign-out-button'

export function TopBar({
  title,
  email,
}: {
  title: string
  email: string | null
}) {
  return (
    <header className="border-b border-border">
      {/* 1100px e a largura maxima da direcao visual; h-16 da os 64px que
          acomodam alvo de toque de 44px com folga. */}
      <div className="mx-auto flex h-16 w-full max-w-[1100px] items-center gap-4 px-4">
        {/* Caminho EXTERNO: dentro de admin. isto leva a lista de
            restaurantes, porque o proxy reescreve. Escrever /admin aqui
            produziria /admin/admin. */}
        <Link href="/" className="text-base font-semibold">
          {title}
        </Link>
        <div className="ml-auto flex items-center gap-2">
          {email ? (
            <span className="hidden text-sm text-muted-foreground sm:inline">
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
