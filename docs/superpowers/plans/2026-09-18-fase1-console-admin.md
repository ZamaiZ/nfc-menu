# Fase 1 — Console do administrador: plano de implementação

> **Para executores agênticos:** SUB-SKILL OBRIGATÓRIA: use `superpowers:subagent-driven-development` ou `superpowers:executing-plans` para executar este plano tarefa a tarefa. Os passos usam caixas de seleção (`- [ ]`) para acompanhamento.

**Objetivo:** Fechar o primeiro ciclo completo do produto — criar um restaurante no console do administrador, emitir um link de convite, e alguém entrar por esse link.

**Arquitetura:** Toda a lógica de dados e autorização já existe e está verificada na Fase 0. Esta fase adiciona interface sobre ela, sem abrir exceção nas fronteiras: componente de cliente nunca importa `@/server`, toda página reverifica autorização, toda mutação passa por server action que delega à DAL.

**Stack:** Next.js 16.3.5 (App Router, territórios por subdomínio), React 19.2.8, shadcn sobre Base UI, Tailwind 4, Zod 4, `motion` para animação.

**Spec:** [`docs/superpowers/specs/2026-09-18-fase1-console-admin-design.md`](../specs/2026-09-18-fase1-console-admin-design.md)

## Restrições globais

Valem para **todas** as tarefas.

- **Nada de git.** Não rodar `add`, `commit`, `push` ou qualquer outro comando de git. O cliente opera o versionamento sozinho. Cada tarefa termina listando os arquivos alterados, e só.
- **Sem testes automatizados.** Não criar framework nem arquivo de teste. Cada tarefa termina com um comando de verificação cujo resultado é conferido e reportado.
- **Verificação de código é `pnpm exec tsc --noEmit`.** Lint não é portão, por decisão do cliente.
- **Componente de cliente nunca importa `@/server`.** Dado chega por props; mutação sai por server action.
- **Toda página do console chama `requirePlatformAdmin()`.** O proxy redireciona quem não tem cookie, mas checagem otimista não é autorização.
- **Toda server action reverifica através da DAL.** Ela é endpoint POST público por construção.
- **Rotas são externas.** Dentro de `admin.` o caminho é `/restaurantes/x`; o proxy reescreve para `/admin/restaurantes/x`. Nunca escrever o prefixo do território em `href` ou `redirect`.
- **`cn` vem do pacote `cn`**, não de `@/lib/utils` — é o padrão que os componentes shadcn deste projeto já usam.
- **Toast:** `toast.add({ title, description, type })`, com `type` em `success | error | info | warning | loading`. Importar `toast` e `Toaster` de `@/components/ui/toast`.
- **Formulários:** primitivos `Field`, `FieldLabel`, `FieldDescription`, `FieldError`, `FieldGroup` de `@/components/ui/field`. Este projeto não tem o wrapper `Form` antigo do shadcn.
- **Composição usa `render`, nunca `asChild`.** O shadcn deste projeto é construído sobre **Base UI**, não sobre Radix. Onde a documentação do shadcn mostra `<Trigger asChild><Button/></Trigger>`, aqui se escreve `<Trigger render={<Button />}>conteúdo</Trigger>`. `asChild` não existe e vira erro de compilação.
- **Cor nunca é o único portador de significado.** Situação, erro e sucesso sempre trazem texto ou ícone junto.
- **Português do Brasil** em toda a interface e em toda mensagem de erro.

## Direção visual

Copiada da seção 6 da spec. Vale para todas as telas.

| Aspecto | Valor |
|---|---|
| Corpo | 16px, altura de linha 1.6 |
| Títulos | Página 28px, seção 20px, cartão 16px. Peso 600. Sem segunda fonte |
| Linha de tabela | 56px de altura |
| Espaço entre blocos | 32px |
| Raio | `0.45rem` (token `--radius` atual) |
| Largura máxima do conteúdo | 1100px, centralizado |
| Alvo de toque | Mínimo 44px |
| Cor primária | Só em ação primária, anel de foco e item selecionado. Nunca superfície, nunca situação |
| Situação | Rascunho neutro, ativo verde-folha, suspenso âmbar — sempre com texto junto |

## Mapa de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `src/domain/database.types.ts` | Tipos gerados do schema (gerado, não editado à mão) |
| `src/app/layout.tsx` | Idioma, metadados, fonte, script anti-lampejo, `Toaster` |
| `src/app/globals.css` | Ajuste dos tokens para a direção cálida |
| `src/components/theme/theme-script.tsx` | Script embutido que aplica o tema antes da primeira pintura |
| `src/components/theme/theme-provider.tsx` | Contexto do tema e persistência |
| `src/components/theme/theme-toggle.tsx` | Botão de alternância |
| `src/components/shell/top-bar.tsx` | Barra superior dos territórios privados |
| `src/components/shell/sign-out-button.tsx` | Botão de sair |
| `src/server/actions/auth.ts` | `signInAction`, `signOutAction` |
| `src/server/dal/members.ts` | `listMembers`, `removeMember` |
| `src/app/admin/**` | Console: entrar, lista, detalhe |
| `src/app/painel/**` | Entrar, resgatar convite, raiz |

---

## Tarefa 1: Tipos do banco e erro de conflito

Duas mudanças de fundação que tudo o mais depende: tipar o acesso ao banco e fazer o erro previsto chegar legível na tela.

**Arquivos:**
- Criar: `src/domain/database.types.ts` (gerado)
- Modificar: `src/server/dal/_client.ts`, `src/server/dal/auth.ts`, `src/server/dal/restaurants.ts`, `src/server/actions/result.ts`

**Interfaces:**
- Consome: schema já aplicado no banco
- Produz: tipo `Database`; `UserFacingError` e `ConflictError` exportados de `@/server/dal/auth`; `createUserClient` e `createProxyClient` devolvendo `SupabaseClient<Database>`

- [ ] **Passo 1: Gerar os tipos a partir do banco de prova**

```bash
npx supabase gen types typescript --local > src/domain/database.types.ts
```

O banco local tem o mesmo schema do projeto na nuvem — isso foi verificado na Fase 0 — então gerar do local evita depender de credencial de projeto remoto.

Conferir que o arquivo tem conteúdo e cita as tabelas:

```bash
grep -c "menu_items\|restaurants\|invites" src/domain/database.types.ts
```

Esperado: um número maior que zero. Se o arquivo sair vazio, o Supabase local não está no ar — rode `npx supabase start`.

- [ ] **Passo 2: Tipar o cliente em `_client.ts`**

No topo, acrescentar o import:

```ts
import type { Database } from '@/domain/database.types'
```

Trocar as duas assinaturas de retorno, de `SupabaseClient` para `SupabaseClient<Database>`, e passar o genérico nas duas chamadas:

```ts
export async function createUserClient(
  territory: Territory,
): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
```

E o mesmo em `createProxyClient`:

```ts
export function createProxyClient(
  request: NextRequest,
  response: NextResponse,
  territory: Territory,
): SupabaseClient<Database> {
  return createServerClient<Database>(
```

- [ ] **Passo 3: Ajustar `callGuard` para o cliente tipado**

Com o cliente tipado, `supabase.rpc(fn, args)` passa a exigir um nome de função conhecido — e `callGuard` recebia `fn: string`. Em `src/server/dal/auth.ts`, trocar a função por uma versão com o nome restrito:

```ts
type GuardFunction = 'is_platform_admin' | 'is_member' | 'is_owner'

async function callGuard(
  fn: GuardFunction,
  args: Record<string, unknown> = {},
): Promise<boolean> {
  const supabase = await createUserClient(await currentTerritory())
  // O cast existe porque as três funções compartilham a forma
  // (uuid opcional) -> boolean, mas o tipo gerado as trata separadamente.
  const { data, error } = await supabase.rpc(
    fn as 'is_platform_admin',
    args as never,
  )
  return !error && data === true
}
```

- [ ] **Passo 4: Criar a hierarquia de erros previstos em `src/server/dal/auth.ts`**

O `runAction` hoje testa `ForbiddenError` e `RateLimitedError` por nome. Somando `ConflictError` agora e credenciais invalidas na Tarefa 5, essa lista cresceria a cada erro novo — e um erro que alguem esquecesse de acrescentar viraria silenciosamente a mensagem generica. Uma classe base resolve de uma vez.

Substituir a declaracao de `ForbiddenError` por:

```ts
// Erro PREVISTO, com mensagem escrita por nos, segura para chegar na tela.
// Diferente do generico do runAction, que existe para nao vazar nome de
// tabela e constraint do Postgres -- um mapa do schema de graca para quem
// estiver sondando.
//
// Todo erro que deva ser mostrado ao usuario estende esta classe. O
// runAction testa a BASE, nao cada filha, entao acrescentar um erro novo
// nao exige lembrar de atualizar o runAction junto.
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = new.target.name
  }
}

export class ForbiddenError extends UserFacingError {
  constructor(message = 'Sem permissão para esta operação') {
    super(message)
  }
}

export class ConflictError extends UserFacingError {}
```

- [ ] **Passo 5: Detectar endereço duplicado em `restaurants.ts`**

No import de `./auth`, acrescentar `ConflictError`. Em `createRestaurant`, trocar o tratamento de erro:

```ts
  if (error) {
    // 23505 e violacao de unicidade. O unico unique desta tabela e o slug,
    // entao aqui isso significa endereco ja em uso -- condicao prevista,
    // que a pessoa consegue corrigir sozinha.
    if (error.code === '23505') {
      throw new ConflictError('Este endereço já está em uso.')
    }
    throw new Error(`Não foi possível criar o restaurante: ${error.message}`)
  }
```

- [ ] **Passo 6: Fazer `RateLimitedError` estender a base**

Em `src/server/security/rate-limit.ts`, trocar o import e a declaracao:

```ts
import { UserFacingError } from '@/server/dal/auth'
```

