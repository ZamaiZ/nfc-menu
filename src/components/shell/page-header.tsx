// Título de PÁGINA, nos dois territórios. Usa `font-heading` justamente por
// isso: a face segue quem está envolvendo — serifada sob `.territorio-painel`,
// Inter no console — sem o componente saber onde está.
export function PageHeader({
  title,
  support,
  children,
}: {
  title: string
  support?: string
  children?: React.ReactNode
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-heading text-display font-semibold tracking-[-0.01em]">
          {title}
        </h1>
        {support ? (
          <p className="mt-1 text-body text-muted-foreground">{support}</p>
        ) : null}
      </div>
      {children ? <div className="flex flex-wrap gap-2">{children}</div> : null}
    </div>
  )
}
