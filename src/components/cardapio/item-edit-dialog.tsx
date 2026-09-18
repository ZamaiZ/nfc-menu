'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import type { OwnerMenuCategoryDTO, OwnerMenuItemDTO } from '@/domain/menu'
import { updateItemAction } from '@/server/actions/menu'
import { MediaEditor } from './media-editor'
import { VariantsEditor } from './variants-editor'

export function ItemEditDialog({
  item,
  categories,
  open,
  onOpenChange,
}: {
  item: OwnerMenuItemDTO
  categories: OwnerMenuCategoryDTO[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [visible, setVisible] = useState(item.isVisible)
  const [available, setAvailable] = useState(item.isAvailable)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(formData: FormData) {
    setPending(true)
    setError(null)

    const cents = Math.round(
      Number(String(formData.get('price') ?? '').replace(',', '.')) * 100,
    )
    if (!Number.isFinite(cents) || cents < 0) {
      setPending(false)
      setError('Informe um preço válido, como 18,90.')
      return
    }

    const result = await updateItemAction({
      itemId: item.id,
      categoryId: formData.get('categoryId'),
      name: formData.get('name'),
      description: formData.get('description') || undefined,
      basePriceCents: cents,
      dietaryTags: item.dietaryTags,
      isVisible: visible,
      isAvailable: available,
    })

    setPending(false)

    if (result.ok) {
      toast.add({ title: 'Item salvo', type: 'success' })
      onOpenChange(false)
      return
    }
    setError(result.error)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Rola por dentro, para os botões não sumirem no fim do rolamento —
          especialmente no celular. */}
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar item</DialogTitle>
          <DialogDescription>{item.name}</DialogDescription>
        </DialogHeader>

        <form action={submit} className="space-y-8">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="edit-category">Categoria</FieldLabel>
              <NativeSelect
                id="edit-category"
                name="categoryId"
                defaultValue={item.categoryId}
              >
                {categories.map((category) => (
                  <NativeSelectOption key={category.id} value={category.id}>
                    {category.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldDescription>
                Trocar a categoria move o item no cardápio.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="edit-name">Nome</FieldLabel>
              <Input
                id="edit-name"
                name="name"
                defaultValue={item.name}
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="edit-description">Descrição</FieldLabel>
              <Textarea
                id="edit-description"
                name="description"
                rows={3}
                defaultValue={item.description ?? ''}
              />
              <FieldDescription>
                Texto simples. Não são aceitos os caracteres menor e maior.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="edit-price">Preço</FieldLabel>
              <Input
                id="edit-price"
                name="price"
                inputMode="decimal"
                defaultValue={(item.basePriceCents / 100)
                  .toFixed(2)
                  .replace('.', ',')}
                required
              />
            </Field>

            <Field>
              <div className="flex items-center justify-between gap-4">
                <FieldLabel htmlFor="edit-visible">
                  Visível no cardápio
                </FieldLabel>
                <Switch
                  id="edit-visible"
                  checked={visible}
                  onCheckedChange={(next) => setVisible(next)}
                />
              </div>
            </Field>

            <Field>
              <div className="flex items-center justify-between gap-4">
                <FieldLabel htmlFor="edit-available">Disponível</FieldLabel>
                <Switch
                  id="edit-available"
                  checked={available}
                  onCheckedChange={(next) => setAvailable(next)}
                />
              </div>
            </Field>
          </FieldGroup>

          <div>
            <h3 className="mb-4 text-base font-semibold">Variações</h3>
            <VariantsEditor itemId={item.id} variants={item.variants} />
          </div>

          <div>
            <h3 className="mb-4 text-base font-semibold">Mídia</h3>
            <MediaEditor itemId={item.id} media={item.media} />
          </div>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Fechar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner className="size-4" /> : null}
              Salvar item
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