```ts
export class RateLimitedError extends UserFacingError {
  constructor() {
    super('Muitas tentativas. Aguarde um minuto e tente de novo.')
  }
}
```

Nao ha ciclo de import: `rate-limit.ts` ja importava `currentTerritory` de `dal/auth`, e `dal/auth` nao importa `rate-limit`.

- [ ] **Passo 7: Simplificar `result.ts` para testar a base**

Trocar o import e a condição:

```ts
import { UserFacingError } from '@/server/dal/auth'
```

Remover o import de `RateLimitedError`, que deixa de ser citado, e trocar as duas condicoes por uma:

```ts
    if (error instanceof UserFacingError) {
      return { ok: false, error: error.message }
    }
```

- [ ] **Passo 8: Verificar**

```bash
pnpm exec tsc --noEmit
```

Esperado: nenhum erro. Se aparecerem erros em `dal/*.ts` sobre propriedades que antes eram `any`, são reais — o cliente tipado acabou de expor nomes de coluna errados. Corrija-os; é exatamente o ganho que a tipagem existe para dar.

- [ ] **Passo 9: Arquivos alterados**

`src/domain/database.types.ts` (novo), `src/server/dal/_client.ts`, `src/server/dal/auth.ts`, `src/server/dal/restaurants.ts`, `src/server/security/rate-limit.ts`, `src/server/actions/result.ts`. **Não commitar.**

---

## Tarefa 2: Tokens visuais e limpeza do layout raiz

**Arquivos:**
- Modificar: `src/app/globals.css`, `src/app/layout.tsx`

**Interfaces:**
- Consome: nada
- Produz: tokens ajustados para a direção cálida; `<html lang="pt-BR">` com metadados do produto

- [ ] **Passo 1: Deslocar os neutros para quente e separar a cor de situação**

Em `src/app/globals.css`, dentro de `:root`, substituir os neutros frios (`0.001 286` e similares) por equivalentes levemente quentes e acrescentar os tokens de situação. Trocar o bloco de `--secondary` até `--input` por:

```css
  --secondary: oklch(0.970 0.004 85);
  --secondary-foreground: oklch(0.215 0.008 75);
  --muted: oklch(0.970 0.004 85);
  --muted-foreground: oklch(0.556 0.012 75);
  --accent: oklch(0.962 0.006 85);
  --accent-foreground: oklch(0.215 0.008 75);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0.005 85);
  --input: oklch(0.922 0.005 85);

  /* Situacao do restaurante. Conjunto a parte, separado da primaria:
     a primaria e um verde-azulado, e "ativo" precisa ser distinguivel
     dela num relance. */
  --status-draft: oklch(0.556 0.012 75);
  --status-draft-bg: oklch(0.962 0.006 85);
  --status-active: oklch(0.520 0.140 145);
  --status-active-bg: oklch(0.950 0.040 145);
  --status-suspended: oklch(0.560 0.130 75);
  --status-suspended-bg: oklch(0.960 0.050 85);
```

- [ ] **Passo 2: Espelhar os tokens de situação no modo escuro**

Dentro do bloco `.dark`, no fim, acrescentar:

```css
  --status-draft: oklch(0.708 0.012 75);
  --status-draft-bg: oklch(0.270 0.008 75);
  --status-active: oklch(0.760 0.130 145);
  --status-active-bg: oklch(0.280 0.045 145);
  --status-suspended: oklch(0.790 0.120 75);
  --status-suspended-bg: oklch(0.290 0.045 75);
```

- [ ] **Passo 3: Expor os tokens ao Tailwind**

Dentro do bloco `@theme inline`, acrescentar:

```css
  --color-status-draft: var(--status-draft);
  --color-status-draft-bg: var(--status-draft-bg);
  --color-status-active: var(--status-active);
  --color-status-active-bg: var(--status-active-bg);
  --color-status-suspended: var(--status-suspended);
  --color-status-suspended-bg: var(--status-suspended-bg);
```

- [ ] **Passo 4: Limpar o layout raiz**

Substituir `src/app/layout.tsx` inteiro:

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { cn } from 'cn'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: {
    default: 'Cardápio digital',
    template: '%s · Cardápio digital',
  },
  description: 'Cardápios de restaurante acessíveis por NFC e QR code.',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={cn('h-full antialiased font-sans', inter.variable)}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  )
}
```

`suppressHydrationWarning` no `<html>` é necessário porque a Tarefa 3 vai acrescentar uma classe ali antes da hidratação — sem ele o React reclama de divergência. Geist e Figtree saem: a spec decidiu tipografia única (E10), e Figtree nem estava sendo usada.

- [ ] **Passo 5: Verificar**

```bash
pnpm exec tsc --noEmit && pnpm build 2>&1 | tail -5
```

Esperado: ambos sem erro.

- [ ] **Passo 6: Arquivos alterados**

`src/app/globals.css`, `src/app/layout.tsx`. **Não commitar.**

---

## Tarefa 3: Tema claro e escuro

**Arquivos:**
- Criar: `src/components/theme/theme-script.tsx`, `src/components/theme/theme-provider.tsx`, `src/components/theme/theme-toggle.tsx`
- Modificar: `src/app/layout.tsx`

**Interfaces:**
- Consome: a classe `.dark` que `globals.css` já define
- Produz: `<ThemeScript />`, `<ThemeProvider>`, `useTheme(): { theme, setTheme }` com `theme` em `'light' | 'dark' | 'system'`, e `<ThemeToggle />`

- [ ] **Passo 1: Criar o script anti-lampejo**

`src/components/theme/theme-script.tsx`:

```tsx
// Este script roda ANTES da primeira pintura. E ele que evita o lampejo
// branco quando a preferencia e escura: sem isso, a pagina pinta clara e
// so depois o React corrige, o que aparece como um flash.
//
// Precisa ser sincrono e embutido. Um componente React normal nao serve,
// porque so executaria depois da hidratacao -- tarde demais.
const script = `(function(){try{var t=localStorage.getItem("tema");var d=t==="dark"||((!t||t==="system")&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})()`

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />
}
```

O `try/catch` não é decorativo: em janela privada o acesso ao `localStorage` **lança**, e sem ele a página inteira quebraria antes de pintar qualquer coisa.

Este é o único `dangerouslySetInnerHTML` permitido no projeto, e ele é seguro porque o conteúdo é uma constante escrita por nós, sem nenhuma entrada de usuário.

- [ ] **Passo 2: Criar o provedor**

`src/components/theme/theme-provider.tsx`:

```tsx
'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'tema'

type ThemeContextValue = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored
    }
  } catch {
    // Janela privada: o acesso lanca. Cair no padrao e o comportamento
    // correto -- a interface continua utilizavel, so nao lembra a escolha.
  }
  return 'system'
}

function applyTheme(theme: Theme) {
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', isDark)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Comeca em 'system' no servidor e no primeiro render do cliente, para
  // que o HTML renderizado nos dois lados coincida. A leitura real do
  // localStorage acontece no efeito abaixo.
  const [theme, setThemeState] = useState<Theme>('system')

  useEffect(() => {
    setThemeState(readStoredTheme())
  }, [])

  useEffect(() => {
    applyTheme(theme)

    if (theme !== 'system') return

    // Seguindo o sistema, precisamos reagir quando ele muda -- alguem
    // alternando o modo escuro do celular ao anoitecer, por exemplo.
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [theme])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Sem persistencia em janela privada. A escolha vale para a sessao.
    }
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme precisa estar dentro de ThemeProvider')
  }
  return context
}
```

- [ ] **Passo 3: Criar o botão de alternância**

`src/components/theme/theme-toggle.tsx`:

```tsx
'use client'

import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme, type Theme } from './theme-provider'

const OPTIONS: { value: Theme; label: string; Icon: typeof SunIcon }[] = [
  { value: 'light', label: 'Claro', Icon: SunIcon },
  { value: 'dark', label: 'Escuro', Icon: MoonIcon },
  { value: 'system', label: 'Sistema', Icon: MonitorIcon },
]

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const current = OPTIONS.find((option) => option.value === theme) ?? OPTIONS[2]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Tema: ${current.label}`}
          />
        }
      >
        <current.Icon className="size-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {OPTIONS.map(({ value, label, Icon }) => (
          <DropdownMenuItem key={value} onClick={() => setTheme(value)}>
            <Icon className="size-4" />
            {label}
            {theme === value ? <span className="ml-auto text-xs">atual</span> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

O rótulo do botão diz qual tema está ativo, e o item do menu mostra "atual" em texto. Nenhum dos dois depende só de cor ou de ícone para se explicar.

- [ ] **Passo 4: Ligar no layout raiz**

Em `src/app/layout.tsx`, importar e montar:

```tsx
import { ThemeProvider } from '@/components/theme/theme-provider'
import { ThemeScript } from '@/components/theme/theme-script'
import { Toaster } from '@/components/ui/toast'
```

E no corpo do componente:

```tsx
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
```

- [ ] **Passo 5: Verificar que não há lampejo**

```bash
pnpm exec tsc --noEmit
```

Depois, com `pnpm dev` rodando, confirmar que o script chega no HTML **antes** do conteúdo:

```bash
curl -s -H "Host: localhost:3000" http://127.0.0.1:3000/ | grep -o "prefers-color-scheme: dark" | head -1
```

Esperado: uma ocorrência. Se vier vazio, o script não está sendo embutido e o lampejo vai acontecer.

No navegador: alternar para escuro, recarregar e confirmar que a página **nasce** escura, sem piscar branco. Este é o ponto da tarefa inteira e só se verifica olhando.

- [ ] **Passo 6: Arquivos alterados**

`src/components/theme/theme-script.tsx`, `theme-provider.tsx`, `theme-toggle.tsx` (novos), `src/app/layout.tsx`. **Não commitar.**

---

## Tarefa 4: Casca dos territórios privados

**Arquivos:**
- Criar: `src/components/shell/top-bar.tsx`, `src/components/shell/sign-out-button.tsx`
- Criar: `src/app/admin/error.tsx`, `src/app/admin/not-found.tsx`, `src/app/painel/error.tsx`
- Modificar: `eslint.config.mjs`

**Interfaces:**
- Consome: `ThemeToggle` da Tarefa 3; `signOutAction` da Tarefa 5
- Produz: `<TopBar title email />` e `<SignOutButton />`

- [ ] **Passo 1: Ajustar a regra de import**

A regra atual proíbe `@/server/*` em `src/components/**`. Isso está certo para `dal` e `security`, mas errado para `actions`: uma server action **existe** para ser importada por componente de cliente — a diretiva `use server` faz o import virar uma referência, não código de servidor no pacote do navegador.

Em `eslint.config.mjs`, trocar o segundo bloco por:

```js
  // Componente cliente e hook nunca alcancam a DAL nem as primitivas de
  // seguranca. As server actions sao a excecao deliberada: e exatamente
  // para isso que elas existem, e a diretiva use server garante que o
  // corpo nunca vai para o pacote do navegador.
  {
    files: ["src/components/**/*.{ts,tsx}", "src/hooks/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: [
            "@/server/dal", "@/server/dal/*",
            "@/server/security", "@/server/security/*",
          ],
          message:
            "Componentes e hooks nao importam a DAL nem security. Receba dados por props ou chame uma server action de @/server/actions.",
        }],
      }],
    },
  },
