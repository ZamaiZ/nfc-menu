'use client'

import { useActionState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import type { ActionResult } from '@/server/actions/result'
import { updateRestaurantProfileAction } from '@/server/actions/restaurants'

type State = ActionResult | undefined

export function IdentityForm({
  restaurantId,
  name,
  description,
  contact,
}: {
  restaurantId: string
  name: string
  description: string | null
  contact: Record<string, string>
}) {
  const [state, formAction, pending] = useActionState<State, FormData>(
    async (_prev, formData) =>
      updateRestaurantProfileAction({
        restaurantId,
        name: formData.get('name'),
        description: formData.get('description') || undefined,
        contact: {
          phone: formData.get('phone') || undefined,
          whatsapp: formData.get('whatsapp') || undefined,
          instagram: formData.get('instagram') || undefined,
          address: formData.get('address') || undefined,
        },
      }),
    undefined,
  )

  useEffect(() => {
    if (state?.ok) toast.add({ title: 'Identidade salva', type: 'success' })
  }, [state])

  return (
    <form action={formAction} className="space-y-6">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">Nome</FieldLabel>
          <Input id="name" name="name" defaultValue={name} required />
        </Field>
        <Field>
          <FieldLabel htmlFor="description">Descrição</FieldLabel>
          <Textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={description ?? ''}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="phone">Telefone</FieldLabel>
          <Input id="phone" name="phone" defaultValue={contact.phone ?? ''} />
        </Field>
        <Field>
          <FieldLabel htmlFor="whatsapp">WhatsApp</FieldLabel>
          <Input
            id="whatsapp"
            name="whatsapp"
            defaultValue={contact.whatsapp ?? ''}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="instagram">Instagram</FieldLabel>
          <Input
            id="instagram"
            name="instagram"
            defaultValue={contact.instagram ?? ''}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="address">Endereço físico</FieldLabel>
          <Input
            id="address"
            name="address"
            defaultValue={contact.address ?? ''}
          />
        </Field>
      </FieldGroup>

      {state && !state.ok ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? <Spinner className="size-4" /> : null}
        Salvar identidade
      </Button>
    </form>
  )
}
