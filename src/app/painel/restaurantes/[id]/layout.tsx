import { notFound } from 'next/navigation'
import { TerritoryNav } from '@/components/shell/territory-nav'
import { uuidSchema } from '@/domain/common'
import { myRole } from '@/server/dal/auth'

export default async function RestauranteLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const parsed = uuidSchema.safeParse(id)
  if (!parsed.success) notFound()

  // Só o papel, e só para montar a navegação. A autorização de verdade é de
  // cada página, e depois da DAL, e depois da RLS.
  const role = await myRole(parsed.data)
  const canEdit = role === 'admin'

  const base = `/restaurantes/${parsed.data}`

  return (
    <>
      <TerritoryNav
        hideOn={['/comecar']}
        items={[
          { href: base, label: 'Cardápio' },
          // Quem não é administrador não tem o que fazer nas outras três.
          // Escondê-las evita o clique que só leva a "sem permissão".
          ...(canEdit
            ? [
                { href: `${base}/identidade`, label: 'Identidade' },
                { href: `${base}/contato`, label: 'Contato' },
                { href: `${base}/equipe`, label: 'Equipe' },
              ]
            : []),
        ]}
      />
      {children}
    </>
  )
}