```

- [ ] **Passo 2: Criar o botão de sair**

`src/components/shell/sign-out-button.tsx`:

```tsx
'use client'

import { useTransition } from 'react'
import { LogOutIcon } from 'lucide-react'
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
      {pending ? <Spinner className="size-4" /> : <LogOutIcon className="size-4" />}
      Sair
    </Button>
  )
}
```

- [ ] **Passo 3: Criar a barra superior**

`src/components/shell/top-bar.tsx`:

```tsx
import Link from 'next/link'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { SignOutButton } from './sign-out-button'

export function TopBar({
  title,
  email,
}: {
  title: string
  email: string | null
}) {
  return (
    <header className="border-b border-border">
      {/* 1100px e a largura maxima da direcao visual; h-16 da os 64px que
          acomodam alvo de toque de 44px com folga. */}
      <div className="mx-auto flex h-16 w-full max-w-[1100px] items-center gap-4 px-4">
        <Link href="/" className="text-base font-semibold">
          {title}
        </Link>
        <div className="ml-auto flex items-center gap-2">
          {email ? (
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {email}
            </span>
          ) : null}
          <ThemeToggle />
          <SignOutButton />
        </div>
      </div>
    </header>
  )
}
```

O `href="/"` é caminho externo: dentro de `admin.` ele leva à lista de restaurantes, porque o proxy reescreve. Escrever `/admin` aqui produziria `/admin/admin`.

- [ ] **Passo 4: Criar as telas de falha**

`src/app/admin/error.tsx`:

```tsx
'use client'

import { Button } from '@/components/ui/button'

export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-[1100px] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-[28px] font-semibold">Algo deu errado</h1>
      <p className="text-muted-foreground">
        Não foi possível carregar esta página. Tente de novo em instantes.
      </p>
      <Button onClick={reset}>Tentar de novo</Button>
    </main>
  )
}
```

A mensagem é neutra de propósito: o objeto de erro recebido pode carregar detalhe interno, e nada dele vai para a tela.

`src/app/painel/error.tsx`: o mesmo conteúdo, com o nome do componente trocado para `PainelError`.

`src/app/admin/not-found.tsx`:

```tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function AdminNotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-[1100px] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-[28px] font-semibold">Restaurante não encontrado</h1>
      <p className="text-muted-foreground">
        Ele pode ter sido removido, ou o endereço está incorreto.
      </p>
      <Button render={<Link href="/" />}>Voltar para a lista</Button>
    </main>
  )
}
```

- [ ] **Passo 5: Verificar**

```bash
pnpm exec tsc --noEmit
```

Esperado nesta ordem: **um erro** apontando que `signOutAction` não existe — ele nasce na Tarefa 5. É esperado e some no fim da próxima tarefa. Qualquer outro erro é real.

- [ ] **Passo 6: Arquivos alterados**

`src/components/shell/top-bar.tsx`, `sign-out-button.tsx`, `src/app/admin/error.tsx`, `not-found.tsx`, `src/app/painel/error.tsx` (novos), `eslint.config.mjs`. **Não commitar.**

---

## Tarefa 5: Sessão e ações de autenticação

**Arquivos:**
- Criar: `src/server/dal/session.ts`, `src/server/actions/auth.ts`

**Interfaces:**
- Consome: `createUserClient`, `currentTerritory`, `UserFacingError`, `enforceRateLimit`, `rateLimitIdentity`, `safeNextPath`
- Produz: `credentialsSchema`, `signUpSchema`, `InvalidCredentialsError`; `signIn(input)`, `signUp(input)`, `signOut()`; `signInAction(prev, formData)`, `signUpAction(prev, formData)`, `signOutAction()`

- [ ] **Passo 1: Criar a camada de sessão**

`src/server/dal/session.ts`:

```ts
import 'server-only'
import { z } from 'zod'
import { rateLimitIdentity } from '@/server/security/client-ip'
import { enforceRateLimit } from '@/server/security/rate-limit'
import { createUserClient } from './_client'
import { currentTerritory, UserFacingError } from './auth'

export const credentialsSchema = z.object({
  email: z.email({ error: 'Informe um e-mail válido' }),
  password: z.string().min(1, { error: 'Informe a senha' }),
})

export const signUpSchema = z.object({
  email: z.email({ error: 'Informe um e-mail válido' }),
  password: z
    .string()
    .min(8, { error: 'A senha precisa de ao menos 8 caracteres' })
    .max(200, { error: 'Senha longa demais' }),
})

// Mensagem unica para qualquer falha de entrada. Distinguir "e-mail nao
// existe" de "senha errada" entrega metade da credencial para quem esta
// tentando adivinhar -- e o e-mail do administrador e o alvo que interessa.
export class InvalidCredentialsError extends UserFacingError {
  constructor() {
    super('E-mail ou senha incorretos.')
  }
}

export async function signIn(input: unknown): Promise<void> {
  const data = credentialsSchema.parse(input)
  // Rate limit ANTES de falar com o servidor de auth, no balde auth:login
  // que a Fase 0 ja definiu: 10 por minuto por IP.
  await enforceRateLimit('auth:login', await rateLimitIdentity())

  const supabase = await createUserClient(await currentTerritory())
  const { error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  })

  if (error) throw new InvalidCredentialsError()
}

export async function signUp(input: unknown): Promise<void> {
  const data = signUpSchema.parse(input)
  await enforceRateLimit('auth:login', await rateLimitIdentity())

  const supabase = await createUserClient(await currentTerritory())
  const { error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
  })

  // Mensagem unica aqui tambem, pela mesma razao: um cadastro que responde
  // "e-mail ja cadastrado" vira um verificador de quem tem conta.
  if (error) {
    throw new UserFacingError('Não foi possível criar a conta com esses dados.')
  }
}

export async function signOut(): Promise<void> {
  const supabase = await createUserClient(await currentTerritory())
  await supabase.auth.signOut()
}
```

- [ ] **Passo 2: Criar as ações**

`src/server/actions/auth.ts`:

```ts
'use server'

import { redirect } from 'next/navigation'
import { safeNextPath } from '@/domain/common'
import * as dal from '@/server/dal/session'
import { runAction, type ActionResult } from './result'

export async function signInAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const result = await runAction(async () => {
    await dal.signIn({
      email: formData.get('email'),
      password: formData.get('password'),
    })
  })

  if (!result.ok) return result

  // O redirect fica FORA do runAction de proposito. Ele funciona lancando,
  // e o runAction reconhece esse lancamento e o repassa -- mas manter aqui
  // deixa explicito que o desvio e sucesso, nao erro.
  redirect(safeNextPath(formData.get('next'), '/'))
}

export async function signUpAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    await dal.signUp({
      email: formData.get('email'),
      password: formData.get('password'),
    })
  })
}

export async function signOutAction(): Promise<never> {
  await dal.signOut()
  redirect('/entrar')
}
```

`signUpAction` **não** redireciona: quem se cadastra está no meio do resgate de convite e precisa continuar na mesma página, agora autenticado, para clicar em aceitar.

- [ ] **Passo 3: Verificar**

```bash
pnpm exec tsc --noEmit
```

Esperado: nenhum erro. O erro da Tarefa 4 sobre `signOutAction` inexistente precisa ter desaparecido — se continuar, o caminho do import está errado.

- [ ] **Passo 4: Arquivos alterados**

`src/server/dal/session.ts`, `src/server/actions/auth.ts` (novos). **Não commitar.**

---

## Tarefa 6: Telas de entrar

Uma tela só, usada pelos dois territórios. O que muda entre eles é o título.

**Arquivos:**
- Criar: `src/components/auth/sign-in-form.tsx`, `src/components/auth/auth-shell.tsx`
- Modificar: `src/app/admin/entrar/page.tsx`, `src/app/painel/entrar/page.tsx`

**Interfaces:**
- Consome: `signInAction` da Tarefa 5, `safeNextPath` de `@/domain/common`
- Produz: `<AuthShell title subtitle>`, `<SignInForm next />`

- [ ] **Passo 1: Criar a moldura das telas de autenticação**

`src/components/auth/auth-shell.tsx`:

```tsx
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children?: React.ReactNode
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-[28px] font-semibold leading-tight">{title}</h1>
          {subtitle ? (
            <p className="text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {children}
      </div>
    </main>
  )
}
```

- [ ] **Passo 2: Criar o formulário**

`src/components/auth/sign-in-form.tsx`:

```tsx
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
          aparece. Sem isso, quem navega por teclado submete o formulario e
          nao recebe retorno nenhum. */}
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
```

- [ ] **Passo 3: Ligar na tela do administrador**

Substituir `src/app/admin/entrar/page.tsx`:

```tsx
import { AuthShell } from '@/components/auth/auth-shell'
import { SignInForm } from '@/components/auth/sign-in-form'
import { safeNextPath } from '@/domain/common'

