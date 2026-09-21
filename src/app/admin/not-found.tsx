import Link from 'next/link'
import { RiStore2Line } from 'react-icons/ri'
import { buttonVariants } from '@/components/ui/button'

export default function AdminNotFound() {
  return (
    <main className="flex min-h-[70dvh] items-center justify-center px-4 py-12 text-center">
      <section className="tavvi-surface w-full max-w-lg p-7 sm:p-9">
      <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <RiStore2Line className="size-6" aria-hidden="true" />
      </div>
      <h1 className="mt-5 text-xl font-semibold tracking-[-0.025em]">Restaurante não encontrado</h1>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
        Ele pode ter sido removido, ou o endereço está incorreto.
      </p>
      {/* Link estilizado, e não Button com `render`: a doc local do Base UI
          (`button.md:150`) diz que âncora não deve receber semântica de botão.

          E o destino é `/restaurantes`, não `/`: no console `/` é a tela de
          Convites. O botão dizia "Voltar para a lista" e levava a outro
          lugar. */}
      <Link href="/restaurantes" className={`${buttonVariants()} mt-6`}>
        Voltar para a lista
      </Link>
      </section>
    </main>
  )
}
