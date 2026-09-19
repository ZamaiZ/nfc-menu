import { Reveal } from '@/components/motion/reveal'

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children?: React.ReactNode
}) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-12">
      {/* Um halo único, atrás de tudo, sem interceptar clique. É o que tira a
          tela de entrada da cara de formulário solto no branco, sem custar
          uma imagem nem um segundo de carregamento. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[620px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />

      <Reveal className="relative w-full max-w-sm">
        <div className="space-y-2 text-center">
          {/* `font-heading`, e não `font-display`: esta casca serve os DOIS
              territórios. Assim a face segue quem está envolvendo — serifada
              sob `.territorio-painel`, Inter no console — sem o componente
              precisar saber onde está. */}
          <h1 className="font-heading text-display font-semibold leading-tight tracking-[-0.01em]">
            {title}
          </h1>
          {subtitle ? (
            <p className="text-body text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {children ? <div className="mt-8">{children}</div> : null}
      </Reveal>
    </main>
  )
}
