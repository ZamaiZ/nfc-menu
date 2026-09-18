'use client'

import { useTransition } from 'react'
import { RiLogoutBoxLine } from 'react-icons/ri'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { signOutAction } from '@/server/actions/auth'

export function SignOutButton() {
  const [pending, startTransition] = useTransition()

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => void signOutAction())}
    >
      {pending ? <Spinner className="size-4" /> : <RiLogoutBoxLine className="size-4" />}
      Sair
    </Button>
  )
}
