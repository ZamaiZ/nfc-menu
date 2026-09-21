'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { MenuItemDTO, PublicMenuDTO } from '@/domain/menu'
import { MenuCover } from './menu-cover'
import { MenuDetails } from './menu-details'
import { MenuDish } from './menu-dish'
import { MenuRail } from './menu-rail'

type Coluna = {
  item: MenuItemDTO
  categoriaId: string
  categoriaNome: string
  indiceNaCategoria: number
  totalNaCategoria: number
}

export function MenuFeed({
  menu,
  presetId,
}: {
  menu: PublicMenuDTO
  presetId: string
}) {
  const feedRef = useRef<HTMLDivElement>(null)
  const [indiceAtual, setIndiceAtual] = useState(0)
  const [detalhes, setDetalhes] = useState<MenuItemDTO | null>(null)

  // Lista PLANA: a capa e todos os pratos de todas as categorias, em ordem.
  // Trocar o conjunto de colunas ao escolher categoria impediria a categoria
  // seguinte de entrar em sequência no deslize, e criaria um estado que
  // teria de ser mantido em sincronia com a posição do rolador.
  const colunas: Coluna[] = menu.categories.flatMap((categoria) =>
    categoria.items.map((item, indice) => ({
      item,
      categoriaId: categoria.id,
      categoriaNome: categoria.name,
      indiceNaCategoria: indice,
      totalNaCategoria: categoria.items.length,
    })),
  )

  // Índice 0 é a capa, então a coluna N do feed é `colunas[N - 1]`.
  const colunaAtual = indiceAtual > 0 ? colunas[indiceAtual - 1] : null

  // Cardápio publicado em que nenhum item tem mídia. Acontece com restaurante
  // que já estava no ar antes da Fase 4 — eles não são despublicados —,
  // então o caso é real e precisa de resposta.
  const vazio = colunas.length === 0

  // `scrollIntoView` na coluna, e não `scrollTo` com um deslocamento em
  // pixels: é a API própria para contêiner com `scroll-snap`, e não depende
  // de `clientWidth`, que muda quando o aparelho gira.
  const irPara = useCallback((indice: number) => {
    const feed = feedRef.current
    if (!feed) return
    const alvo = feed.children[indice] as HTMLElement | undefined
    if (!alvo) return

    // `block: 'nearest'` é o que impede a chamada de rolar algum ancestral
    // na vertical de quebra.
    alvo.scrollIntoView({
      behavior: 'smooth',
      inline: 'start',
      block: 'nearest',
    })
  }, [])

  function aoRolar() {
    const feed = feedRef.current
    if (!feed) return
    const indice = Math.round(feed.scrollLeft / feed.clientWidth)
    if (indice !== indiceAtual) setIndiceAtual(indice)
  }

  function irParaCategoria(categoriaId: string) {
    const posicao = colunas.findIndex((c) => c.categoriaId === categoriaId)
    if (posicao >= 0) irPara(posicao + 1)
  }

  // Teclado. O rolador nativo responde a seta quando tem foco, mas só depois
  // de a pessoa clicar nele. Ouvir na janela faz o cardápio ser navegável de
  // teclado desde o primeiro instante.
  useEffect(() => {
    function aoTeclar(event: KeyboardEvent) {
      if (event.key === 'ArrowRight') {
        irPara(Math.min(indiceAtual + 1, colunas.length))
      }
      if (event.key === 'ArrowLeft') {
        irPara(Math.max(indiceAtual - 1, 0))
      }
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [indiceAtual, colunas.length, irPara])

  return (
    <>
      <MenuRail
        categorias={menu.categories}
        ativa={colunaAtual?.categoriaId ?? null}
        onIrParaCapa={() => irPara(0)}
        onIrParaCategoria={irParaCategoria}
      />

      <div ref={feedRef} className="menu-feed" onScroll={aoRolar}>
        <MenuCover
          name={menu.restaurant.name}
          description={menu.restaurant.description}
          logoPath={menu.restaurant.logoPath}
          coverPath={menu.restaurant.coverPath}
          contact={menu.restaurant.contact}
        />

        {vazio ? (
          <section className="menu-column" aria-label="Cardápio em montagem">
            <div className="flex h-full flex-col items-center justify-center px-8 text-center">
              <p className="menu-display text-[1.25rem] font-semibold">
                O cardápio está sendo montado
              </p>
              <p
                className="mt-2 text-[0.9375rem]"
                style={{ color: 'var(--m-muted)' }}
              >
                Volte daqui a pouco, ou chame alguém da casa.
              </p>
            </div>
          </section>
        ) : null}

        {colunas.map((coluna, indice) => (
          <MenuDish
            key={coluna.item.id}
            item={coluna.item}
            categoriaNome={coluna.categoriaNome}
            indiceNaCategoria={coluna.indiceNaCategoria}
            totalNaCategoria={coluna.totalNaCategoria}
            primeira={indice === 0}
            // A coluna atual e uma de cada lado. Fora disso a mídia não é
            // buscada: quarenta pratos seriam quarenta imagens de tela cheia
            // numa rede de restaurante.
            vizinha={Math.abs(indice + 1 - indiceAtual) <= 1}
            onVerDetalhes={() => setDetalhes(coluna.item)}
          />
        ))}
      </div>

      <MenuDetails
        item={detalhes}
        presetId={presetId}
        onFechar={() => setDetalhes(null)}
      />
    </>
  )
}
