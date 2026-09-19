import Link from 'next/link'
import { notFound } from 'next/navigation'
import { IdentityForm } from '@/components/painel/identity-form'
import { ProfileForm } from '@/components/painel/profile-form'
import { Reveal } from '@/components/motion/reveal'
import { Button } from '@/components/ui/button'
import { uuidSchema } from '@/domain/common'
import { requireRestaurantAdmin } from '@/server/dal/auth'
import { getRestaurantForMember } from '@/server/dal/restaurants'

export const metadata = { title: 'Configurar restaurante' }

// Passos 2 e 3 do assistente. O passo 1 — o nome e o endereço — aconteceu na
// página do convite, e é por isso que o restaurante já EXISTE quando se chega
// aqui: o que vem agora é edição, e por isso pode ser pulado.
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ passo?: string }>
}) {
  const { id } = await params
  const parsed = uuidSchema.safeParse(id)
  if (!parsed.success) notFound()

  const restaurant = await getRestaurantForMember(parsed.data)
  if (!restaurant) notFound()
  await requireRestaurantAdmin(restaurant.id)

  const { passo } = await searchParams
  const etapa = passo === 'contato' ? 'contato' : 'identidade'

  return (
    <main className="mx-auto w-full max-w-[1180px] flex-1 px-4 py-8 sm:px-6">
      <Reveal>
        <div className="mb-8">
          <p className="text-micro font-semibold uppercase tracking-[0.12em] text-primary">
            Passo {etapa === 'identidade' ? '2' : '3'} de 3
          </p>
          <h1 className="mt-2 font-heading text-display font-semibold tracking-[-0.01em]">
            {etapa === 'identidade'
              ? 'A cara do seu cardápio'
              : 'Como te encontram'}
          </h1>
          <p className="mt-1 text-body text-muted-foreground">
            {etapa === 'identidade'
              ? 'Escolha o tema e as cores. Dá para mudar depois, quando quiser.'
              : 'Telefone, WhatsApp e endereço viram botões no topo do cardápio.'}
          </p>
        </div>

        {etapa === 'identidade' ? (
          <IdentityForm
            restaurantId={restaurant.id}
            name={restaurant.name}
            segment={restaurant.segment}
            theme={restaurant.theme}
            logoPath={restaurant.logoPath}
            coverPath={restaurant.coverPath}
          />
        ) : (
          <div className="max-w-[560px]">
            <ProfileForm
              restaurantId={restaurant.id}
              name={restaurant.name}
              description={restaurant.description}
              contact={restaurant.contact}
            />
          </div>
        )}

        {/* Pular é visível nos dois passos, e não escondido num canto. O
            restaurante já existe; nada aqui é obrigatório para operar. */}
        <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-border pt-6">
          {etapa === 'identidade' ? (
            <Button
              variant="outline"
              render={<Link href={`/restaurantes/${restaurant.id}/comecar?passo=contato`} />}
            >
              Continuar para o contato
            </Button>
          ) : null}

          <Button
            variant="ghost"
            render={<Link href={`/restaurantes/${restaurant.id}`} />}
          >
            {etapa === 'identidade' ? 'Pular e montar o cardápio' : 'Ir para o cardápio'}
          </Button>
        </div>
      </Reveal>
    </main>
  )
}
