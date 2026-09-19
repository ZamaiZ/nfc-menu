import { notFound } from 'next/navigation'
import { MenuCategory } from '@/components/cardapio-publico/menu-category'
import { MenuHeader } from '@/components/cardapio-publico/menu-header'
import { Stagger } from '@/components/motion/reveal'
import { ALL_THEME_FONT_VARIABLES } from '@/lib/fonts'
import { resolveTheme } from '@/lib/theme/resolve'
import { getPublicMenu } from '@/server/dal/menu'
import '@/components/cardapio-publico/theme.css'

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

  const theme = resolveTheme(menu.restaurant.theme)

  return (
    <>
      {/* As variáveis das duas faces entram por folha de estilo embutida, e
          não por `style` no elemento, porque `style` não consegue expressar
          media query. A face escura só vale quando o aparelho do cliente
          pede escuro — e quem decide isso é o celular na mesa, não nós. */}
      <style
        dangerouslySetInnerHTML={{
          __html: [
            `[data-menu="${theme.presetId}"]{${toCss(theme.styleLight)}}`,
            `@media (prefers-color-scheme: dark){`,
            `[data-menu="${theme.presetId}"]{${toCss(theme.styleDark)}}`,
            `}`,
          ].join(''),
        }}
      />

      <div
        data-menu={theme.presetId}
        data-layout={theme.layout}
        data-density={theme.density}
        className={`menu ${ALL_THEME_FONT_VARIABLES}`}
      >
        <MenuHeader
          name={menu.restaurant.name}
          description={menu.restaurant.description}
          logoPath={menu.restaurant.logoPath}
          coverPath={menu.restaurant.coverPath}
          contact={menu.restaurant.contact}
        />

        <main className="mx-auto w-full max-w-[560px] px-5 pb-16">
          <Stagger>
            {menu.categories.map((category) => (
              <MenuCategory
                key={category.id}
                category={category}
                layout={theme.layout}
              />
            ))}
          </Stagger>
        </main>
      </div>
    </>
  )
}

// Os valores são cores em hexadecimal, comprimentos e nomes de variável de
// fonte — todos vindos dos presets no código ou já validados pelo
// `themeSchema` e pelo `isBaseInRange` antes de chegarem aqui. Nada vindo
// direto do cliente entra nesta string.
function toCss(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([nome, valor]) => `${nome}:${valor}`)
    .join(';')
}
