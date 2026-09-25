'use client'

import { useState, useTransition } from 'react'
import { ItemEditDialog } from '@/components/cardapio/item-edit-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { toast } from '@/components/ui/toast'
import type { OwnerMenuCategoryDTO, OwnerMenuItemDTO } from '@/domain/menu'
import { formatPriceBRL } from '@/lib/format'
import { publicMediaUrl } from '@/lib/media-url'
import { reorderItemsAction, setItemAvailabilityAction, updateItemAction } from '@/server/actions/menu'

export type MenuWorkMode = 'studio' | 'board' | 'spreadsheet' | 'sequence' | 'service'

export function MenuWorkModes({
  mode,
  restaurantId,
  categories,
  canEdit,
}: {
  mode: MenuWorkMode
  restaurantId: string
  categories: OwnerMenuCategoryDTO[]
  canEdit: boolean
}) {
  const [selected, setSelected] = useState<OwnerMenuItemDTO | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const items = categories.flatMap((category) => category.items)

  function toggleAvailable(item: OwnerMenuItemDTO, value: boolean) {
    startTransition(async () => {
      const result = await setItemAvailabilityAction({ itemId: item.id, isAvailable: value })
      toast.add(result.ok ? { title: value ? 'Item disponível' : 'Item esgotado', type: 'success' } : { title: result.error, type: 'error' })
    })
  }

  function saveItem(item: OwnerMenuItemDTO, changes: Partial<Pick<OwnerMenuItemDTO, 'name' | 'categoryId' | 'basePriceCents' | 'isVisible'>>) {
    if (changes.categoryId && changes.categoryId !== item.categoryId) {
      const updatedItem = { ...item, ...changes }
      startTransition(async () => {
        const result = await moveItem(updatedItem, changes.categoryId as string, item.categoryId)
        toast.add(result?.ok ? { title: 'Item movido', type: 'success' } : { title: result?.error ?? 'Não foi possível mover o item.', type: 'error' })
      })
      return
    }
    startTransition(async () => {
      const result = await updateItemAction({
        itemId: item.id,
        categoryId: changes.categoryId ?? item.categoryId,
        name: changes.name ?? item.name,
        description: item.description ?? undefined,
        basePriceCents: changes.basePriceCents ?? item.basePriceCents,
        dietaryTags: item.dietaryTags,
        isVisible: changes.isVisible ?? item.isVisible,
        isAvailable: item.isAvailable,
      })
      toast.add(result.ok ? { title: 'Item atualizado', type: 'success' } : { title: result.error, type: 'error' })
    })
  }

  async function moveItem(item: OwnerMenuItemDTO, categoryId: string, sourceCategoryId = item.categoryId) {
    const destination = categories.find((category) => category.id === categoryId)
    const source = categories.find((category) => category.id === sourceCategoryId)
    if (!destination || !source || destination.id === source.id) return
    const updated = await updateItemAction({
      itemId: item.id,
      categoryId,
      name: item.name,
      description: item.description ?? undefined,
      basePriceCents: item.basePriceCents,
      dietaryTags: item.dietaryTags,
      isVisible: item.isVisible,
      isAvailable: item.isAvailable,
    })
    if (!updated.ok) return updated
    if (source.items.length > 1) {
      const sourceResult = await reorderItemsAction({
        restaurantId,
        order: source.items.filter((entry) => entry.id !== item.id).map((entry, position) => ({ id: entry.id, position })),
      })
      if (!sourceResult.ok) return sourceResult
    }
    return reorderItemsAction({
      restaurantId,
      order: [...destination.items, item].map((entry, position) => ({ id: entry.id, position })),
    })
  }

  function dropItem(event: React.DragEvent, categoryId: string) {
    event.preventDefault()
    if (!canEdit) return
    const item = items.find((entry) => entry.id === event.dataTransfer.getData('text/menu-item-id'))
    if (!item) return
    startTransition(async () => {
      const result = await moveItem(item, categoryId)
      toast.add(result?.ok ? { title: 'Item movido', type: 'success' } : { title: result?.error ?? 'Não foi possível mover o item.', type: 'error' })
    })
  }

  if (mode === 'service') return <section className="tv-work-service" aria-label="Disponibilidade dos itens">
    {items.filter((item) => item.isVisible).map((item) => <button key={item.id} type="button" disabled={pending} className={item.isAvailable ? 'is-available' : 'is-unavailable'} onClick={() => toggleAvailable(item, !item.isAvailable)}><span>{item.isAvailable ? 'Disponível' : 'Esgotado'}</span><strong>{item.name}</strong><small>{formatPriceBRL(item.basePriceCents)}</small></button>)}
    {items.every((item) => !item.isVisible || item.isAvailable) ? <p className="tv-work-empty">Nenhum item visível está esgotado.</p> : null}
  </section>

  if (mode === 'sequence') {
    const feed = categories.filter((category) => category.isVisible).flatMap((category) => category.items.filter((item) => item.isVisible && item.media.length > 0).map((item) => ({ category, item })))
    return <section className="tv-work-sequence" aria-label="Ordem do feed público">
      {feed.map(({ category, item }, index) => {
        const media = [...item.media].sort((a, b) => a.position - b.position)[0]
        const image = media?.kind === 'image' ? media.storagePath : media?.posterPath
        return <article key={item.id}><div className="tv-sequence-image">{image ? <img src={publicMediaUrl('image', image)} alt="" /> : null}<span>{String(index + 1).padStart(2, '0')}</span></div><small>{category.name}</small><strong>{item.name}</strong>{!item.isAvailable ? <em>Esgotado</em> : null}</article>
      })}
      {feed.length === 0 ? <p className="tv-work-empty">Nenhum item visível com mídia entra no feed.</p> : null}
    </section>
  }

  if (mode === 'board') return <section className="tv-work-board" aria-label="Quadro por categoria">
    {categories.map((category) => <div key={category.id} className="tv-work-column" onDragOver={(event) => event.preventDefault()} onDrop={(event) => dropItem(event, category.id)}><header><strong>{category.name}</strong><span>{category.items.length}</span></header>{category.items.map((item) => <article key={item.id} draggable={canEdit} onDragStart={(event) => event.dataTransfer.setData('text/menu-item-id', item.id)}><strong>{item.name}</strong><span>{formatPriceBRL(item.basePriceCents)}</span><small>{item.isAvailable ? 'Disponível' : 'Esgotado'}</small><NativeSelect disabled={!canEdit || pending} aria-label={`Mover ${item.name} para outra categoria`} value={item.categoryId} onChange={(event) => startTransition(async () => { const result = await moveItem(item, event.target.value); toast.add(result?.ok ? { title: 'Item movido', type: 'success' } : { title: result?.error ?? 'Não foi possível mover o item.', type: 'error' }) })}>{categories.map((target) => <option key={target.id} value={target.id}>{target.name}</option>)}</NativeSelect></article>)}{category.items.length === 0 ? <p>Solte um item nesta coluna.</p> : null}</div>)}
  </section>

  if (mode === 'spreadsheet') return <section className="tv-work-sheet" aria-label="Planilha de itens"><div className="tv-work-sheet-head"><span>Item</span><span>Categoria</span><span>Preço</span><span>Visível</span><span>Disponível</span></div>{categories.flatMap((category) => category.items).map((item) => <SpreadsheetRow key={item.id} item={item} categories={categories} canEdit={canEdit} onSave={saveItem} onAvailability={toggleAvailable} pending={pending} />)}</section>

  return <section className="tv-work-studio"><div className="tv-work-studio-list"><h2>Itens</h2>{items.map((item) => <button type="button" key={item.id} className={selected?.id === item.id ? 'is-selected' : ''} onClick={() => setSelected(item)}>{item.name}<span>{formatPriceBRL(item.basePriceCents)}</span></button>)}</div><div className="tv-work-studio-preview"><h2>Prévia ao vivo</h2>{selected ? <><article>{selected.media[0] ? <img src={publicMediaUrl('image', selected.media[0].kind === 'image' ? selected.media[0].storagePath : selected.media[0].posterPath ?? selected.media[0].storagePath)} alt="" /> : <div className="tv-studio-placeholder">Sem mídia</div>}<small>{categories.find((category) => category.id === selected.categoryId)?.name}</small><strong>{selected.name}</strong>{selected.description ? <p>{selected.description}</p> : null}<b>{formatPriceBRL(selected.basePriceCents)}</b></article>{canEdit ? <Button type="button" className="mt-4" onClick={() => setEditorOpen(true)}>Editar item</Button> : null}</> : <p>Escolha um item para ver a prévia.</p>}</div>{selected && canEdit ? <ItemEditDialog item={selected} categories={categories} open={editorOpen} onOpenChange={setEditorOpen} /> : null}</section>
}

