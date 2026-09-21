'use client'

import { useActionState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  RiInstagramLine,
  RiMapPinLine,
  RiPhoneLine,
  RiWhatsappLine,
} from 'react-icons/ri'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { IconField } from '@/components/ui/field-icon'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import type { ActionResult } from '@/server/actions/result'
import { updateRestaurantProfileAction } from '@/server/actions/restaurants'

type State = ActionResult | undefined

export function ProfileForm({
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
    if (state?.ok) toast.add({ title: 'Dados salvos', type: 'success' })
  }, [state])

  return (
    <form action={formAction} className="tavvi-surface space-y-6 p-5 sm:p-7">
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
        {/* Os MESMOS ícones que vão para os atalhos do cardápio público. O
            dono reconhece o que está preenchendo, e reconhece de novo quando
            vê o resultado na tela do cliente. `IconField` já existia e já era
            usado em outra tela; aqui era campo sem ícone. */}
        <IconField
          id="phone"
          name="phone"
          label="Telefone"
          icon={<RiPhoneLine />}
          defaultValue={contact.phone ?? ''}
        />
        <IconField
          id="whatsapp"
          name="whatsapp"
          label="WhatsApp"
          icon={<RiWhatsappLine />}
          defaultValue={contact.whatsapp ?? ''}
        />
        <IconField
          id="instagram"
          name="instagram"
          label="Instagram"
          icon={<RiInstagramLine />}
          defaultValue={contact.instagram ?? ''}
        />
        <IconField
          id="address"
          name="address"
          label="Endereço físico"
          icon={<RiMapPinLine />}
          defaultValue={contact.address ?? ''}
        />
      </FieldGroup>

      {state && !state.ok ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="min-w-36">
        {pending ? <Spinner className="size-4" /> : null}
        {pending ? 'Salvando…' : 'Salvar informações'}
      </Button>
    </form>
  )
}