export const metadata = { title: 'Entrar' }

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams

  return (
    <AuthShell
      title="Console da plataforma"
      subtitle="Entre para gerenciar os restaurantes."
    >
      {/* Sanitizado aqui E de novo dentro da action. O campo oculto e
          controlado pelo navegador, entao o valor volta pelo formulario
          e nao pode ser confiado so porque saiu daqui limpo. */}
      <SignInForm next={safeNextPath(next, '/')} />
    </AuthShell>
  )
}
```

- [ ] **Passo 4: Ligar na tela do painel**

Substituir `src/app/painel/entrar/page.tsx` pelo mesmo conteúdo, trocando o título para `"Painel do restaurante"` e o subtítulo para `"Entre para cuidar do seu cardápio."`.

- [ ] **Passo 5: Verificar**

```bash
pnpm exec tsc --noEmit
```

Com `pnpm dev` rodando, conferir que as duas telas respondem:

```bash
curl -s -H "Host: admin.localhost:3000" http://127.0.0.1:3000/entrar | grep -o "Console da plataforma"
curl -s -H "Host: painel.localhost:3000" http://127.0.0.1:3000/entrar | grep -o "Painel do restaurante"
```

Esperado: uma ocorrência em cada.

E, no navegador, entrar de verdade em `admin.localhost:3000/entrar` com a conta que você promoveu a administrador. Deve cair na raiz do território. Senha errada deve devolver **"E-mail ou senha incorretos."** — e e-mail inexistente deve devolver exatamente a mesma frase. Se as duas mensagens diferirem, o requisito E7 quebrou.

- [ ] **Passo 6: Arquivos alterados**

`src/components/auth/auth-shell.tsx`, `sign-in-form.tsx` (novos), `src/app/admin/entrar/page.tsx`, `src/app/painel/entrar/page.tsx`. **Não commitar.**

---

## Tarefa 7: Lista de restaurantes e criação

**Arquivos:**
- Criar: `src/components/admin/status-badge.tsx`, `src/components/admin/create-restaurant-dialog.tsx`
- Modificar: `src/app/admin/layout.tsx`, `src/app/admin/page.tsx`
- Criar: `src/app/admin/loading.tsx`

**Interfaces:**
- Consome: `listRestaurantsForAdmin()`, `getCurrentUser()`, `requirePlatformAdmin()`, `createRestaurantAction`
- Produz: `<StatusBadge status />`, `<CreateRestaurantDialog />`

- [ ] **Passo 1: Criar o selo de situação**

`src/components/admin/status-badge.tsx`:

```tsx
import { cn } from 'cn'
import type { RestaurantStatus } from '@/domain/restaurant'

const STYLES: Record<RestaurantStatus, { label: string; className: string }> = {
  draft: {
    label: 'Rascunho',
    className: 'bg-status-draft-bg text-status-draft',
  },
  active: {
    label: 'Ativo',
    className: 'bg-status-active-bg text-status-active',
  },
  suspended: {
    label: 'Suspenso',
    className: 'bg-status-suspended-bg text-status-suspended',
  },
}

export function StatusBadge({ status }: { status: RestaurantStatus }) {
  const { label, className } = STYLES[status]

  // A cor nunca carrega o significado sozinha: o texto sempre vai junto.
  // Quem nao distingue as cores le a palavra, e a interface continua
  // legivel numa captura de tela em preto e branco.
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[--radius] px-2.5 py-1 text-sm font-medium',
        className,
      )}
    >
      {label}
    </span>
  )
}
```

- [ ] **Passo 2: Criar o diálogo de cadastro**

`src/components/admin/create-restaurant-dialog.tsx`:

```tsx
'use client'

import { useActionState, useEffect, useState } from 'react'
import { PlusIcon } from 'lucide-react'
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
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import { createRestaurantAction } from '@/server/actions/restaurants'
import type { ActionResult } from '@/server/actions/result'

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
      <DialogTrigger render={<Button />}>
        <PlusIcon className="size-4" />
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
              <Input id="name" name="name" placeholder="Cantina da Esquina" required />
            </Field>

            <Field>
              <FieldLabel htmlFor="description">Descrição</FieldLabel>
              <Textarea id="description" name="description" rows={3} />
              <FieldDescription>Opcional.</FieldDescription>
            </Field>
          </FieldGroup>

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
```

O erro de endereço duplicado chega aqui como `state.error` com a frase "Este endereço já está em uso." — é o `ConflictError` da Tarefa 1 atravessando a pilha inteira e chegando legível.

- [ ] **Passo 3: Montar o layout do console**

Substituir `src/app/admin/layout.tsx`:

```tsx
import { TopBar } from '@/components/shell/top-bar'
import { getCurrentUser } from '@/server/dal/auth'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Sem requirePlatformAdmin aqui: o layout tambem envolve a tela de
  // entrar, que precisa ser alcancavel sem sessao. Cada pagina privada
  // faz a propria checagem.
  const user = await getCurrentUser()

  return (
    <div className="flex min-h-dvh flex-col">
      {user ? <TopBar title="Console da plataforma" email={user.email} /> : null}
      {children}
    </div>
  )
}
```

- [ ] **Passo 4: Montar a lista**

Substituir `src/app/admin/page.tsx`:

```tsx
import Link from 'next/link'
import { StoreIcon } from 'lucide-react'
import { CreateRestaurantDialog } from '@/components/admin/create-restaurant-dialog'
import { StatusBadge } from '@/components/admin/status-badge'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { env } from '@/server/env'
import { requirePlatformAdmin } from '@/server/dal/auth'
import { listRestaurantsForAdmin } from '@/server/dal/restaurants'

export const metadata = { title: 'Restaurantes' }