function SpreadsheetRow({
  item,
  categories,
  canEdit,
  onSave,
  onAvailability,
  pending,
}: {
  item: OwnerMenuItemDTO
  categories: OwnerMenuCategoryDTO[]
  canEdit: boolean
  onSave: (item: OwnerMenuItemDTO, changes: Partial<Pick<OwnerMenuItemDTO, 'name' | 'categoryId' | 'basePriceCents' | 'isVisible'>>) => void
  onAvailability: (item: OwnerMenuItemDTO, value: boolean) => void
  pending: boolean
}) {
  const [name, setName] = useState(item.name)
  const [categoryId, setCategoryId] = useState(item.categoryId)
  const [price, setPrice] = useState((item.basePriceCents / 100).toFixed(2).replace('.', ','))
  function save() {
    const cents = Math.round(Number(price.replace(',', '.')) * 100)
    if (!Number.isFinite(cents) || cents < 0) { setPrice((item.basePriceCents / 100).toFixed(2).replace('.', ',')); return }
    if (name !== item.name || categoryId !== item.categoryId || cents !== item.basePriceCents) onSave(item, { name, categoryId, basePriceCents: cents })
  }
  return <div className="tv-work-sheet-row"><Input disabled={!canEdit || pending} value={name} aria-label={`Nome de ${item.name}`} onChange={(event) => setName(event.target.value)} onBlur={save} onKeyDown={(event) => { if (event.key === 'Enter') { event.currentTarget.blur() } if (event.key === 'Escape') { setName(item.name); setPrice((item.basePriceCents / 100).toFixed(2).replace('.', ',')); setCategoryId(item.categoryId) } }} /><NativeSelect disabled={!canEdit || pending} value={categoryId} aria-label={`Categoria de ${item.name}`} onChange={(event) => setCategoryId(event.target.value)} onBlur={save} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); if (event.key === 'Escape') setCategoryId(item.categoryId) }}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</NativeSelect><Input disabled={!canEdit || pending} value={price} aria-label={`Preço de ${item.name}`} inputMode="decimal" onChange={(event) => setPrice(event.target.value)} onBlur={save} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); if (event.key === 'Escape') setPrice((item.basePriceCents / 100).toFixed(2).replace('.', ',')) }} /><label><input type="checkbox" disabled={!canEdit || pending} checked={item.isVisible} onChange={(event) => onSave(item, { isVisible: event.target.checked })} /> Visível</label><label><input type="checkbox" disabled={!canEdit || pending} checked={item.isAvailable} onChange={(event) => onAvailability(item, event.target.checked)} /> Disponível</label></div>
}
