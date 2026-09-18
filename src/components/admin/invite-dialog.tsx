'use client'

import { useState } from 'react'
import {
  RiAlertLine,
  RiCheckLine,
  RiFileCopyLine,
  RiMailAddLine,
} from 'react-icons/ri'
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
import { toast } from '@/components/ui/toast'
import { createInviteAction } from '@/server/actions/invites'

export function InviteDialog({ restaurantId }: { restaurantId: string }) {
  const [open, setOpen] = useState(false)
  const [link, setLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  function reset() {
    setOpen(false)
    setLink(null)
    setCopied(false)
    setError(null)
  }

  async function submit(formData: FormData) {
    setPending(true)
    setError(null)

    const result = await createInviteAction({
      restaurantId,
      role: 'owner',
      email: formData.get('email') || undefined,
      expiresInDays: Number(formData.get('expiresInDays') ?? 7),
    })

    setPending(false)
    if (result.ok) setLink(result.data.link)
    else setError(result.error)
  }

  async function copy() {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
    } catch {
      // Área de transferência negada ou indisponível. O link continua
      // visível e selecionável na tela, então dá para copiar na mão.
      toast.add({
        title: 'Não foi possível copiar automaticamente',
        description: 'Selecione o link e copie manualmente.',
        type: 'warning',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : reset())}>
      <DialogTrigger render={<Button variant="outline" />}>
        <RiMailAddLine className="size-4" />
        Emitir convite
      </DialogTrigger>

      <DialogContent>
        {link === null ? (
          <>
            <DialogHeader>
              <DialogTitle>Emitir convite</DialogTitle>
              <DialogDescription>
                Gera um link de acesso para o dono deste restaurante.
              </DialogDescription>
            </DialogHeader>

            <form action={submit} className="space-y-6">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="invite-email">
                    Amarrar a um e-mail
                  </FieldLabel>
                  <Input id="invite-email" name="email" type="email" />
                  <FieldDescription>
                    Opcional. Preenchido, o link só funciona para quem entrar
                    com esse e-mail.
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="expiresInDays">
                    Validade em dias
                  </FieldLabel>
                  <Input
                    id="expiresInDays"
                    name="expiresInDays"
                    type="number"
                    min={1}
                    max={30}
                    defaultValue={7}
                  />
                </Field>
              </FieldGroup>

              {error ? (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : null}

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={reset}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? <Spinner className="size-4" /> : null}
                  Gerar link
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Convite criado</DialogTitle>
              <DialogDescription>
                Copie o link agora. Ele não será exibido de novo.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* O aviso é texto, não só cor: quem não distingue o âmbar
                  precisa ler que isto é irrecuperável. */}
              <p className="flex gap-2 rounded-lg bg-status-suspended-bg p-4 text-sm text-status-suspended">
                <RiAlertLine
                  className="size-5 shrink-0"
                  aria-hidden="true"
                />
                <span>
                  O sistema guarda apenas uma marca deste link, e não consegue
                  reconstruí-lo. Se você fechar sem copiar, terá que emitir
                  outro convite.
                </span>
              </p>

              <div className="flex gap-2">
                <Input
                  readOnly
                  value={link}
                  onFocus={(event) => event.target.select()}
                />
                <Button type="button" variant="outline" onClick={copy}>
                  {copied ? (
                    <RiCheckLine className="size-4" />
                  ) : (
                    <RiFileCopyLine className="size-4" />
                  )}
                  {copied ? 'Copiado' : 'Copiar'}
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" onClick={reset}>
                Já copiei o link
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
