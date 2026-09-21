// Cabeçalho único das superfícies privadas. A família vem do território
// Tavvi; aqui a hierarquia é construída por peso, escala e espaçamento.
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <header className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div className="min-w-0 max-w-2xl">
        {eyebrow ? (
          <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-primary">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-[clamp(1.75rem,3vw,2.4rem)] font-semibold leading-[1.08] tracking-[-0.035em]">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  )
}
