import type { MenuItemDTO } from '@/domain/menu'
import type { ThemePreset } from '@/domain/theme'
import { formatPriceBRL } from '@/lib/format'
import { publicMediaUrl } from '@/lib/media-url'

export function MenuItem({
  item,
  layout,
}: {
  item: MenuItemDTO
  layout: ThemePreset['layout']
}) {
  // A primeira mídia é a miniatura. Vídeo entra pela CAPA, nunca tocando
  // sozinho: som e dados móveis numa mesa de restaurante são agressão.
  const primeira = item.media[0]
  const thumb = primeira
    ? primeira.kind === 'image'
      ? publicMediaUrl('image', primeira.storagePath)
      : primeira.posterPath
        ? publicMediaUrl('image', primeira.posterPath)
        : null
    : null

  const semFoto = layout === 'sem-foto'
  const tamanhoFoto =
    layout === 'foto-grande' || layout === 'cartao'
      ? 'h-[70px] w-[70px]'
      : 'h-[52px] w-[52px]'

  const foto =
    thumb !== null && !semFoto ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={thumb}
        alt=""
        loading="lazy"
        className={`menu-photo shrink-0 ${tamanhoFoto}`}
      />
    ) : null

  return (
    <li className="menu-item flex items-center gap-3 py-3">
      {/* Foto à esquerda nos temas de foto grande e de cartão; à direita nos
          de foto pequena. É o que separa "apetite primeiro" de "texto
          primeiro". */}
      {layout !== 'foto-pequena' ? foto : null}

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="menu-display text-[0.9375rem] font-semibold">
            {item.name}
            {item.isAvailable ? null : (
              // Esgotado é TEXTO, não só opacidade: quem não distingue o
              // contraste precisa poder ler.
              <span className="menu-muted ml-2 text-xs font-normal">
                esgotado
              </span>
            )}
          </h3>

          {/* O preço base só aparece quando não há variações. Com variações,
              cada uma traz o próprio — mostrar os dois faria o cliente somar
              coisas que não se somam. */}
          {item.variants.length === 0 ? (
            <span className="menu-accent shrink-0 text-[0.9375rem] font-semibold">
              {formatPriceBRL(item.basePriceCents)}
            </span>
          ) : null}
        </div>

        {item.description ? (
          <p className="menu-item-description menu-muted mt-1 text-[0.8125rem] leading-snug">
            {item.description}
          </p>
        ) : null}

        {item.variants.length > 0 ? (
          <ul className="mt-2 space-y-1">
            {item.variants.map((variant) => (
              <li
                key={variant.id}
                className="flex items-baseline justify-between gap-3 text-[0.8125rem]"
              >
                <span className="menu-muted">
                  {variant.name}
                  {variant.isAvailable ? null : ' · esgotado'}
                </span>
                <span className="menu-accent font-semibold">
                  {formatPriceBRL(variant.priceCents)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {layout === 'foto-pequena' ? foto : null}
    </li>
  )
}
