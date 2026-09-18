'use client'

import { useActionState, useEffect, useState } from 'react'
import { RiAddLine } from 'react-icons/ri'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import type { ActionResult } from '@/server/actions/result'
import { createRestaurantAction } from '@/server/actions/restaurants'

type State = ActionResult<{ id: string; slug: string }> | undefined

async function submit(_prev: State, formData: FormData): Promise<State> {
  return createRestaurantAction({
    slug: formData.get('slug'),
    name: formData.get('name'),
    description: formData.get('description') || undefined,
  })
}

export function CreateRestaurantDialog({ rootDomain }: { rootDomain: string }) {
  const [open, setOpen] = useState(false)
  const [slug, setSlug] = useState('')
  const [state, formAction, pending] = useActionState<State, FormData>(
    submit,
    undefined,
  )

  useEffect(() => {
    if (state?.ok) {
      toast.add({ title: 'Restaurante criado', type: 'success' })
      setOpen(false)
      setSlug('')
    }
  }, [state])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Base UI compõe com `render`, não com `asChild`. */}
      <DialogTrigger render={<Button />}>
        <RiAddLine className="size-4" />
        Novo restaurante
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo restaurante</DialogTitle>
          <DialogDescription>
            O endereço define a URL pública do cardápio.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-6">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="slug">Endereço</FieldLabel>
              <Input
                id="slug"
                name="slug"
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                placeholder="cantina-da-esquina"
                autoFocus
                required
              />
              <FieldDescription>
                {slug ? `${rootDomain}/${slug}` : `${rootDomain}/seu-endereco`}
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="name">Nome</FieldLabel>
              <Input
                id="name"
                name="name"
                placeholder="Cantina da Esquina"
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="description">Descrição</FieldLabel>
              <Textarea id="description" name="description" rows={3} />
              <FieldDescription>Opcional.</FieldDescription>
            </Field>
          </FieldGroup>

          {/* Endereço já em uso chega aqui com a frase escrita por nós, e
              não com o genérico: é o ConflictError atravessando a pilha. */}
          {state && !state.ok ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner className="size-4" /> : null}
              Criar restaurante
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
