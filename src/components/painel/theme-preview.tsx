'use client'

import { ALL_THEME_FONT_VARIABLES } from '@/lib/fonts'
import { resolveTheme } from '@/lib/theme/resolve'
import type { Density, ThemeChoice } from '@/domain/theme'
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

function Tela({
  vars,
  rotulo,
  name,
  density,
}: {
  vars: Record<string, string>
  rotulo: string
  name: string
  density: Density
}) {
  return (
    <div>
      <p className="mb-2 text-center text-micro font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {rotulo}
      </p>
      <div className="mx-auto w-full max-w-[176px] overflow-hidden rounded-[22px] border-[5px] border-[#15161a] shadow-[var(--shadow-2)]">
        <div
          data-density={density}
          className={`menu h-[344px] overflow-hidden ${ALL_THEME_FONT_VARIABLES}`}
          style={vars as React.CSSProperties}
        >
          <div
            className="h-20 w-full"
            style={{
              background:
                'linear-gradient(150deg, color-mix(in oklab, var(--m-accent) 70%, var(--m-base)), var(--m-base))',
            }}
          />

          <div className="px-3">
            <h3 className="menu-display -mt-2 text-[0.98rem] font-semibold leading-tight">
              {name || 'Seu restaurante'}
            </h3>

            {AMOSTRA.map((bloco) => (
              <section key={bloco.categoria} className="pt-4">
                <h4 className="menu-display menu-accent text-[0.5625rem] font-bold uppercase tracking-[0.18em]">
                  {bloco.categoria}
                </h4>
                <ul
                  className="menu-list menu-line mt-1 divide-y"
                  style={{ borderColor: 'var(--m-line)' }}
                >
                  {bloco.itens.map((item) => (
                    <li
                      key={item.nome}
                      className="menu-item flex items-center gap-2 py-1.5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="menu-display text-[0.75rem] font-semibold">
                            {item.nome}
                          </span>
                          <span className="menu-accent shrink-0 text-[0.75rem] font-semibold">
                            {item.preco}
                          </span>
                        </div>
                        <p className="menu-item-description menu-muted mt-0.5 text-[0.625rem] leading-snug">
                          {item.descricao}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// `resolveTheme` roda no navegador sem problema: ela importa `@/lib/color`,
// `@/lib/theme/presets` e `@/domain/theme`, e nenhum dos três toca `@/server`.
// Foi para isto que `color.ts` foi mantido livre de imports de servidor.
//
// As DUAS faces são mostradas. A Fase 3 mostrava só a clara, com o argumento
// de que a escura não era escolha do dono. Deixou de ser verdade: o destaque
// que ele escolhe agora é derivado em cada face, e é justamente na escura que
// a derivação mais aparece. Mostrar uma só foi o que permitiu um cardápio
// ilegível chegar ao ar.
export function ThemePreview({
  theme,
  name,
}: {
  theme: ThemeChoice
  name: string
}) {
  const resolvido = resolveTheme(theme)

  return (
    <div className="grid grid-cols-2 gap-3 pb-2 sm:gap-4">
      <Tela
        vars={resolvido.styleLight}
        rotulo="Claro"
        name={name}
        density={resolvido.density}
      />
      <Tela
        vars={resolvido.styleDark}
        rotulo="Escuro"
        name={name}
        density={resolvido.density}
      />
    </div>
  )
}
