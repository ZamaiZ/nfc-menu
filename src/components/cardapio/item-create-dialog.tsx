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
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { createItemAction } from '@/server/actions/menu'

// Campos mínimos, por decisão C6: mídia precisa do id do item, que ainda não
// existe antes de salvar. Descrição, variações e fotos ficam para a edição.
export function ItemCreateDialog({
  restaurantId,
  categoryId,
  open,
  onOpenChange,
}: {
  restaurantId: string
  categoryId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(formData: FormData) {
    setPending(true)
    setError(null)

    const reais = String(formData.get('price') ?? '').replace(',', '.')
    // Math.round importa: 19.9 * 100 em ponto flutuante dá 1989.9999..., e
    // truncar produziria R$ 19,89 silenciosamente.
    const cents = Math.round(Number(reais) * 100)

    if (!Number.isFinite(cents) || cents < 0) {
      setPending(false)
      setError('Informe um preço válido, como 18,90.')
      return
    }

    const result = await createItemAction({
      restaurantId,
      categoryId,
      name: formData.get('name'),
      basePriceCents: cents,
      dietaryTags: [],
    })

    setPending(false)

    if (result.ok) {
      toast.add({ title: 'Item criado', type: 'success' })
      onOpenChange(false)
      return
    }
    setError(result.error)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo item</DialogTitle>
          <DialogDescription>
            Descrição, variações e fotos você acrescenta depois, editando o
            item.
          </DialogDescription>
        </DialogHeader>

        <form action={submit} className="space-y-6">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="item-name">Nome</FieldLabel>
              <Input
                id="item-name"
                name="name"
                placeholder="Pão de alho"
                autoFocus
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="item-price">Preço</FieldLabel>
              <Input
                id="item-price"
                name="price"
                inputMode="decimal"
                placeholder="18,90"
                required
              />
              <FieldDescription>Em reais, como 18,90.</FieldDescription>
            </Field>
          </FieldGroup>

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
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner className="size-4" /> : null}
              Criar item
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
