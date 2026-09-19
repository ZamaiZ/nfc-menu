import { publicMediaUrl } from '@/lib/media-url'

type Atalho = { rotulo: string; href: string }

export function MenuHeader({
  name,
  description,
  logoPath,
  coverPath,
  contact,
}: {
  name: string
  description: string | null
  logoPath: string | null
  coverPath: string | null
  contact: Record<string, string>
}) {
  // O predicado é escrito à mão: a inferência automática de `filter` só chegou
  // no TypeScript 5.5, e o projeto declara `^5`, que permite instalar 5.0.
  const links: Atalho[] = [
    contact.whatsapp
      ? {
          rotulo: 'WhatsApp',
          href: `https://wa.me/${contact.whatsapp.replace(/\D/g, '')}`,
        }
      : null,
    contact.instagram
      ? {
          rotulo: 'Instagram',
          href: `https://instagram.com/${contact.instagram.replace(/^@/, '')}`,
        }
      : null,
    contact.phone
      ? { rotulo: 'Telefone', href: `tel:${contact.phone.replace(/\D/g, '')}` }
      : null,
  ].filter((link): link is Atalho => link !== null)

  return (
    <header>
      <div className="relative h-44 w-full overflow-hidden sm:h-56">
        {coverPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={publicMediaUrl('image', coverPath)}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          // Sem capa, o tema desenha uma: gradiente do destaque até o fundo.
          // Um retângulo cinza diria "faltou foto"; isto diz "é assim".
          <div
            className="h-full w-full"
            style={{
              background:
                'linear-gradient(150deg, color-mix(in oklab, var(--m-accent) 70%, var(--m-base)), var(--m-base))',
            }}
          />
        )}
        {/* A esfumaçada liga a capa ao fundo do tema, em vez de cortar seco. */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to top, var(--m-base) 3%, transparent 55%)',
          }}
        />
      </div>

      <div className="mx-auto w-full max-w-[560px] px-5">
        {logoPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={publicMediaUrl('image', logoPath)}
            alt=""
            className="menu-photo -mt-10 h-20 w-20 border-4"
            style={{ borderColor: 'var(--m-base)' }}
          />
        ) : null}

        <h1 className="menu-display mt-4 text-[1.75rem] font-semibold leading-tight">
          {name}
        </h1>
        {description ? (
          <p className="menu-muted mt-2 text-[0.9375rem] leading-relaxed">
            {description}
          </p>
        ) : null}

        {links.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {links.map((link) => (
              <a
                key={link.rotulo}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                // min-h-11 são os 44px de alvo de toque — a regra que
                // sobreviveu inteira da direção visual da Fase 1.
                className="menu-block menu-line flex min-h-11 items-center border px-4 text-sm font-medium"
              >
                {link.rotulo}
              </a>
            ))}
          </div>
        ) : null}

        {contact.address ? (
          <p className="menu-muted mt-3 text-[0.8125rem]">{contact.address}</p>
        ) : null}
      </div>
    </header>
  )
}
