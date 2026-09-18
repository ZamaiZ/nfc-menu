'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { signInAction } from '@/server/actions/auth'

export function SignInForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signInAction, undefined)

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="next" value={next} />

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">E-mail</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            autoFocus
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Senha</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </Field>
      </FieldGroup>

      {/* role="alert" faz o leitor de tela anunciar o erro assim que ele
          aparece. Sem isso, quem navega por teclado submete o formulário e
          não recebe retorno nenhum. */}
      {state && !state.ok ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Spinner className="size-4" /> : null}
        Entrar
      </Button>
    </form>
  )
}