export default async function Page() {
  // O proxy ja redirecionou quem nao tem cookie, mas checagem otimista nao
  // e autorizacao. Quem autoriza e esta linha.
  await requirePlatformAdmin()
  const restaurants = await listRestaurantsForAdmin()

  return (
    <main className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-[28px] font-semibold">Restaurantes</h1>
        <CreateRestaurantDialog rootDomain={env.NEXT_PUBLIC_ROOT_DOMAIN} />
      </div>

      {restaurants.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <StoreIcon />
            </EmptyMedia>
            <EmptyTitle>Nenhum restaurante ainda</EmptyTitle>
            <EmptyDescription>
              Cadastre o primeiro para gerar o convite do dono.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <CreateRestaurantDialog rootDomain={env.NEXT_PUBLIC_ROOT_DOMAIN} />
          </EmptyContent>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Endereço</TableHead>
              <TableHead>Situação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {restaurants.map((restaurant) => (
              <TableRow key={restaurant.id} className="h-14">
                <TableCell>
                  <Link
                    href={`/restaurantes/${restaurant.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {restaurant.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  /{restaurant.slug}
                </TableCell>
                <TableCell>
                  <StatusBadge status={restaurant.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </main>
  )
}
```

O vazio traz o botão de criar dentro dele: dizer "está vazio" sem oferecer o próximo passo obriga a pessoa a procurar o que fazer.

`h-14` são os 56px de altura de linha da direção visual.

- [ ] **Passo 5: Criar o esqueleto de carregamento**

`src/app/admin/loading.tsx`:

```tsx
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-10 w-44" />
      </div>
      <div className="space-y-2">
        {/* Alturas iguais as da tabela real, para a tela nao pular quando
            o conteudo chega. */}
        {[0, 1, 2, 3].map((row) => (
          <Skeleton key={row} className="h-14 w-full" />
        ))}
      </div>
    </main>
  )
}
```

- [ ] **Passo 6: Verificar**

```bash
pnpm exec tsc --noEmit
```

No navegador, autenticado como administrador em `admin.localhost:3000`:

1. A lista aparece vazia, com o botão de criar dentro do estado vazio.
2. Criar um restaurante com endereço `teste-console` funciona e a lista atualiza.
3. Criar **outro** com o mesmo endereço `teste-console` devolve **"Este endereço já está em uso."** no diálogo. Se aparecer "Não foi possível concluir a operação", o `ConflictError` da Tarefa 1 não está atravessando — volte e confira o `runAction`.
4. Criar com endereço `Teste Maiusculo` devolve erro de formato vindo do Zod, sem chegar ao banco.

- [ ] **Passo 7: Arquivos alterados**

`src/components/admin/status-badge.tsx`, `create-restaurant-dialog.tsx`, `src/app/admin/loading.tsx` (novos), `src/app/admin/layout.tsx`, `src/app/admin/page.tsx`. **Não commitar.**

---

## Tarefa 8: Detalhe do restaurante — identidade, endereço e situação

**Arquivos:**
- Modificar: `src/domain/restaurant.ts`, `src/server/dal/restaurants.ts`, `src/server/actions/restaurants.ts`
- Criar: `src/app/admin/restaurantes/[id]/page.tsx`, `src/app/admin/restaurantes/[id]/loading.tsx`
- Criar: `src/components/admin/identity-form.tsx`, `src/components/admin/slug-form.tsx`, `src/components/admin/status-form.tsx`

**Interfaces:**
- Consome: `requirePlatformAdmin()`, `updateRestaurantProfileAction`, `setRestaurantStatusAction`, `softDeleteRestaurantAction`
- Produz: `RestaurantDetailDTO`, `updateSlugSchema`, `getRestaurantForAdmin(id)`, `updateRestaurantSlug(input)`, `updateRestaurantSlugAction(input)`

- [ ] **Passo 1: Acrescentar o DTO e o schema de endereço**

Em `src/domain/restaurant.ts`, no fim:

```ts
export const updateSlugSchema = z.object({
  restaurantId: uuidSchema,
  slug: slugSchema,
})

export type RestaurantDetailDTO = {
  id: string
  slug: string
  name: string
  description: string | null
  status: RestaurantStatus
  contact: Record<string, string>
  createdAt: string
  deletedAt: string | null
}
```

- [ ] **Passo 2: Acrescentar as funções na DAL**

Em `src/server/dal/restaurants.ts`, ajustar o import de `@/domain/restaurant` para incluir `updateSlugSchema` e `type RestaurantDetailDTO`, e acrescentar no fim do arquivo:

```ts
export async function getRestaurantForAdmin(
  restaurantId: unknown,
): Promise<RestaurantDetailDTO | null> {
  const id = uuidSchema.parse(restaurantId)
  await requirePlatformAdmin()

  const supabase = await db()
  const { data, error } = await supabase
    .from('restaurants')
    .select('id, slug, name, description, status, contact, created_at, deleted_at')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null

  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    description: data.description,
    status: data.status,
    contact: (data.contact ?? {}) as Record<string, string>,
    createdAt: data.created_at,
    deletedAt: data.deleted_at,
  }
}

export async function updateRestaurantSlug(input: unknown): Promise<void> {
  const data = updateSlugSchema.parse(input)
  // So a plataforma troca o endereco. O gatilho no banco recusaria de
  // qualquer forma; esta linha da a mensagem decente antes de chegar la.
  await requirePlatformAdmin()

  const supabase = await db()
  const { error } = await supabase
    .from('restaurants')
    .update({ slug: data.slug })
    .eq('id', data.restaurantId)

  if (error) {
    if (error.code === '23505') {
      throw new ConflictError('Este endereço já está em uso.')
    }
    throw new Error(`Não foi possível alterar o endereço: ${error.message}`)
  }

  await recordAudit({
    action: 'restaurant.slug_changed',
    subjectType: 'restaurant',
    subjectId: data.restaurantId,
    restaurantId: data.restaurantId,
    metadata: { slug: data.slug },
  })
}
```

- [ ] **Passo 3: Acrescentar a action**

Em `src/server/actions/restaurants.ts`, no fim:

```ts
export async function updateRestaurantSlugAction(
  input: unknown,
): Promise<ActionResult> {
  return runAction(async () => {
    await dal.updateRestaurantSlug(input)
    revalidatePath('/')
  })
}
```

- [ ] **Passo 4: Criar o formulário de identidade**

`src/components/admin/identity-form.tsx`:

```tsx
'use client'

import { useActionState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import type { ActionResult } from '@/server/actions/result'
import { updateRestaurantProfileAction } from '@/server/actions/restaurants'

type State = ActionResult | undefined

export function IdentityForm({
  restaurantId,
  name,
  description,
  contact,
}: {
  restaurantId: string
  name: string
  description: string | null
  contact: Record<string, string>
}) {
  const [state, formAction, pending] = useActionState<State, FormData>(
    async (_prev, formData) =>
      updateRestaurantProfileAction({
        restaurantId,
        name: formData.get('name'),
        description: formData.get('description') || undefined,
        contact: {
          phone: formData.get('phone') || undefined,
          whatsapp: formData.get('whatsapp') || undefined,
          instagram: formData.get('instagram') || undefined,
          address: formData.get('address') || undefined,
        },
      }),
    undefined,
  )

  useEffect(() => {
    if (state?.ok) toast.add({ title: 'Identidade salva', type: 'success' })
  }, [state])

  return (
    <form action={formAction} className="space-y-6">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">Nome</FieldLabel>
          <Input id="name" name="name" defaultValue={name} required />
        </Field>
        <Field>
          <FieldLabel htmlFor="description">Descrição</FieldLabel>
          <Textarea id="description" name="description" rows={3} defaultValue={description ?? ''} />
        </Field>
        <Field>
          <FieldLabel htmlFor="phone">Telefone</FieldLabel>
          <Input id="phone" name="phone" defaultValue={contact.phone ?? ''} />
        </Field>
        <Field>
          <FieldLabel htmlFor="whatsapp">WhatsApp</FieldLabel>
          <Input id="whatsapp" name="whatsapp" defaultValue={contact.whatsapp ?? ''} />
        </Field>
        <Field>
          <FieldLabel htmlFor="instagram">Instagram</FieldLabel>
          <Input id="instagram" name="instagram" defaultValue={contact.instagram ?? ''} />
        </Field>
        <Field>
          <FieldLabel htmlFor="address">Endereço físico</FieldLabel>
          <Input id="address" name="address" defaultValue={contact.address ?? ''} />
        </Field>
      </FieldGroup>

      {state && !state.ok ? (
        <p role="alert" className="text-sm text-destructive">{state.error}</p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? <Spinner className="size-4" /> : null}
        Salvar identidade
      </Button>
    </form>
  )
}
```

- [ ] **Passo 5: Criar o formulário de endereço público**

`src/components/admin/slug-form.tsx`:

```tsx
'use client'

import { useActionState, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import type { ActionResult } from '@/server/actions/result'
import { updateRestaurantSlugAction } from '@/server/actions/restaurants'

type State = ActionResult | undefined

export function SlugForm({
  restaurantId,
  slug,
  rootDomain,
}: {
  restaurantId: string
  slug: string
  rootDomain: string
}) {
  const [value, setValue] = useState(slug)
  const [state, formAction, pending] = useActionState<State, FormData>(
    async (_prev, formData) =>
      updateRestaurantSlugAction({
        restaurantId,
        slug: formData.get('slug'),
      }),
    undefined,
  )

  useEffect(() => {
    if (state?.ok) toast.add({ title: 'Endereço atualizado', type: 'success' })
  }, [state])

  return (
    <form action={formAction} className="space-y-6">
      <Field>
        <FieldLabel htmlFor="slug">Endereço público</FieldLabel>
        <Input
          id="slug"
          name="slug"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          required
        />
        <FieldDescription>
          O cardápio fica em {rootDomain}/{value}. As plaquinhas continuam
          funcionando depois da troca, porque elas apontam para um código
          próprio e não para o endereço. Links compartilhados diretamente é
          que deixam de funcionar.
        </FieldDescription>
      </Field>

      {state && !state.ok ? (
        <p role="alert" className="text-sm text-destructive">{state.error}</p>
      ) : null}

      <Button type="submit" variant="outline" disabled={pending || value === slug}>
        {pending ? <Spinner className="size-4" /> : null}
        Alterar endereço
      </Button>
    </form>
  )
}
```

A explicação sobre plaquinhas não é enfeite: sem ela, a pessoa razoavelmente teme trocar o endereço e reimprimir tudo. Ela existe porque a decisão D1 da Fase 0 tornou isso seguro, e a interface precisa contar.

- [ ] **Passo 6: Criar o controle de situação**

`src/components/admin/status-form.tsx`:

```tsx
'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { toast } from '@/components/ui/toast'
import type { RestaurantStatus } from '@/domain/restaurant'
import {
  setRestaurantStatusAction,
  softDeleteRestaurantAction,
} from '@/server/actions/restaurants'

export function StatusForm({
  restaurantId,
  status,
}: {
  restaurantId: string
  status: RestaurantStatus
}) {
  const [pending, startTransition] = useTransition()

  function changeStatus(next: RestaurantStatus) {
    startTransition(async () => {
      const result = await setRestaurantStatusAction({ restaurantId, status: next })
      toast.add(
        result.ok
          ? { title: 'Situação atualizada', type: 'success' }
          : { title: result.error, type: 'error' },
      )
    })
  }

  function remove() {
    startTransition(async () => {
      const result = await softDeleteRestaurantAction(restaurantId)
      toast.add(
        result.ok
          ? { title: 'Restaurante removido', type: 'success' }
          : { title: result.error, type: 'error' },
      )
    })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="status" className="text-sm font-medium">
          Situação
        </label>
        <NativeSelect
          id="status"
          value={status}
          disabled={pending}
          onChange={(event) => changeStatus(event.target.value as RestaurantStatus)}
        >
          <NativeSelectOption value="draft">
            Rascunho — invisível para o público
          </NativeSelectOption>
          <NativeSelectOption value="active">
            Ativo — cardápio no ar
          </NativeSelectOption>
          <NativeSelectOption value="suspended">
            Suspenso — cardápio fora do ar
          </NativeSelectOption>
        </NativeSelect>
      </div>

      <AlertDialog>
        <AlertDialogTrigger
          render={<Button variant="destructive" disabled={pending} />}
        >
          Remover restaurante
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover este restaurante?</AlertDialogTitle>
            <AlertDialogDescription>
              O cardápio sai do ar imediatamente e o restaurante deixa de
              aparecer na lista. Os dados continuam no banco, então isso pode
              ser desfeito — mas não pela interface.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
```

A descrição diz a verdade sobre o que acontece: é remoção lógica (`deleted_at`), reversível por SQL, não por botão. Prometer "não pode ser desfeito" seria mentira, e prometer um botão de desfazer que não existe seria pior.

- [ ] **Passo 7: Montar a página de detalhe**

`src/app/admin/restaurantes/[id]/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { IdentityForm } from '@/components/admin/identity-form'
import { SlugForm } from '@/components/admin/slug-form'
import { StatusBadge } from '@/components/admin/status-badge'
import { StatusForm } from '@/components/admin/status-form'
import { uuidSchema } from '@/domain/common'
import { requirePlatformAdmin } from '@/server/dal/auth'
import { getRestaurantForAdmin } from '@/server/dal/restaurants'
import { env } from '@/server/env'

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requirePlatformAdmin()

  const { id } = await params
  // O id vem da URL, que e entrada de usuario. Validar antes de consultar
  // impede que lixo vire erro de banco na cara de quem digitou.
  const parsed = uuidSchema.safeParse(id)
  if (!parsed.success) notFound()

  const restaurant = await getRestaurantForAdmin(parsed.data)
  if (!restaurant || restaurant.deletedAt) notFound()

  return (
    <main className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-8">
      <div className="mb-8 flex items-center gap-4">
        <h1 className="text-[28px] font-semibold">{restaurant.name}</h1>
        <StatusBadge status={restaurant.status} />
      </div>

      <div className="space-y-8">
        <section className="rounded-[--radius] border border-border p-6">
          <h2 className="mb-6 text-xl font-semibold">Identidade</h2>
          <IdentityForm
            restaurantId={restaurant.id}
            name={restaurant.name}
            description={restaurant.description}
            contact={restaurant.contact}
          />
        </section>

        <section className="rounded-[--radius] border border-border p-6">
          <h2 className="mb-6 text-xl font-semibold">Endereço público</h2>
          <SlugForm
            restaurantId={restaurant.id}
            slug={restaurant.slug}
            rootDomain={env.NEXT_PUBLIC_ROOT_DOMAIN}
          />
        </section>

        <section className="rounded-[--radius] border border-border p-6">
          <h2 className="mb-6 text-xl font-semibold">Situação</h2>
          <StatusForm restaurantId={restaurant.id} status={restaurant.status} />
        </section>
      </div>
    </main>
  )
}
```

O quarto bloco, equipe e convites, entra na Tarefa 9.

- [ ] **Passo 8: Criar o esqueleto de carregamento**

`src/app/admin/restaurantes/[id]/loading.tsx`:

```tsx
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-8">
      <Skeleton className="mb-8 h-9 w-72" />
      <div className="space-y-8">
        {[0, 1, 2].map((block) => (
          <Skeleton key={block} className="h-48 w-full" />
        ))}
      </div>
    </main>
  )
}
```

- [ ] **Passo 9: Verificar**

```bash
pnpm exec tsc --noEmit
```

No navegador, abrindo o restaurante criado na Tarefa 7:

1. Os três blocos aparecem e o selo de situação bate com o valor atual.
2. Salvar a identidade mostra o aviso de sucesso e o valor persiste depois de recarregar.
3. Trocar o endereço para um já usado devolve **"Este endereço já está em uso."**
4. Mudar a situação para "Ativo" e abrir `localhost:3000/{slug}` mostra o cardápio; voltar para "Rascunho" faz a mesma URL dar 404.
5. Um id inválido na URL, como `/restaurantes/abc`, cai no 404 sem erro no console do servidor.

O item 4 é o que prova que o console conversa de verdade com o cardápio público.

- [ ] **Passo 10: Arquivos alterados**

`src/components/admin/identity-form.tsx`, `slug-form.tsx`, `status-form.tsx`, `src/app/admin/restaurantes/[id]/page.tsx`, `loading.tsx` (novos), `src/domain/restaurant.ts`, `src/server/dal/restaurants.ts`, `src/server/actions/restaurants.ts`. **Não commitar.**

---

## Tarefa 9: Equipe e convites

Esta tarefa acrescenta uma migration. É a única da Fase 1 que mexe no banco, e o motivo está no Passo 1.

**Arquivos:**
- Criar: `supabase/migrations/0009_members.sql`
- Criar: `src/server/dal/members.ts`, `src/server/actions/members.ts`
- Criar: `src/components/admin/invite-dialog.tsx`, `src/components/admin/team-section.tsx`
- Modificar: `src/domain/invite.ts`, `src/app/admin/restaurantes/[id]/page.tsx`

**Interfaces:**
- Consome: `requireOwner`, `requirePlatformAdmin`, `createInviteAction`, `revokeInviteAction`, `listInvites`
- Produz: `MemberDTO`; `listMembers(restaurantId)`, `removeMember(membershipId)`; `removeMemberAction`; `<TeamSection>`, `<InviteDialog>`

- [ ] **Passo 1: Escrever a migration**

A lista de equipe precisa mostrar **quem** é cada membro. O nome está em `profiles`, mas o e-mail vive em `auth.users`, que o PostgREST não expõe — e é o e-mail que identifica a pessoa de verdade, porque `display_name` pode estar vazio.

Havia dois caminhos: copiar o e-mail para `profiles` e mantê-lo sincronizado, ou ler de `auth.users` por uma função privilegiada. O segundo evita guardar o mesmo dado em dois lugares, que é como dado desatualizado nasce.

Criar `supabase/migrations/0009_members.sql`:

```sql
-- =====================================================================
-- 0009 — Listagem de membros com e-mail
--
-- Rode DEPOIS do 0008. Idempotente.
--
-- O e-mail vive em auth.users, que o PostgREST nao expoe. Esta funcao le
-- de la com privilegio e devolve apenas o necessario. Como SECURITY
-- DEFINER ignora a RLS, a autorizacao e feita EXPLICITAMENTE no WHERE --
-- sem ela, qualquer autenticado listaria a equipe de qualquer restaurante.
-- =====================================================================

drop function if exists public.list_restaurant_members(uuid);
create function public.list_restaurant_members(p_restaurant_id uuid)
returns table (
  membership_id uuid,
  user_id uuid,
  email text,
  display_name text,
  member_role public.membership_role,
  joined_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $fn$
  select m.id, m.user_id, u.email::text, p.display_name, m.role, m.created_at
  from public.memberships m
  join public.profiles p on p.id = m.user_id
  join auth.users u on u.id = m.user_id
  where m.restaurant_id = p_restaurant_id
    and (
      public.is_member(p_restaurant_id)
      or public.is_platform_admin()
    )
  order by m.created_at;
$fn$;

grant execute on function public.list_restaurant_members(uuid) to authenticated;
```

- [ ] **Passo 2: Aplicar no banco de prova e conferir a autorização**

```bash
docker exec -i supabase_db_nfc-menu psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q < supabase/migrations/0009_members.sql
docker exec -i supabase_db_nfc-menu psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q < supabase/migrations/0009_members.sql
```

Ambas as execuções devem passar — a segunda prova a idempotência.

Depois, provar que a autorização interna funciona: como usuário autenticado **sem** vínculo, a função tem que devolver zero linhas mesmo com um id de restaurante válido.

```bash
docker exec -i supabase_db_nfc-menu psql -U postgres -d postgres -c "begin; select set_config('request.jwt.claims', json_build_object('sub','99999999-9999-9999-9999-999999999999','role','authenticated')::text, true); select count(*) as deve_ser_zero from public.list_restaurant_members((select id from public.restaurants limit 1)); rollback;"
```

Esperado: `0`. Se vier qualquer número maior, o `WHERE` de autorização não está fazendo efeito e a função vaza a equipe de todo mundo.

- [ ] **Passo 3: Regenerar o arquivo único e os tipos**

```bash
bash supabase/build-schema.sh
npx supabase gen types typescript --local > src/domain/database.types.ts
```

**O `supabase/schema.sql` precisa ser colado de novo no SQL Editor** — é a única vez na Fase 1 em que isso acontece.

- [ ] **Passo 4: Acrescentar o DTO**

Em `src/domain/invite.ts`, no fim:

```ts
export type MemberDTO = {
  membershipId: string
  userId: string
  email: string | null
  displayName: string | null
  role: MembershipRole
  joinedAt: string
}
```

- [ ] **Passo 5: Criar a DAL de membros**

`src/server/dal/members.ts`:

```ts
import 'server-only'
import { uuidSchema } from '@/domain/common'
import type { MemberDTO, MembershipRole } from '@/domain/invite'
import { recordAudit } from '@/server/security/audit'
import { createUserClient } from './_client'
import { currentTerritory, requireOwner, UserFacingError } from './auth'

async function db() {
  return createUserClient(await currentTerritory())
}

export async function listMembers(restaurantId: unknown): Promise<MemberDTO[]> {
  const id = uuidSchema.parse(restaurantId)
  // A funcao no banco ja checa pertencimento, mas checamos aqui tambem:
  // as duas camadas concordam, e uma falha em qualquer uma e contida pela
  // outra.
  await requireOwner(id)

  const supabase = await db()
  const { data, error } = await supabase.rpc('list_restaurant_members', {
    p_restaurant_id: id,
  })

  if (error) {
    throw new Error(`Não foi possível listar a equipe: ${error.message}`)
  }

  return (data ?? []).map((row) => ({
    membershipId: row.membership_id,
    userId: row.user_id,
    email: row.email,
    displayName: row.display_name,
    role: row.member_role as MembershipRole,
    joinedAt: row.joined_at,
  }))
}

export async function removeMember(membershipId: unknown): Promise<void> {
  const id = uuidSchema.parse(membershipId)

  const supabase = await db()
  // Descobrimos o restaurante dono ANTES de autorizar. Confiar num
  // restaurantId vindo do cliente seria exatamente a brecha de IDOR.
  const { data: row, error: lookupError } = await supabase
    .from('memberships')
    .select('restaurant_id, user_id')
    .eq('id', id)
    .single()

  if (lookupError || !row) throw new UserFacingError('Membro não encontrado.')
  await requireOwner(row.restaurant_id)

  const { error } = await supabase.from('memberships').delete().eq('id', id)
  if (error) {
    throw new Error(`Não foi possível remover o membro: ${error.message}`)
  }

  await recordAudit({
    action: 'membership.removed',
    subjectType: 'membership',
    subjectId: id,
    restaurantId: row.restaurant_id,
    metadata: { removedUserId: row.user_id },
  })
}
```

- [ ] **Passo 6: Criar a action**

`src/server/actions/members.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import * as dal from '@/server/dal/members'
import { runAction, type ActionResult } from './result'

export async function removeMemberAction(
  membershipId: unknown,
): Promise<ActionResult> {
  return runAction(async () => {
    await dal.removeMember(membershipId)
    revalidatePath('/')
  })
}
```

- [ ] **Passo 7: Criar o diálogo de convite**

`src/components/admin/invite-dialog.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { CheckIcon, CopyIcon, MailPlusIcon, TriangleAlertIcon } from 'lucide-react'
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
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
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
      // Area de transferencia negada ou indisponivel. O link continua
      // visivel e selecionavel na tela, entao da para copiar na mao.
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
        <MailPlusIcon className="size-4" />
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
                  <FieldLabel htmlFor="email">Amarrar a um e-mail</FieldLabel>
                  <Input id="email" name="email" type="email" />
                  <FieldDescription>
                    Opcional. Preenchido, o link só funciona para quem entrar
                    com esse e-mail.
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="expiresInDays">Validade em dias</FieldLabel>
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
                <p role="alert" className="text-sm text-destructive">{error}</p>
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
              {/* O aviso e texto, nao so cor: quem nao distingue o ambar
                  precisa ler que isto e irrecuperavel. */}
              <p className="flex gap-2 rounded-[--radius] bg-status-suspended-bg p-4 text-sm text-status-suspended">
                <TriangleAlertIcon className="size-5 shrink-0" aria-hidden="true" />
                <span>
                  O sistema guarda apenas uma marca deste link, e não consegue
                  reconstruí-lo. Se você fechar sem copiar, terá que emitir
                  outro convite.
                </span>
              </p>

              <div className="flex gap-2">
                <Input readOnly value={link} onFocus={(e) => e.target.select()} />
                <Button type="button" variant="outline" onClick={copy}>
                  {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
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
```

O diálogo **troca de conteúdo** em vez de fechar, e o botão de sair diz "Já copiei o link". As duas coisas existem pelo mesmo motivo: o banco guarda só o hash, e um fechamento distraído custa um convite.

- [ ] **Passo 8: Criar o bloco de equipe**

`src/components/admin/team-section.tsx`:

```tsx
'use client'

import { useTransition } from 'react'
import { Trash2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from '@/components/ui/toast'
import type { InviteDTO, MemberDTO } from '@/domain/invite'
import { revokeInviteAction } from '@/server/actions/invites'
import type { ActionResult } from '@/server/actions/result'
import { removeMemberAction } from '@/server/actions/members'
import { InviteDialog } from './invite-dialog'

function inviteState(invite: InviteDTO): string {
  if (invite.revokedAt) return 'Revogado'
  if (invite.redeemedAt) return 'Usado'
  if (new Date(invite.expiresAt) < new Date()) return 'Vencido'
  return 'Aguardando'
}

export function TeamSection({
  restaurantId,
  members,
  invites,
}: {
  restaurantId: string
  members: MemberDTO[]
  invites: InviteDTO[]
}) {
  const [pending, startTransition] = useTransition()

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

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="text-base font-semibold">Membros</h3>
        </div>

        {members.length === 0 ? (
          <p className="text-muted-foreground">
            Ninguém tem acesso ainda. Emita um convite abaixo.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pessoa</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.membershipId} className="h-14">
                  <TableCell>
                    <span className="font-medium">
                      {member.displayName ?? member.email ?? 'Sem identificação'}
                    </span>
                    {member.displayName && member.email ? (
                      <span className="block text-sm text-muted-foreground">
                        {member.email}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>{member.role === 'owner' ? 'Dono' : 'Gerente'}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() =>
                        run(
                          () => removeMemberAction(member.membershipId),
                          'Membro removido',
                        )
                      }
                    >
                      <Trash2Icon className="size-4" />
                      Remover
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="text-base font-semibold">Convites</h3>
          <InviteDialog restaurantId={restaurantId} />
        </div>

        {invites.length === 0 ? (
          <p className="text-muted-foreground">Nenhum convite emitido.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Situação</TableHead>
                <TableHead>E-mail amarrado</TableHead>
                <TableHead>Vence em</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {invites.map((invite) => {
                const state = inviteState(invite)
                return (
                  <TableRow key={invite.id} className="h-14">
                    <TableCell>{state}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {invite.email ?? 'Qualquer pessoa com o link'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(invite.expiresAt).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      {state === 'Aguardando' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={pending}
                          onClick={() =>
                            run(() => revokeInviteAction(invite.id), 'Convite revogado')
                          }
                        >
                          Revogar
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
```

A situação do convite é sempre **texto**, nunca só um ponto colorido. E o botão de revogar só aparece em convite que ainda pode ser usado — revogar um já usado não faria nada, e oferecer o botão sugeriria que faria.

- [ ] **Passo 9: Ligar na página de detalhe**

Em `src/app/admin/restaurantes/[id]/page.tsx`, acrescentar os imports:

```tsx
import { TeamSection } from '@/components/admin/team-section'
import { listInvites } from '@/server/dal/invites'
import { listMembers } from '@/server/dal/members'
```

Buscar os dados junto com o restaurante, depois do `notFound()`:

```tsx
  // As duas consultas sao independentes: buscar em paralelo evita somar
  // as latencias.
  const [members, invites] = await Promise.all([
    listMembers(restaurant.id),
    listInvites(restaurant.id),
  ])
```

E acrescentar o quarto bloco, depois do de situação:

```tsx
        <section className="rounded-[--radius] border border-border p-6">
          <h2 className="mb-6 text-xl font-semibold">Equipe e convites</h2>
          <TeamSection
            restaurantId={restaurant.id}
            members={members}
            invites={invites}
          />
        </section>
```

- [ ] **Passo 10: Verificar**

```bash
pnpm exec tsc --noEmit
```

No navegador, no detalhe do restaurante:

1. O bloco de equipe aparece dizendo que ninguém tem acesso.
2. Emitir um convite mostra o link, com o aviso âmbar e o botão "Já copiei o link". **Guarde esse link** — a Tarefa 10 usa ele.
3. O convite aparece na lista como "Aguardando", com botão de revogar.
4. Emitir um segundo convite e revogá-lo muda a situação para "Revogado" e o botão some.
5. Recarregar a página **não** traz o link de volta em lugar nenhum. Se ele reaparecer, algo está guardando o token em claro e isso precisa ser corrigido antes de seguir.

O item 5 é o que prova a decisão E6 de ponta a ponta.

- [ ] **Passo 11: Arquivos alterados**

`supabase/migrations/0009_members.sql`, `src/server/dal/members.ts`, `src/server/actions/members.ts`, `src/components/admin/invite-dialog.tsx`, `team-section.tsx` (novos), `supabase/schema.sql`, `src/domain/database.types.ts`, `src/domain/invite.ts`, `src/app/admin/restaurantes/[id]/page.tsx`. **Não commitar.**

---

## Tarefa 10: Resgate do convite

**Arquivos:**
- Criar: `src/components/auth/sign-up-form.tsx`, `src/components/painel/accept-invite-button.tsx`
- Criar: `src/app/painel/convite/[token]/page.tsx`

**Interfaces:**
- Consome: `previewInvite`, `getCurrentUser`, `signUpAction`, `signInAction`, `redeemInviteAction`
- Produz: `<SignUpForm next />`, `<AcceptInviteButton token />`

- [ ] **Passo 1: Criar o formulário de cadastro**

`src/components/auth/sign-up-form.tsx`:

```tsx
'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { signUpAction } from '@/server/actions/auth'

export function SignUpForm() {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(signUpAction, undefined)

  useEffect(() => {
    // O cadastro nao redireciona: a pessoa precisa continuar NESTA pagina,
    // agora autenticada, para clicar em aceitar. O refresh faz o servidor
    // renderizar de novo e enxergar a sessao recem-criada.
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
        <p role="alert" className="text-sm text-destructive">{state.error}</p>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Spinner className="size-4" /> : null}
        Criar conta
      </Button>
    </form>
  )
}
```

- [ ] **Passo 2: Criar o botão de aceitar**

`src/components/painel/accept-invite-button.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { redeemInviteAction } from '@/server/actions/invites'

export function AcceptInviteButton({ token }: { token: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function accept() {
    setPending(true)
    setError(null)

    const result = await redeemInviteAction(token)

    if (result.ok) {
      toast.add({ title: 'Convite aceito', type: 'success' })
      router.replace('/')
      return
    }

    setPending(false)
    setError(result.error)
  }

  return (
    <div className="space-y-4">
      <Button className="w-full" onClick={accept} disabled={pending}>
        {pending ? <Spinner className="size-4" /> : null}
        Aceitar convite
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-destructive">{error}</p>
      ) : null}
    </div>
  )
}
```

O resgate acontece **no clique**, nunca ao carregar a página. O convite é de uso único: um recarregamento acidental não pode consumi-lo (decisão E5).

- [ ] **Passo 3: Montar a página de resgate**

`src/app/painel/convite/[token]/page.tsx`:

```tsx
import { AuthShell } from '@/components/auth/auth-shell'
import { SignInForm } from '@/components/auth/sign-in-form'
import { SignUpForm } from '@/components/auth/sign-up-form'
import { AcceptInviteButton } from '@/components/painel/accept-invite-button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getCurrentUser } from '@/server/dal/auth'
import { previewInvite } from '@/server/dal/invites'

export const metadata = { title: 'Convite' }

export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  // previewInvite ja aplica rate limit e ja valida o formato. Token
  // desconhecido, vencido, revogado e ja usado devolvem todos null -- sao
  // indistinguiveis daqui, que e o ponto.
  const invite = await previewInvite(token)

  if (!invite) {
    return (
      <AuthShell
        title="Convite indisponível"
        subtitle="Este convite não é mais válido. Peça um novo para quem enviou."
      />
    )
  }

  const user = await getCurrentUser()

  if (user) {
    return (
      <AuthShell
        title={invite.restaurantName}
        subtitle={`Você foi convidado a gerenciar este restaurante, entrando como ${user.email ?? 'sua conta'}.`}
      >
        <AcceptInviteButton token={token} />
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title={invite.restaurantName}
      subtitle="Você foi convidado a gerenciar este restaurante. Entre ou crie sua conta para aceitar."
    >
      <Tabs defaultValue="criar">
        <TabsList className="w-full">
          <TabsTrigger value="criar" className="flex-1">
            Criar conta
          </TabsTrigger>
          <TabsTrigger value="entrar" className="flex-1">
            Já tenho conta
          </TabsTrigger>
        </TabsList>

        <TabsContent value="criar" className="pt-6">
          <SignUpForm />
        </TabsContent>

        <TabsContent value="entrar" className="pt-6">
          {/* O destino e esta mesma pagina: depois de entrar, a pessoa
              precisa voltar aqui para clicar em aceitar. O token vive no
              caminho, entao atravessa a autenticacao sem se perder. */}
          <SignInForm next={`/convite/${token}`} />
        </TabsContent>
      </Tabs>
    </AuthShell>
  )
}
```

Repare no que a página **não** mostra: quem emitiu o convite, o e-mail amarrado, ou a data. Apenas o nome do restaurante e o convite existir.

- [ ] **Passo 4: Verificar**

```bash
pnpm exec tsc --noEmit
```

Com o link guardado na Tarefa 9, numa **janela anônima** para não reaproveitar a sessão de administrador:

1. Abrir o link mostra o nome do restaurante e as duas abas.
2. Um token inventado, como `painel.localhost:3000/convite/aaaa`, mostra "Convite indisponível" — sem dizer o porquê.
3. Criar uma conta pela aba, e a página passar a mostrar o botão "Aceitar convite".
4. Clicar em aceitar leva à raiz do painel.
5. **Abrir o mesmo link de novo mostra "Convite indisponível"** — é o uso único funcionando de ponta a ponta.
6. No console do administrador, o convite aparece como "Usado" e o novo membro aparece na lista de equipe.

Os itens 5 e 6 juntos são a prova de que o ciclo inteiro fecha.

- [ ] **Passo 5: Arquivos alterados**

`src/components/auth/sign-up-form.tsx`, `src/components/painel/accept-invite-button.tsx`, `src/app/painel/convite/[token]/page.tsx` (novos). **Não commitar.**

---

## Tarefa 11: Raiz do painel

**Arquivos:**
- Modificar: `src/app/painel/layout.tsx`, `src/app/painel/page.tsx`
- Criar: `src/app/painel/loading.tsx`

**Interfaces:**
- Consome: `requireUser()`, `listMyRestaurants()`, `getCurrentUser()`, `<TopBar>`
- Produz: nada consumido por outras tarefas

- [ ] **Passo 1: Montar o layout**

Substituir `src/app/painel/layout.tsx`:

```tsx
import { TopBar } from '@/components/shell/top-bar'
import { getCurrentUser } from '@/server/dal/auth'

export default async function PainelLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Sem requireUser aqui: este layout tambem envolve /entrar e
  // /convite/{token}, que precisam ser alcancaveis sem sessao.
  const user = await getCurrentUser()

  return (
    <div className="flex min-h-dvh flex-col">
      {user ? <TopBar title="Painel do restaurante" email={user.email} /> : null}
      {children}
    </div>
  )
}
```

- [ ] **Passo 2: Montar a raiz**

Substituir `src/app/painel/page.tsx`:

```tsx
import { StoreIcon } from 'lucide-react'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Item, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item'
import { requireUser } from '@/server/dal/auth'
import { listMyRestaurants } from '@/server/dal/restaurants'
import { env } from '@/server/env'

export const metadata = { title: 'Seus restaurantes' }

export default async function Page() {
  await requireUser()
  const restaurants = await listMyRestaurants()

  return (
    <main className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-8">
      <h1 className="mb-8 text-[28px] font-semibold">Seus restaurantes</h1>

      {restaurants.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <StoreIcon />
            </EmptyMedia>
            <EmptyTitle>Nenhum restaurante ainda</EmptyTitle>
            <EmptyDescription>
              Peça um convite para quem administra a plataforma.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-4">
          {restaurants.map((restaurant) => (
            <Item key={restaurant.id} variant="outline">
              <ItemContent>
                <ItemTitle>{restaurant.name}</ItemTitle>
                <ItemDescription>
                  {env.NEXT_PUBLIC_ROOT_DOMAIN}/{restaurant.slug}
                </ItemDescription>
              </ItemContent>
            </Item>
          ))}

          <p className="pt-4 text-muted-foreground">
            A edição do cardápio chega na próxima etapa. Por enquanto, seu
            acesso está confirmado.
          </p>
        </div>
      )}
    </main>
  )
}
```

A última frase existe porque, sem ela, quem acabou de aceitar um convite vê uma lista e nenhuma ação, e não sabe se deu certo ou se falta algo.

- [ ] **Passo 3: Criar o esqueleto de carregamento**

`src/app/painel/loading.tsx`:

```tsx
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-8">
      <Skeleton className="mb-8 h-9 w-64" />
      <div className="space-y-4">
        {[0, 1].map((row) => (
          <Skeleton key={row} className="h-20 w-full" />
        ))}
      </div>
    </main>
  )
}
```

- [ ] **Passo 4: Verificar**

```bash
pnpm exec tsc --noEmit
```

Na janela anônima onde o convite foi aceito na Tarefa 10: a raiz do painel mostra o restaurante, o endereço público e a frase sobre a próxima etapa. A barra superior mostra o e-mail e o botão de sair.

Clicar em sair leva a `/entrar` e, tentando voltar para a raiz, o proxy redireciona de novo para `/entrar`.

- [ ] **Passo 5: Arquivos alterados**

`src/app/painel/loading.tsx` (novo), `src/app/painel/layout.tsx`, `src/app/painel/page.tsx`. **Não commitar.**

---

## Tarefa 12: Verificação de ponta a ponta

Nenhum arquivo novo. Esta tarefa existe para provar que a fase fecha o ciclo, e para pegar o que só aparece quando tudo está junto.

**Arquivos:** nenhum, exceto correções que a verificação apontar.

- [ ] **Passo 1: Compilar para produção**

```bash
pnpm exec tsc --noEmit && pnpm build 2>&1 | tail -20
```

Esperado: sem erro. Na tabela de rotas, `/admin/restaurantes/[id]` e `/painel/convite/[token]` precisam aparecer como dinâmicas (`ƒ`) — se saírem estáticas, alguma delas não está lendo a sessão e está sendo pré-renderizada, o que serviria a mesma página para todo mundo.

- [ ] **Passo 2: Confirmar que a chave de serviço continua ausente**

```bash
grep -ri "service_role" src/ .env.local 2>/dev/null; echo "--- fim da busca ---"
```

Esperado: nenhuma ocorrência antes da linha final.

- [ ] **Passo 3: Confirmar que nenhum componente alcança a DAL**

```bash
grep -rn "@/server/dal\|@/server/security" src/components/ src/hooks/ 2>/dev/null; echo "--- fim da busca ---"
```

Esperado: nenhuma ocorrência. Importar `@/server/actions` é permitido e esperado; `dal` e `security`, não.

- [ ] **Passo 4: Confirmar que o território público continua sem sessão**

```bash
curl -s -D - -o /dev/null -H "Host: localhost:3000" http://127.0.0.1:3000/ | grep -i "set-cookie" ; echo "--- fim da busca ---"
```

Esperado: nenhum `set-cookie`. A raiz não cria sessão, e isso é o que faz o isolamento entre territórios valer alguma coisa.

- [ ] **Passo 5: Confirmar o isolamento entre os territórios no navegador**

Autenticado em `admin.localhost:3000`, abrir `painel.localhost:3000`. A pessoa **precisa** cair no login: os cookies são host-only e a sessão do admin não existe naquele domínio.

Esta é a consequência prática da decisão D19 da Fase 0 e vale conferir com os próprios olhos.

- [ ] **Passo 6: Percorrer o ciclo completo, do zero**

Numa janela anônima e com um restaurante novo:

| Etapa | Resultado esperado |
|---|---|
| Entrar em `admin.` | Lista de restaurantes |
| Criar restaurante | Aparece na lista como Rascunho |
| Marcar como Ativo | Selo muda; `localhost:3000/{slug}` responde |
| Emitir convite | Link aparece uma vez, com aviso |
| Abrir o link em outra janela anônima | Nome do restaurante e as duas abas |
| Criar conta e aceitar | Cai na raiz do painel com o restaurante listado |
| Reabrir o mesmo link | "Convite indisponível" |
| Voltar ao console | Convite como "Usado"; membro na equipe |
| Suspender o restaurante | `localhost:3000/{slug}` passa a dar 404 |

Se todas as nove linhas se comportarem assim, a Fase 1 está completa.

- [ ] **Passo 7: Conferir o tema nas duas pontas**

Alternar para escuro no console, recarregar, e confirmar que a página **nasce** escura sem piscar branco. Repetir no `painel.`: a preferência é por domínio, então os dois territórios guardam a escolha separadamente. Isso é consequência do `localStorage` ser por origem, e é o comportamento correto — não um defeito.

- [ ] **Passo 8: Relatar**

Listar o que passou, o que falhou e o que ficou fora. Não afirmar que está completo sem ter rodado os passos acima e olhado a saída.

---

## Verificação de cobertura da spec

| Seção da spec | Onde é implementada |
|---|---|
| 2 — Escopo | Tarefas 6 a 11 |
| 4 — Telas e rotas | Tarefas 6, 7, 8, 9, 10, 11 |
| 5 — Fluxos: entrar | Tarefas 5 e 6 |
| 5 — Fluxos: criar restaurante | Tarefa 7 |
| 5 — Fluxos: emitir convite | Tarefa 9 |
| 5 — Fluxos: resgatar | Tarefa 10 |
| 6 — Sistema visual | Tarefa 2, aplicado em todas as telas |
| 7 — Tema | Tarefa 3 |
| 8 — Erros, vazios e carregamento | Tarefas 4, 7, 8, 11 |
| 9 — Segurança na interface | Tarefas 4, 7, 8, 12 |
| 10 — Limpezas | Tarefas 1 e 2 |
| E11 — Erro previsto com mensagem própria | Tarefa 1, verificado na Tarefa 7 |
