'use client'

import { useOptimistic, useState, useTransition } from 'react'
import {
  RiDeleteBinLine,
  RiImageAddLine,
  RiImageLine,
  RiMore2Line,
  RiPencilLine,
} from 'react-icons/ri'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/components/ui/toast'
import type { OwnerMenuCategoryDTO, OwnerMenuItemDTO } from '@/domain/menu'
import { formatPriceBRL } from '@/lib/format'
import { publicMediaUrl } from '@/lib/media-url'
import {
  deleteItemAction,
  reorderItemsAction,
  setItemAvailabilityAction,
} from '@/server/actions/menu'
import type { ActionResult } from '@/server/actions/result'
import { ItemEditDialog } from './item-edit-dialog'
import { ReorderButtons } from './reorder-buttons'

export function ItemRow({
  restaurantId,
  item,
  index,
  all,
  categories,
  canEdit,
}: {
  restaurantId: string
  item: OwnerMenuItemDTO
  index: number
  all: OwnerMenuItemDTO[]
  categories: OwnerMenuCategoryDTO[]
  /** Só administrador edita. O nome, o preço e a miniatura continuam à vista
      de qualquer membro — consultar preço no salão é uso real. */
  canEdit: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  // Atualização otimista: no meio do serviço, esperar a ida e volta ao
  // servidor para ver o interruptor mudar é inaceitável.
  const [available, setAvailable] = useOptimistic(item.isAvailable)

  // A primeira mídia por POSIÇÃO, e não a primeira imagem. É ela que abre o
  // prato no feed desde a Fase 4 — se o dono pôs o vídeo na frente, a lista
  // precisa mostrar a capa dele, e não a foto que vem depois. Mostrar coisa
  // diferente da que o cliente vê é o defeito que esta tela existe para não
  // ter.
  const thumb = [...item.media].sort((a, b) => a.position - b.position)[0]

  const thumbUrl = thumb
    ? thumb.kind === 'image'
      ? publicMediaUrl('image', thumb.storagePath)
      : thumb.posterPath
        ? publicMediaUrl('image', thumb.posterPath)
        : null
    : null

  function run(action: () => Promise<ActionResult>, done: string) {
    startTransition(async () => {
      const result = await action()
      toast.add(
        result.ok
          ? { title: done, type: 'success' }
          : { title: result.error, type: 'error' },
      )
    })
  }

  function toggleAvailability(next: boolean) {
    startTransition(async () => {
      setAvailable(next)
      const result = await setItemAvailabilityAction({
        itemId: item.id,
        isAvailable: next,
      })
      // Falhou: o useOptimistic reverte sozinho quando a transição acaba sem
      // o servidor ter confirmado. Só precisamos avisar.
      if (!result.ok) {
        toast.add({ title: result.error, type: 'error' })
      }
    })
  }

  function move(direction: -1 | 1) {
    const reordered = [...all]
    const target = index + direction
    ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]

    run(
      () =>
        reorderItemsAction({
          restaurantId,
          order: reordered.map((entry, position) => ({
            id: entry.id,
            position,
          })),
        }),
      'Ordem atualizada',
    )
  }

  return (
    <div className="grid min-h-[76px] grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-3 border-b border-border/60 px-4 py-3 last:border-b-0 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:px-5">
      {/* Miniatura com img simples, não next/image: o CMS não é a superfície
          crítica de desempenho. (O motivo original — remotePatterns não
          configurado — deixou de valer na Fase 4, mas a escolha continua
          certa por outra razão: aqui o ganho não paga a indireção.)

          O `objectPosition` entra na Fase 5. Sem ele o recorte era CEGO, e o
          dono via na lista um enquadramento diferente do que o cliente vê no
          feed — que é justamente onde o ponto focal já mandava. */}
      {thumb && thumbUrl ? (
        <img
          src={thumbUrl}
          alt=""
          width={48}
          height={48}
          loading="lazy"
          className="size-12 shrink-0 rounded-xl object-cover"
          style={{
            objectPosition: `${thumb.focalX * 100}% ${thumb.focalY * 100}%`,
          }}
        />
      ) : (
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <RiImageLine className="size-5" aria-hidden="true" />
        </span>
      )}

      <div className="min-w-0">
        <p className="truncate font-medium">
          {item.name}
          {!item.isVisible ? (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              Oculto
            </span>
          ) : null}
          {/* Texto, e não só cor: quem não distingue o contraste precisa
              poder LER o que está faltando. É a mesma regra do "esgotado"
              no cardápio público. */}
          {item.semMidia ? (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-status-suspended-bg px-2 py-0.5 align-middle text-micro font-semibold text-status-suspended">
              <RiImageAddLine className="size-3" aria-hidden="true" />
              Sem foto
            </span>
          ) : null}
        </p>
        <p className="text-sm text-muted-foreground">
          {formatPriceBRL(item.basePriceCents)}
          {item.variants.length > 0
            ? ` · ${item.variants.length} ${item.variants.length === 1 ? 'variação' : 'variações'}`
            : ''}
        </p>
      </div>

      {/* A única ação pensada para o polegar: sem diálogo, sem confirmação,
          retorno imediato. É o que se faz no meio do serviço. Mesmo assim é
          escrita, e escrita é do administrador — para quem não é, a linha
          mostra a situação como TEXTO, sem interruptor. */}
      <div className="col-span-2 flex min-w-0 items-center justify-end gap-2 sm:col-span-1">
        {canEdit ? (
          <label className="flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-1.5 text-sm">
            <span className="text-muted-foreground">
              {available ? 'Disponível' : 'Esgotado'}
            </span>
            <Switch
              checked={available}
              disabled={pending}
              onCheckedChange={(next) => toggleAvailability(next)}
              aria-label={`${item.name} disponível`}
            />
          </label>
        ) : (
          <span className="text-sm text-muted-foreground">
            {available ? 'Disponível' : 'Esgotado'}
          </span>
        )}

        {canEdit ? (
          <ReorderButtons
            label={`item ${item.name}`}
            isFirst={index === 0}
            isLast={index === all.length - 1}
            disabled={pending}
            onUp={() => move(-1)}
            onDown={() => move(1)}
          />
        ) : null}

        {canEdit ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Ações do item ${item.name}`}
                />
              }
            >
              <RiMore2Line className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <RiPencilLine className="size-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDeleteOpen(true)}>
                <RiDeleteBinLine className="size-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      {/* Irmãos do menu, não filhos: diálogo dentro de menu suspenso some
          junto com o menu e nunca chega a aparecer. Montados só para quem
          edita. */}
      {canEdit ? (
        <>
      <ItemEditDialog
        item={item}
        categories={categories}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {item.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              As variações e as fotos deste item saem junto. Isto não pode ser
              desfeito.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => run(() => deleteItemAction(item.id), 'Item excluído')}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
        </>
      ) : null}
    </div>
  )
}
