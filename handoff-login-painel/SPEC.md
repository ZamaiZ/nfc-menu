# Spec — Login do painel do restaurante (`/painel/entrar`) no modelo Tavvi

Referência visual: `Login Painel do Restaurante.dc.html` (abra no navegador). Artboards `1b` (desktop 1440×900) e `1c` (celular 390×844). `1a` é o admin atual, só referência.

## Objetivo

Trocar o `AuthShell` + `SignInForm` genéricos de `/painel/entrar` pela mesma composição do login admin (`TavviAuthShell` + `TavviSignInForm`), com identidade de painel do restaurante e hero mais enxuto.

## Restrições

- Não alterar `signInAction`, `safeNextPath`, `proxy.ts`, mapeamento de territórios nem predicados de autorização.
- Não alterar o visual de `/admin/entrar` (a saída do admin deve ficar idêntica).
- Não mexer em `AuthShell`/`SignInForm` antigos além de deixar de usá-los nesta rota (outras rotas podem depender deles, ex. convite).
- Cores só via tokens `--tv-*`; nada hardcoded nos componentes.
- Não rodar git, build, lint, typecheck ou testes (regras do projeto).

## 1. Tokens e fonte fora do `.territorio-admin`

Hoje os tokens `--tv-*`, Plus Jakarta e o autofill estão presos em `.territorio-admin`, e o painel (`.territorio-painel`) usa Inter.

Em `src/app/globals.css`, criar um escopo `.tv-auth-scope` que recebe exatamente os mesmos tokens:

- `.territorio-admin { … }` → `.territorio-admin, .tv-auth-scope { … }`
- `.dark .territorio-admin { … }` → `.dark .territorio-admin, .dark .tv-auth-scope { … }`
- Regras `.territorio-admin .tv-login-input:-webkit-autofill…` → duplicar o seletor para `.tv-auth-scope .tv-login-input…`
- Adicionar em `@layer base`:
  ```css
  .tv-auth-scope {
    --font-sans: var(--font-tavvi), ui-sans-serif, system-ui, sans-serif;
    --heading-face: var(--font-tavvi), ui-sans-serif, system-ui, sans-serif;
    --display-face: var(--font-tavvi), ui-sans-serif, system-ui, sans-serif;
    font-family: var(--font-tavvi), ui-sans-serif, system-ui, sans-serif;
  }
  ```

Em `TavviAuthShell`, adicionar `tv-auth-scope` ao `className` do `<main>`. No admin é redundante e inofensivo; no painel ativa tokens + Jakarta só na tela de entrada (o resto do painel continua em Inter).

## 2. `TavviAuthShell` com variante

Adicionar prop `variant?: 'admin' | 'painel'` (default `'admin'`) e repassar para `AuthHeroCopy` e `NotchedSurface`.

| Elemento | admin (atual) | painel |
|---|---|---|
| Brandmark gigante (`NotchedSurface`, desktop e mobile) | sim | **não** (manter só gradiente + glow) |
| `BrandFooter` dentro do hero desktop | sim | **não** |
| Chips de áreas no hero desktop | não | **sim** |
| `BrandFooter` no rodapé mobile | sim | sim |
| Notch + toggle de tema | sim | sim (igual) |

`NotchedSurface`: nova prop `mark?: boolean` (default `true`); quando `false`, não renderiza o `<Image>`.

`AuthHeroCopy` (desktop), no lugar do `<BrandFooter />` quando `variant === 'painel'`:

```tsx
<ul className="mt-3 flex flex-wrap gap-2" aria-label="Áreas do painel">
  {['Cardápio', 'Identidade', 'Equipe', 'Contato'].map((area) => (
    <li key={area} className="flex min-h-[30px] items-center rounded-tv-chip bg-[var(--tv-on-dark-chip)] px-3 text-xs leading-4 font-semibold text-tv-muted-on-dark">
      {area}
    </li>
  ))}
</ul>
```

As áreas correspondem às rotas de `painel/restaurantes/[id]/` (cardápio, identidade, equipe, contato). No mobile os chips não aparecem (o hero de 264px não tem espaço).

## 3. `TavviSignInForm` parametrizado

Tornar os textos fixos do admin em props, com defaults iguais aos atuais para o admin não mudar:

- `hint` — default `'Credenciais de administrador'`
- `emailPlaceholder` — default `'voce@tavvi.com'`
- `ctaLabel` — default `'Entrar no console'`
- `footer?: React.ReactNode` — renderizado após o botão, dentro do `<form>`

O alerta de `denied` continua só no admin (o painel não passa `denied`).

Rodapé do painel:

```tsx
<p className="px-1 text-center text-xs leading-4 font-medium text-tv-subtle text-pretty">
  Recebeu um convite? Abra o link enviado ao seu e-mail.
</p>
```

## 4. Rota `src/app/painel/entrar/page.tsx`

```tsx
import { TavviAuthShell } from '@/components/auth/tavvi/tavvi-auth-shell'
import { TavviSignInForm } from '@/components/auth/tavvi/tavvi-sign-in-form'
import { safeNextPath } from '@/domain/common'

export const metadata = { title: 'Entrar' }

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams

  return (
    <TavviAuthShell
      variant="painel"
      badge="Painel · Acesso do restaurante"
      title="Painel do restaurante"
      subtitle="Entre para cuidar do seu cardápio."
    >
      <TavviSignInForm
        next={safeNextPath(next, '/')}
        hint="Conta do restaurante"
        emailPlaceholder="voce@seurestaurante.com"
        ctaLabel="Entrar no painel"
        footer={<p className="…">Recebeu um convite? Abra o link enviado ao seu e-mail.</p>}
      />
    </TavviAuthShell>
  )
}
```

O ponto final lime do título já vem de `AuthHeroCopy`. Em ≥1280px o título quebra em "Painel do / restaurante." (`tv-hero-title`, 76px).

## 5. Checagem manual

- `/admin/entrar` idêntico ao anterior (brandmark, rodapé, textos, CTA "Entrar no console").
- `/painel/entrar` em 1440×900 e <1024px, claro e escuro: Jakarta aplicada, tokens corretos, sem brandmark, chips só no desktop, frase de convite abaixo do CTA.
- Estados: vazio (CTA 50%), e-mail inválido, senha vazia, erro do servidor, enviando, Caps Lock, mostrar/ocultar senha.
- Autofill do navegador sem fundo amarelo no painel.
- Tela baixa (<720px de altura) rola sem cortar o formulário.
- `next` malformado continua sanitizado.

## Arquivos a alterar

- `src/app/globals.css`
- `src/components/auth/tavvi/tavvi-auth-shell.tsx`
- `src/components/auth/tavvi/auth-hero-copy.tsx`
- `src/components/auth/tavvi/notched-surface.tsx`
- `src/components/auth/tavvi/tavvi-sign-in-form.tsx`
- `src/app/painel/entrar/page.tsx`

Nenhum asset novo: `public/brand/*` já existe.
