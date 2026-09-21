'use client'

import { useEffect, useState } from 'react'
import { RiCloseLine, RiHome4Line, RiRestaurantLine } from 'react-icons/ri'
import type { MenuCategoryDTO } from '@/domain/menu'

// Fixo no topo, sobre as colunas. É ele que resolve "oitenta itens, quero
// Bebidas": tocar numa categoria ROLA até a primeira coluna dela. Não existe
// "conjunto de colunas da categoria atual" a ser trocado — a categoria é uma
// propriedade da coluna, e o feed é uma lista plana.
//
// Ele abre COLAPSADO, desde a Fase 5. O primeiro desenho deixava os chips
// sempre à mostra: eles ocupavam a faixa inteira sobre a foto, e o último
// ficava fatiado por uma borda reta na direita.
export function MenuRail({
  categorias,
  ativa,
  onIrParaCapa,
  onIrParaCategoria,
}: {
  categorias: MenuCategoryDTO[]
  /** Id da categoria da coluna visível. `null` na capa. */
  ativa: string | null
  onIrParaCapa: () => void
  onIrParaCategoria: (categoriaId: string) => void
}) {
  const [aberto, setAberto] = useState(false)

  // Fecha sozinho ao deslizar para outro prato. Aberto, ele não fica no
  // caminho da foto — que é o ponto inteiro de ele ser colapsável.
  useEffect(() => {
    setAberto(false)
  }, [ativa])

  const nomeAtual =
    categorias.find((categoria) => categoria.id === ativa)?.name ?? 'Cardápio'

  return (
    <nav
      aria-label="Categorias do cardápio"
      data-aberto={aberto}
      className="menu-rail menu-veil-top pointer-events-none absolute inset-x-0 top-0 z-20 pb-10 pt-3"
    >
      <div className="pointer-events-auto mx-auto flex w-full max-w-[720px] items-center gap-2 px-3">
        {/* A pílula é SEMPRE visível, e informa: fechada, ela diz onde você
            está. Um hambúrguer mudo não diria. */}
        <button
          type="button"
          onClick={() => setAberto((atual) => !atual)}
          aria-expanded={aberto}
          aria-label={aberto ? 'Fechar categorias' : 'Ver categorias'}
          className="menu-chip flex min-h-11 shrink-0 items-center gap-2 px-4 text-[0.8125rem] font-semibold"
        >
          {aberto ? (
            <RiCloseLine className="size-4" aria-hidden="true" />
          ) : (
            <RiRestaurantLine className="size-4" aria-hidden="true" />
          )}
          {aberto ? null : (
            <span className="max-w-[9rem] truncate">{nomeAtual}</span>
          )}
        </button>

        {/* `inert` tira os chips escondidos do foco e do leitor de tela. Sem
            ele, `Tab` passeia por botões invisíveis. */}
        <ul
          inert={!aberto}
          className="menu-rail-lista flex min-w-0 flex-1 gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {/* "Início" é o PRIMEIRO chip, e não uma seta solta. Como seta, a
              função de voltar só aparecia fora da capa — ou seja, não existia
              na primeira tela, que é exatamente onde alguém se perde. Como
              item da lista, ela existe sempre. */}
          <li className="menu-rail-item" style={{ '--i': 0 } as React.CSSProperties}>
            <button
              type="button"
              onClick={() => {
                onIrParaCapa()
                setAberto(false)
              }}
              className="menu-chip flex min-h-11 items-center gap-1.5 whitespace-nowrap px-4 text-[0.8125rem] font-semibold"
              style={
                ativa === null
                  ? {
                      background: 'var(--m-accent)',
                      color: 'var(--m-on-accent)',
                    }
                  : undefined
              }
            >
              <RiHome4Line className="size-4" aria-hidden="true" />
              Início
            </button>
          </li>

          {categorias.map((categoria, indice) => {
            const atual = categoria.id === ativa
            return (
              <li
                key={categoria.id}
                className="menu-rail-item"
                style={{ '--i': indice + 1 } as React.CSSProperties}
              >
                <button
                  type="button"
                  onClick={() => {
                    onIrParaCategoria(categoria.id)
                    setAberto(false)
                  }}
                  aria-current={atual ? 'true' : undefined}
                  className="menu-chip flex min-h-11 items-center whitespace-nowrap px-4 text-[0.8125rem] font-semibold transition-colors"
                  // A categoria ativa usa `--m-accent` como fundo e
                  // `--m-on-accent` como texto. É o único lugar do cardápio
                  // em que o destaque vira SUPERFÍCIE, e é por isso que
                  // `--m-on-accent` precisa ser derivado contra ele — o
                  // guarda de contraste cobre exatamente este par.
                  style={
                    atual
                      ? {
                          background: 'var(--m-accent)',
                          color: 'var(--m-on-accent)',
                        }
                      : undefined
                  }
                >
                  {categoria.name}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
