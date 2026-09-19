import type { MenuCategoryDTO } from '@/domain/menu'
import type { ThemePreset } from '@/domain/theme'
import { MenuItem } from './menu-item'

export function MenuCategory({
  category,
  layout,
}: {
  category: MenuCategoryDTO
  layout: ThemePreset['layout']
}) {
  return (
    <section className="pt-8">
      <h2 className="menu-display menu-accent text-xs font-bold uppercase tracking-[0.18em]">
        {category.name}
      </h2>
      {category.description ? (
        <p className="menu-muted mt-1 text-[0.8125rem]">{category.description}</p>
      ) : null}

      {/* O `style` explícito garante a cor do tema mesmo se a herança falhar
          por ordem de cascata — `divide-y` do Tailwind depende de
          border-color herdada. */}
      <ul
        className="menu-list menu-line mt-2 divide-y"
        style={{ borderColor: 'var(--m-line)' }}
      >
        {category.items.map((item) => (
          <MenuItem key={item.id} item={item} layout={layout} />
        ))}
      </ul>
    </section>
  )
}
