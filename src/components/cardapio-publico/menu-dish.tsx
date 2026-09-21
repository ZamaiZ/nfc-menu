'use client'

import { useState } from 'react'
import type { MenuItemDTO } from '@/domain/menu'
import { formatPriceBRL } from '@/lib/format'
import { MenuMedia } from './menu-media'

// Uma coluna do feed: o rolador vertical das mídias, e um rodapé que NÃO se
// move quando a mídia troca.
//
// Nome e preço pertencem ao PRATO, não à tela. É isso que separa "feed de um
// prato" de "carrossel de fotos soltas".
export function MenuDish({
  item,
  categoriaNome,
  indiceNaCategoria,
  totalNaCategoria,
  primeira,
  vizinha,
  onVerDetalhes,
}: {
  item: MenuItemDTO
  /** Vai junto do contador. Sem ele, "2 / 7" não diz de quê. */
  categoriaNome: string
  indiceNaCategoria: number
  totalNaCategoria: number
  /** Primeiro prato do feed: a mídia inicial dele carrega sem esperar. */
  primeira: boolean
  /** A coluna está no raio de pré-carga. Fora dele, nada é buscado. */
  vizinha: boolean
  onVerDetalhes: () => void
}) {
  const [telaAtiva, setTelaAtiva] = useState(0)

  // Com variações, o preço base some — regra da Fase 2, que continua. O
  // rodapé mostra a menor, e a lista inteira vai na folha: mostrar os dois
  // faria o cliente somar coisas que não se somam.
  const menorVariacao =
    item.variants.length > 0
      ? Math.min(...item.variants.map((v) => v.priceCents))
      : null

  function aoRolar(event: React.UIEvent<HTMLDivElement>) {
    const alvo = event.currentTarget
    // Divisão pela altura da própria janela de rolagem: cada tela ocupa
    // exatamente uma, por construção do `.menu-screen`.
    const indice = Math.round(alvo.scrollTop / alvo.clientHeight)
    if (indice !== telaAtiva) setTelaAtiva(indice)
  }

  return (
    <article className="menu-column" aria-label={item.name}>
      <div className="menu-screens" onScroll={aoRolar}>
        {item.media.map((media, indice) => (
          <MenuMedia
            key={media.storagePath}
            media={media}
            prioridade={primeira && indice === 0}
            ativa={vizinha && indice === telaAtiva}
            // A tela atual e uma de cada lado, DENTRO de uma coluna que já é
            // vizinha. As duas condições multiplicam.
            vizinha={vizinha && Math.abs(indice - telaAtiva) <= 1}
          />
        ))}
      </div>

      {/* Pontinhos: quantas telas o prato tem. Somem quando há uma só —
          indicador que indica um item só é ruído. */}
      {item.media.length > 1 ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-1.5"
        >
          {item.media.map((media, indice) => (
            <span
              key={media.storagePath}
              className="block size-1.5 rounded-full transition-opacity"
              style={{
                background: 'var(--m-ink)',
                opacity: indice === telaAtiva ? 0.95 : 0.35,
              }}
            />
          ))}
        </div>
      ) : null}

      {/* O rodapé vive FORA do rolador vertical. Ele não se move. */}
      <div className="menu-veil pointer-events-none absolute inset-x-0 bottom-0 z-10 pt-24">
        {/* O véu vai de borda a borda; o CONTEÚDO não. Num monitor, sem o
            limite, o nome do prato e o preço ficam nas duas pontas de uma
            linha de 1300px, e param de parecer o mesmo par. */}
        <div className="pointer-events-auto mx-auto w-full max-w-[720px] px-5 pb-8">
          {/* O contador é sobre o PRATO dentro da categoria — o eixo
              horizontal. Quem conta mídia são os pontinhos, no eixo
              vertical.

              A primeira versão mostrava só "1 / 1", sem dizer de quê, e num
              prato com duas fotos numa categoria de um item só isso lia como
              "foto 1 de 1" e parecia quebrado. Duas correções: o nome da
              categoria entra junto, e o contador SOME quando a categoria tem
              um item só — a mesma regra que já valia para os pontinhos. */}
          {totalNaCategoria > 1 ? (
            <p
              className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em]"
              style={{ color: 'var(--m-muted)' }}
            >
              {categoriaNome} · {indiceNaCategoria + 1} de {totalNaCategoria}
            </p>
          ) : (
            <p
              className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em]"
              style={{ color: 'var(--m-muted)' }}
            >
              {categoriaNome}
            </p>
          )}

          {item.dietaryTags.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {item.dietaryTags.map((tag) => (
                <li
                  key={tag}
                  className="menu-block border px-2 py-0.5 text-[0.6875rem] font-medium"
                  style={{
                    borderColor: 'var(--m-line)',
                    color: 'var(--m-muted)',
                  }}
                >
                  {tag}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-2 flex items-end justify-between gap-4">
            <h2 className="menu-display text-[1.5rem] font-semibold leading-tight">
              {item.name}
              {item.isAvailable ? null : (
                // Esgotado é TEXTO, não opacidade: quem não distingue o
                // contraste precisa poder ler. Regra da Fase 3, mantida.
                <span
                  className="ml-2 align-middle text-[0.8125rem] font-normal"
                  style={{ color: 'var(--m-muted)' }}
                >
                  esgotado
                </span>
              )}
            </h2>

            <span className="menu-accent shrink-0 text-[1.0625rem] font-semibold">
              {menorVariacao === null ? (
                formatPriceBRL(item.basePriceCents)
              ) : (
                <>
                  <span
                    className="mr-1 text-[0.75rem] font-normal"
                    style={{ color: 'var(--m-muted)' }}
                  >
                    a partir de
                  </span>
                  {formatPriceBRL(menorVariacao)}
                </>
              )}
            </span>
          </div>

          {item.description || item.variants.length > 0 ? (
            <button
              type="button"
              onClick={onVerDetalhes}
              className="mt-2 flex min-h-11 items-center text-left text-[0.875rem] leading-snug"
              style={{ color: 'var(--m-muted)' }}
            >
              <span className="line-clamp-2">
                {item.description ?? 'Ver as opções deste prato'}
              </span>
              <span className="ml-2 shrink-0 underline underline-offset-2">
                ver mais
              </span>
            </button>
          ) : null}
        </div>
      </div>
    </article>
  )
}
