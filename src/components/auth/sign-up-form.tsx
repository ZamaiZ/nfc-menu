'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { signUpAction } from '@/server/actions/auth'

export function SignUpForm() {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(signUpAction, undefined)

  useEffect(() => {
    // O cadastro não redireciona: a pessoa precisa continuar NESTA página,
    // agora autenticada, para clicar em aceitar. O refresh faz o servidor
    // renderizar de novo e enxergar a sessão recém-criada.
    if (state?.ok) router.refresh()
  }, [state, router])

  return (
    <form action={formAction} className="space-y-6">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="signup-email">E-mail</FieldLabel>
          <Input
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="signup-password">Senha</FieldLabel>
          <Input
            id="signup-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
          />
          <FieldDescription>Ao menos 8 caracteres.</FieldDescription>
        </Field>
      </FieldGroup>

      {state && !state.ok ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Spinner className="size-4" /> : null}
        Criar conta
      </Button>
    </form>
  )
}
