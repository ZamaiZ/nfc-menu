'use client'

import { useRef, useState } from 'react'
import { MediaEditor, type MediaEditorHandle } from '@/components/cardapio/media-editor'
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

// A decisão C6 da Fase 2 dizia: sem mídia aqui, porque ela precisa do id do
// item, que ainda não existe antes de salvar. Era verdade enquanto o arquivo
// subia no instante em que era escolhido.
//
// Com o STAGING da Fase 5 deixou de ser: os arquivos ficam em blob, o item
// nasce, e só então eles sobem. O editor entra em modo `itemId={null}`, que é
// exatamente este caso.
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
  const editorRef = useRef<MediaEditorHandle>(null)

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

    if (!result.ok) {
      setPending(false)
      setError(result.error)
      return
    }

    // O item NASCEU. Só agora as pendentes têm para onde ir.
    //
    // Se a criação tivesse falhado, nada subiria — e é isso que faz o dono
    // corrigir o preço sem perder os arquivos que já escolheu.
    const midiasOk =
      (await editorRef.current?.enviarPendentes(result.data.id)) ?? true

    setPending(false)

    if (midiasOk) {
      toast.add({ title: 'Item criado', type: 'success' })
      onOpenChange(false)
      return
    }

    setError(
      'O item foi criado, mas alguma mídia não subiu. Veja o motivo em cada uma.',
    )
  }

  // Fechar com pendente pede confirmação: aqui o risco é maior que na edição,
  // porque nem o item existe ainda.
  function aoTentarFechar(aberto: boolean) {
    if (aberto) {
      onOpenChange(true)
      return
    }

    const quantas = editorRef.current?.quantasPendentes() ?? 0
    if (quantas > 0) {
      const confirmado = window.confirm(
        quantas === 1
          ? 'Você tem 1 arquivo que ainda não foi enviado. Fechar agora descarta ele.'
          : `Você tem ${quantas} arquivos que ainda não foram enviados. Fechar agora descarta todos.`,
      )
      if (!confirmado) return
    }

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={aoTentarFechar}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo item</DialogTitle>
          <DialogDescription>
            Já dá para escolher as fotos e os vídeos aqui. Eles sobem quando
            você criar o item.
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

          <div>
            <h3 className="mb-3 text-base font-semibold">Fotos e vídeos</h3>
            {/* `itemId={null}`: o editor só ACUMULA. Quem envia é o `submit`,
                depois que `createItemAction` devolve o id. */}
            <MediaEditor ref={editorRef} itemId={null} media={[]} />
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
              onClick={() => aoTentarFechar(false)}
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
