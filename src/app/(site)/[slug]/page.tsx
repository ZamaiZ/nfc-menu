import { notFound } from 'next/navigation'
import { formatPriceBRL } from '@/lib/format'
import { getPublicMenu } from '@/server/dal/menu'

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const menu = await getPublicMenu(slug)

  // Restaurante inexistente, em rascunho, suspenso ou removido caem todos
  // aqui. A resposta é a mesma para não revelar que o restaurante existe.
  if (!menu) notFound()

  return (
    <main>
      <h1>{menu.restaurant.name}</h1>
      {menu.restaurant.description ? <p>{menu.restaurant.description}</p> : null}

      {menu.categories.map((category) => (
        <section key={category.id}>
          <h2>{category.name}</h2>
          <ul>
            {category.items.map((item) => (
              <li key={item.id}>
                <strong>{item.name}</strong> — {formatPriceBRL(item.basePriceCents)}
                {item.isAvailable ? null : <span> (esgotado)</span>}
                {item.variants.map((variant) => (
                  <div key={variant.id}>
                    {variant.name}: {formatPriceBRL(variant.priceCents)}
                  </div>
                ))}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  )
}
