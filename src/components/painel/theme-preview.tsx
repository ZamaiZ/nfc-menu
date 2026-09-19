'use client'

import { ALL_THEME_FONT_VARIABLES } from '@/lib/fonts'
import { resolveTheme } from '@/lib/theme/resolve'
import type { ThemeChoice } from '@/domain/theme'
import '@/components/cardapio-publico/theme.css'

// Um cardápio de mentira, com conteúdo plausível. Conteúdo de encher
// linguiça esconde erro de hierarquia: "Item 1 — R$ 00,00" fica bonito em
// qualquer tema.
const AMOSTRA = [
  {
    categoria: 'Entradas',
    itens: [
      { nome: 'Bolinho de bacalhau', descricao: 'Seis unidades, aioli de limão', preco: 'R$ 38,00' },
      { nome: 'Pastel de queijo', descricao: 'Massa fina, muçarela de búfala', preco: 'R$ 24,00' },
    ],
  },
  {
    categoria: 'Pratos principais',
    itens: [
      { nome: 'Picanha na chapa', descricao: '400g, farofa de ovo e vinagrete', preco: 'R$ 128,00' },
    ],
  },
]

// `resolveTheme` roda no navegador sem problema: ela importa `@/lib/color`,
// `@/lib/theme/presets` e `@/domain/theme`, e nenhum dos três toca `@/server`.
// Foi para isto que `color.ts` foi mantido livre de imports de servidor.
//
// A face escura NÃO é pré-visualizada: ela não é escolha do dono, é o padrão
// do preset. Mostrar duas telas dobraria a interface para uma informação que
// ele não controla.
export function ThemePreview({
  theme,
  name,
}: {
  theme: ThemeChoice
  name: string
}) {
  const resolvido = resolveTheme(theme)

  return (
    <div className="mx-auto w-[300px] overflow-hidden rounded-[28px] border-[7px] border-[#15161a] shadow-[var(--shadow-2)]">
      <div
        data-layout={resolvido.layout}
        data-density={resolvido.density}
        className={`menu h-[520px] overflow-hidden ${ALL_THEME_FONT_VARIABLES}`}
        style={resolvido.styleLight as React.CSSProperties}
      >
        <div
          className="h-28 w-full"
          style={{
            background:
              'linear-gradient(150deg, color-mix(in oklab, var(--m-accent) 70%, var(--m-base)), var(--m-base))',
          }}
        />

        <div className="px-4">
          <h3 className="menu-display -mt-2 text-[1.25rem] font-semibold leading-tight">
            {name || 'Seu restaurante'}
          </h3>

          {AMOSTRA.map((bloco) => (
            <section key={bloco.categoria} className="pt-5">
              <h4 className="menu-display menu-accent text-[0.625rem] font-bold uppercase tracking-[0.18em]">
                {bloco.categoria}
              </h4>
              <ul
                className="menu-list menu-line mt-1.5 divide-y"
                style={{ borderColor: 'var(--m-line)' }}
              >
                {bloco.itens.map((item) => (
                  <li
                    key={item.nome}
                    className="menu-item flex items-center gap-2 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="menu-display text-[0.8125rem] font-semibold">
                          {item.nome}
                        </span>
                        <span className="menu-accent shrink-0 text-[0.8125rem] font-semibold">
                          {item.preco}
                        </span>
                      </div>
                      <p className="menu-item-description menu-muted mt-0.5 text-[0.6875rem] leading-snug">
                        {item.descricao}
                      </p>
                    </div>
                    {resolvido.layout !== 'sem-foto' ? (
                      <div
                        className="menu-photo size-10 shrink-0"
                        style={{
                          background:
                            'linear-gradient(140deg, color-mix(in oklab, var(--m-accent) 45%, var(--m-base)), color-mix(in oklab, var(--m-accent) 85%, black))',
                        }}
                      />
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
