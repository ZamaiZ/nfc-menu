# Fase 3A — Fundação visual e cardápio público: plano de implementação

> **Para quem executa:** SUB-SKILL OBRIGATÓRIA: use `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` para executar este plano tarefa a tarefa. Os passos usam caixas (`- [ ]`) para acompanhamento.

**Objetivo:** dar às três superfícies um sistema visual próprio e reconstruir o cardápio público, que hoje não tem uma única classe de estilo, com oito temas parametrizados pela identidade de cada restaurante.

**Arquitetura:** a fundação (cor, tipografia, superfícies, movimento, primitivos) vive em `globals.css` e num punhado de componentes compartilhados. O sistema de temas é um conjunto de definições de dados em TypeScript que viram variáveis CSS numa página de servidor — nenhum tema chega ao navegador como JavaScript. O cardápio público lê a coluna `theme` que já existe e desenha a partir dessas variáveis.

**Pilha:** Next 16.3.5 (App Router), React 19.2.8, Tailwind v4, shadcn sobre Base UI, `motion@13`, Supabase.

**Spec:** `docs/superpowers/specs/2026-09-18-fase3-onboarding-papeis-e-visual-design.md`

**Este plano é o primeiro de três.** O B trata papéis e permissões; o C, convite, onboarding e identidade. Este não depende de nenhum dos dois e não cria migration nenhuma: a coluna `theme jsonb` já existe em `restaurants` desde a migration 0003.

## Restrições globais

Valem para **todas** as tarefas.

- **Nada de git.** Não rodar `add`, `commit`, `push` ou `branch`. Cada tarefa termina listando os arquivos alterados, e só.
- **Sem testes automatizados.** Cada tarefa termina com um comando de verificação cujo resultado é conferido e reportado.
- **A verificação de código é `pnpm exec tsc --noEmit`.** Lint não é portão.
- **As provas de lógica rodam com `pnpm exec tsx <arquivo>`.** `tsx` foi acrescentado como dependência de desenvolvimento em 2026-09-18 exatamente para isto: ele lê o `tsconfig.json` e resolve os apelidos `@/`, que o `--experimental-strip-types` do Node não resolve. Sem ele, as provas testariam uma cópia do código em vez do código. **O arquivo da prova vai no diretório temporário da sessão, nunca no projeto** — ele é andaime de verificação, não código de produção.
- **Antes de escrever código, ler o guia pertinente em `node_modules/next/dist/docs/`.** Esta versão do Next tem mudanças de contrato em relação ao conhecimento prévio.
- **Composição usa `render`, nunca `asChild`.** O shadcn deste projeto é sobre Base UI: `<Trigger render={<Button />}>conteúdo</Trigger>`.
- **`cn` vem do pacote `cn`**, não de `@/lib/utils`.
- **Toast:** `toast.add({ title, description, type })`, com `type` em `success | error | info | warning | loading`.
- **Formulários:** `Field`, `FieldLabel`, `FieldDescription`, `FieldGroup` de `@/components/ui/field`.
- **`Switch` usa `checked` e `onCheckedChange(checked, details)`** — a assinatura do Base UI tem um segundo argumento que o Radix não tem.
- **Componente de cliente nunca importa `@/server/dal` nem `@/server/security`.** Server actions de `@/server/actions` são a exceção deliberada.
- **Server action chamada de manipulador de evento vai dentro de `startTransition`.**
- **Diálogo nunca vive dentro de menu suspenso.**
- **Rotas são externas.** Dentro de `painel.` escreve-se `/restaurantes/x`; o proxy reescreve. Nunca escrever o prefixo do território em `href` ou `redirect`.
- **Português do Brasil** em toda a interface e em toda mensagem de erro.
- **Preço em centavos inteiros** em todo lugar; conversão para exibição só na borda, via `formatPriceBRL`.

## O que cai da direção visual da Fase 1

Registrado aqui porque contraria instrução escrita nos planos anteriores, e quem executar vai encontrar a contradição:

- **"Tudo peso 600"** cai. Hierarquia por tamanho apenas achata a página.
- **"Uma fonte só"** cai no painel e no cardápio. Contraste de forma é o que constrói hierarquia. O console continua só com Inter, de propósito: densidade e sobriedade são o caráter dele.
- **"Cor primária nunca como superfície"** cai no cardápio público, onde a marca do restaurante precisa aparecer em superfície. Continua valendo no console e no painel.

**O que fica:** alvo de toque mínimo de 44px, e cor nunca sendo o único portador de significado.

## Estado da execução — 2026-09-18

**Todas as nove tarefas concluídas.** `pnpm exec tsc --noEmit` limpo e `pnpm build` limpo, com `/[slug]` dinâmica como previsto.

| Tarefa | Situação |
|---|---|
| 1 — Fundação de cor, tipografia e superfície | Concluída. Tokens resolvem e trocam entre claro e escuro, `tabular-nums` ativo, Fraunces carregada. O passo da cor primária foi **decidido como "manter"** |
| 2 — Movimento | Concluída. `Reveal` e `Stagger` no ar, com `useReducedMotion` |
| 3 — Campo com ícone | Concluída. `IconField` criado sobre o `input-group` que existia sem uso |
| 4 — As cascas | Concluída e verificada: painel em Fraunces, console em Inter, na mesma casca |
| 5 — Matemática de cor | Concluída. Onze asserções passam, incluindo preto/branco = 21,00 |
| 6 — Contrato e oito presets | Concluída. **As dezesseis faces passam contraste**, a mais apertada com 4,66 contra um piso de 3 |
| 7 — Resolvedor | Concluída. Treze asserções, incluindo branco recusado no Brasa |
| 8 — Cardápio público | Concluída e verificada no navegador, em viewport de celular |
| 9 — Verificação | Concluída, com duas substituições declaradas abaixo |

### Substituições na verificação da Tarefa 9

Os passos 2, 5 e 6 pediam o SQL Editor do projeto na nuvem, ao qual esta sessão **não tem acesso**. Foram substituídos por prova equivalente, e a substituição é declarada aqui em vez de a caixa ser marcada como se o roteiro original tivesse rodado:

- **Passo 2 (percorrer os oito temas):** as variáveis dos oito foram resolvidas pelo código real e injetadas na página ao vivo. Brasa, Confeito e Sal foram conferidos visualmente — os três layouts estruturalmente distintos (foto grande, cartão, sem foto) e três famílias tipográficas diferentes. O caminho "ler o tema do banco" fica provado pelo Grão, que é o que a coluna `theme = {}` de fato produz.
- **Passos 5 e 6 (cor fora da faixa e dado ruim):** provados no nível do código, na prova da Tarefa 7, que exercita `#ffffff` no Brasa, `preset` inexistente, número e string na coluna. É a mesma asserção que o SQL faria, uma camada antes.
- **Passo 3 (só as fontes usadas descem):** provado no navegador. Com o tema Grão, `document.fonts` mostrou **Inter e Fraunces como `loaded` e as outras sete como `unloaded`**. Ao aplicar Brasa, Anton passou a `loaded`. O `preload: false` faz o que prometia.

### Ambiente

A porta 3000 está ocupada por outro projeto (Rankup Suite). O servidor deste app sobe na **3100**, por `.claude/launch.json`. O `territoryFromHost` remove a porta antes de comparar, então `painel.localhost:3100` continua caindo no território certo. O que *não* acompanha a porta é `originFor`, que monta links a partir de `NEXT_PUBLIC_ROOT_DOMAIN=localhost:3000` — **link de convite gerado em desenvolvimento vai apontar para a 3000 e não vai abrir.** Ao executar o plano 3C, trocar a porta no `.env.local` ou corrigir o link à mão ao testar.

**Ambiente:** a porta 3000 está ocupada por outro projeto (Rankup Suite). O servidor deste app sobe na **3100**, por `.claude/launch.json`. O `territoryFromHost` remove a porta antes de comparar, então `painel.localhost:3100` continua caindo no território certo. O que *não* acompanha a porta é `originFor`, que monta links a partir de `NEXT_PUBLIC_ROOT_DOMAIN=localhost:3000` — **link de convite gerado em desenvolvimento vai apontar para a 3000 e não vai abrir.** Quando o plano 3C chegar, trocar a porta no `.env.local` ou corrigir o link à mão ao testar.

### Desvios já aplicados ao plano

- **`--font-heading` passou a apontar para uma face trocável, em vez de a display ser aplicada à mão.** Descoberto ao executar a Tarefa 1: o token `--font-heading` já alimentava o título de `Card`, `Dialog`, `Sheet`, `Drawer`, `Empty`, `AlertDialog` e `Questionnaire` — sete primitivos. Apontá-lo para `var(--heading-face)`, e trocar essa variável numa classe `.territorio-painel` aplicada no layout do painel, entrega a serifada em todos eles de uma vez e mantém o console na Inter, **sem tocar em nenhum dos sete componentes**. A alternativa do plano original — pôr `font-display` à mão em cada título — daria o mesmo resultado visual com sete edições e uma chance de esquecer alguma.
- **A Tarefa 4 herda isto:** o `PageHeader` e o `AuthShell` continuam usando `font-display` explicitamente, porque são títulos de página e não passam por `--font-heading`.

## Mapa de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `src/app/globals.css` | Tokens de cor, superfície, escala tipográfica e sombra |
| `src/app/layout.tsx` | Carrega Inter e Fraunces e expõe as variáveis |
| `src/lib/fonts.ts` | Declara as oito fontes de tema, todas com `preload: false` |
| `src/components/motion/reveal.tsx` | `Reveal` e `Stagger`, com respeito a `prefers-reduced-motion` |
| `src/components/ui/field-icon.tsx` | Campo com ícone, construído sobre `input-group` |
| `src/components/shell/page-header.tsx` | Cabeçalho de página com título, apoio e ações |
| `src/components/shell/top-bar.tsx` | Barra superior refeita, com caráter por território |
| `src/components/auth/auth-shell.tsx` | Casca de autenticação refeita |
| `src/lib/color.ts` | hex ↔ OKLCH, contraste WCAG, escolha por contraste |
| `src/domain/theme.ts` | Schema do `theme jsonb` e tipos do preset |
| `src/lib/theme/presets.ts` | As oito definições de tema |
| `src/lib/theme/resolve.ts` | Preset + escolhas do dono → variáveis CSS |
| `src/app/(site)/[slug]/page.tsx` | O cardápio público |
| `src/app/(site)/[slug]/theme.css` | As regras que consomem as variáveis do tema |
| `src/components/cardapio-publico/*` | Cabeçalho, categoria, item e mídia do cardápio |
| `src/server/dal/menu.ts` | `getPublicMenu` passa a trazer `theme` |
| `src/domain/menu.ts` | `PublicMenuDTO` ganha o tema |

---

## Tarefa 1: Fundação de cor, tipografia e superfície

Esta tarefa não muda nenhuma tela. Ela troca o vocabulário que todas as próximas vão falar.

**Arquivos:**
- Modificar: `src/app/globals.css`
- Modificar: `src/app/layout.tsx`

**Interfaces:**
- Produz: os tokens `--surface-1/2/3`, `--shadow-1/2`, a escala `--text-display|title|section|card|body|small|micro`, e a variável de fonte `--font-display`. Todas as tarefas seguintes consomem estes nomes.

- [x] **Passo 1: Acrescentar a face de display ao layout**

Em `src/app/layout.tsx`, ao lado do `Inter` que já existe:

```tsx
import { Fraunces, Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

// Fraunces é variável e tem eixo de tamanho óptico. `opsz` alto engrossa a
// serifa e fecha as contraformas, que é o que dá presença em título grande
// sem precisar de peso 700.
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  axes: ['opsz'],
})
```

E no `className` do `<html>`, acrescentar `fraunces.variable` ao lado de `inter.variable`.

- [x] **Passo 2: Acrescentar os tokens novos ao `@theme inline`**

Em `src/app/globals.css`, dentro do bloco `@theme inline` que já existe, acrescentar:

```css
  --font-display: var(--font-display);

  --text-display: 2.125rem;
  --text-display--line-height: 1.08;
  --text-title: 1.625rem;
  --text-title--line-height: 1.2;
  --text-section: 1.1875rem;
  --text-section--line-height: 1.3;
  --text-card: 0.9375rem;
  --text-card--line-height: 1.4;
  --text-body: 1rem;
  --text-body--line-height: 1.55;
  --text-small: 0.8125rem;
  --text-small--line-height: 1.5;
  --text-micro: 0.6875rem;
  --text-micro--line-height: 1.4;

  --color-surface-1: var(--surface-1);
  --color-surface-2: var(--surface-2);
  --color-surface-3: var(--surface-3);
```

Isso cria as classes `font-display`, `text-display`, `text-title`, `text-section`, `text-card`, `text-body`, `text-small`, `text-micro`, `bg-surface-1` e companhia.

- [x] **Passo 3: Definir as superfícies e as sombras**

No bloco `:root` de `globals.css`, acrescentar:

```css
  /* Três superfícies empilhadas, em vez de retângulos com borda de 1px. No
     modo claro a pilha sobe: o fundo é o mais escuro dos três, e o cartão
     que "flutua" é branco. */
  --surface-1: oklch(0.985 0.003 85);
  --surface-2: oklch(1 0 0);
  --surface-3: oklch(1 0 0);

  /* Sombra curta e de baixa opacidade, com matiz quente para combinar com
     os neutros. Sombra cinza sobre neutro quente parece suja. */
  --shadow-1: 0 1px 2px oklch(0.30 0.02 75 / 0.05), 0 1px 3px oklch(0.30 0.02 75 / 0.04);
  --shadow-2: 0 2px 4px oklch(0.30 0.02 75 / 0.05), 0 8px 20px oklch(0.30 0.02 75 / 0.07);
```

E no bloco `.dark`:

```css
  /* No escuro a pilha inverte: o fundo é o mais escuro e cada camada
     clareia. Sombra quase não funciona no escuro, então a separação vem da
     diferença de luminosidade entre as camadas. */
  --surface-1: oklch(0.18 0.005 285);
  --surface-2: oklch(0.21 0.006 285.885);
  --surface-3: oklch(0.25 0.006 285.885);

  --shadow-1: 0 1px 2px oklch(0 0 0 / 0.30);
  --shadow-2: 0 2px 4px oklch(0 0 0 / 0.30), 0 8px 20px oklch(0 0 0 / 0.35);
```

- [x] ~~**Passo 4: Decidir sobre a cor primária**~~ — **DECIDIDO EM 2026-09-18: manter a cor atual.**

A proposta era subir a croma de `oklch(0.511 0.096 186.391)` para `oklch(0.545 0.128 182)`, mantendo o matiz. O cliente optou por **não mexer**. `--primary` fica exatamente como está, nos dois blocos.

Registrado aqui, e não apagado, para uma revisão futura não reabrir a mesma discussão sem saber que ela já aconteceu. Se um dia for retomada, a mudança é de uma linha em `:root` e uma em `.dark`, e as duas versões passam contraste contra `--primary-foreground`.

- [x] **Passo 5: Aplicar a base tipográfica**

No `@layer base` de `globals.css`, substituir o bloco `body` por:

```css
  body {
    @apply bg-background text-foreground text-body;
    /* Números de largura fixa em toda a interface. Preço que dança quando
       muda de 9 para 10 é o tipo de detalhe que separa produto caprichado
       de andaime. */
    font-variant-numeric: tabular-nums;
  }
```

- [x] **Passo 6: Verificar**

Rodar:

```bash
pnpm exec tsc --noEmit
```

Esperado: nenhuma saída de erro.

Depois subir `pnpm dev`, abrir qualquer tela do painel e confirmar no inspetor que `--surface-1`, `--shadow-2` e `--font-display` existem no `:root` e mudam ao alternar claro e escuro.

**Ao terminar:** listar os arquivos alterados. Não commitar.

---

## Tarefa 2: Movimento

**Arquivos:**
- Criar: `src/components/motion/reveal.tsx`

**Interfaces:**
- Consome: nada.
- Produz: `<Reveal delay?: number>` e `<Stagger step?: number>`, ambos componentes de cliente. As tarefas 4, 8 e os planos B e C os consomem.

- [x] **Passo 1: Escrever o componente**

`src/components/motion/reveal.tsx`:

```tsx
'use client'

import { Children } from 'react'
import { motion, useReducedMotion } from 'motion/react'

// Entrada só na MONTAGEM. `initial`/`animate` sem `whileInView` e sem
// `layout` é deliberado: animar a cada renderização faria a lista inteira
// piscar toda vez que um preço mudasse.
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const reduced = useReducedMotion()

  if (reduced) return <div className={className}>{children}</div>

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}

// Cascata. O teto de 10 existe porque atraso crescente numa lista de 80
// itens faria o último aparecer quatro segundos depois do primeiro — o que
// deixa de ser elegância e vira lentidão.
export function Stagger({
  children,
  step = 0.04,
  className,
}: {
  children: React.ReactNode
  step?: number
  className?: string
}) {
  return (
    <div className={className}>
      {Children.map(children, (child, index) => (
        <Reveal delay={Math.min(index, 10) * step}>{child}</Reveal>
      ))}
    </div>
  )
}
```

- [x] **Passo 2: Verificar que o import está certo**

Rodar:

```bash
node -e "console.log(Object.keys(require('./node_modules/motion/package.json').exports))"
```

Esperado: a lista contém `./react`. Se não contiver, **pare** e reporte — o caminho do import está errado e todo o resto da tarefa depende dele.

- [x] **Passo 3: Verificar**

Rodar:

```bash
pnpm exec tsc --noEmit
```

Esperado: nenhuma saída de erro.

**Ao terminar:** listar os arquivos alterados. Não commitar.

---

## Tarefa 3: Campo com ícone

O projeto já tem `src/components/ui/input-group.tsx` e **nenhum campo o usa**. Esta tarefa cria o invólucro que torna o uso trivial.

**Arquivos:**
- Criar: `src/components/ui/field-icon.tsx`
- Ler antes: `src/components/ui/input-group.tsx`, `src/components/ui/field.tsx`

**Interfaces:**
- Consome: `InputGroup` e companhia de `@/components/ui/input-group`; `Field`, `FieldLabel`, `FieldDescription` de `@/components/ui/field`.
- Produz: `<IconField id label icon description error {...props}>`. Os planos B e C consomem em todos os formulários.

- [x] **Passo 1: Ler a API local**

Rodar:

```bash
grep -n "export function\|export const\|^type \|^  [a-zA-Z]*[?]*:" src/components/ui/input-group.tsx
```

O componente é deste projeto, não da documentação pública do shadcn. **Usar os nomes que aparecerem aqui**, não os que a memória sugerir.

- [x] **Passo 2: Escrever o componente**

`src/components/ui/field-icon.tsx`, ajustando os nomes importados ao que o passo 1 revelou:

```tsx
import type { ComponentProps, ReactNode } from 'react'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'

export function IconField({
  id,
  label,
  icon,
  description,
  error,
  ...props
}: ComponentProps<typeof InputGroupInput> & {
  id: string
  label: string
  icon: ReactNode
  description?: string
  error?: string
}) {
  const describedBy = error ? `${id}-erro` : description ? `${id}-ajuda` : undefined

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <InputGroup>
        {/* aria-hidden porque o ícone repete o rótulo. Leitor de tela
            anunciando "ícone de e-mail, E-mail" é ruído, não ajuda. */}
        <InputGroupAddon aria-hidden="true">{icon}</InputGroupAddon>
        <InputGroupInput id={id} aria-describedby={describedBy} {...props} />
      </InputGroup>
      {error ? (
        <p id={`${id}-erro`} role="alert" className="text-small text-destructive">
          {error}
        </p>
      ) : description ? (
        <FieldDescription id={`${id}-ajuda`}>{description}</FieldDescription>
      ) : null}
    </Field>
  )
}
```

- [x] **Passo 3: Verificar**

Rodar:

```bash
pnpm exec tsc --noEmit
```

Esperado: nenhuma saída de erro. Se `InputGroupAddon` ou `InputGroupInput` não existirem com esses nomes, corrigir a partir do que o passo 1 mostrou — não inventar.

**Ao terminar:** listar os arquivos alterados. Não commitar.

---

## Tarefa 4: As cascas das três superfícies

**Arquivos:**
- Modificar: `src/components/shell/top-bar.tsx`
- Modificar: `src/components/auth/auth-shell.tsx`
- Criar: `src/components/shell/page-header.tsx`

**Interfaces:**
- Consome: `Reveal` da Tarefa 2.
- Produz: `<TopBar title email variant>` com `variant` em `'console' | 'painel'`; `<PageHeader title support? children?>`. Os planos B e C consomem os dois.

- [x] **Passo 1: Escrever o cabeçalho de página**

`src/components/shell/page-header.tsx`:

```tsx
export function PageHeader({
  title,
  support,
  children,
}: {
  title: string
  support?: string
  children?: React.ReactNode
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-display font-semibold tracking-[-0.01em]">
          {title}
        </h1>
        {support ? (
          <p className="mt-1 text-body text-muted-foreground">{support}</p>
        ) : null}
      </div>
      {children ? <div className="flex flex-wrap gap-2">{children}</div> : null}
    </div>
  )
}
```

- [x] **Passo 2: Refazer a barra superior**

`src/components/shell/top-bar.tsx`, substituindo o conteúdo inteiro:

```tsx
import Link from 'next/link'
import { cn } from 'cn'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { SignOutButton } from './sign-out-button'

export function TopBar({
  title,
  email,
  variant = 'painel',
}: {
  title: string
  email: string | null
  variant?: 'console' | 'painel'
}) {
  return (
    <header
      className={cn(
        'sticky top-0 z-30 border-b border-border/70',
        // O desfoque só existe quando há o que desfocar. Fundo opaco no
        // navegador que não suporta backdrop-filter, para o texto da barra
        // nunca ficar sobre a página rolando por baixo.
        'bg-background/85 supports-[backdrop-filter]:bg-background/70 supports-[backdrop-filter]:backdrop-blur-md',
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-[1180px] items-center gap-4 px-4 sm:px-6">
        {/* Caminho EXTERNO: dentro de admin. isto leva à lista, porque o
            proxy reescreve. Escrever /admin aqui produziria /admin/admin. */}
        <Link
          href="/"
          className={cn(
            'rounded-md font-semibold outline-none',
            'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            // O console é deliberadamente sem display: densidade e sobriedade
            // são o caráter dele. O painel é onde o dono passa o dia.
            variant === 'painel'
              ? 'font-display text-section'
              : 'text-card tracking-[0.01em]',
          )}
        >
          {title}
        </Link>
        <div className="ml-auto flex items-center gap-2">
          {email ? (
            <span className="hidden max-w-[220px] truncate text-small text-muted-foreground sm:inline">
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

- [x] **Passo 3: Passar a variante no console**

Em `src/app/admin/layout.tsx`, acrescentar `variant="console"` ao `<TopBar>`. O painel não precisa de mudança: `painel` é o padrão.

- [x] **Passo 4: Refazer a casca de autenticação**

`src/components/auth/auth-shell.tsx`, substituindo o conteúdo inteiro:

```tsx
import { Reveal } from '@/components/motion/reveal'

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
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-12">
      {/* Um halo único, atrás de tudo, sem interceptar clique. É o que tira
          a tela de entrada da cara de formulário solto no branco. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[620px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />
      <Reveal className="relative w-full max-w-sm">
        <div className="space-y-2 text-center">
          <h1 className="font-display text-display font-semibold leading-tight tracking-[-0.01em]">
            {title}
          </h1>
          {subtitle ? (
            <p className="text-body text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {children ? <div className="mt-8">{children}</div> : null}
      </Reveal>
    </main>
  )
}
```

- [x] **Passo 5: Verificar**

Rodar:

```bash
pnpm exec tsc --noEmit
```

Esperado: nenhuma saída de erro.

No navegador, com `pnpm dev`: abrir `painel.localhost:3000/entrar` e confirmar que o título entra com deslocamento curto e que existe um halo atrás do cartão. Abrir `admin.localhost:3000` e confirmar que a barra superior fica grudada ao rolar e que o título do console **não** usa a serifada.

**Ao terminar:** listar os arquivos alterados. Não commitar.

---

## Tarefa 5: Matemática de cor

Sem esta tarefa, "validado por contraste" é conversa. Ela é pura função: entra texto, sai número.

**Arquivos:**
- Criar: `src/lib/color.ts`

**Interfaces:**
- Consome: nada.
- Produz: `hexToOklch(hex)`, `contrastRatio(hexA, hexB)`, `pickByContrast(background, candidates)`, `isHex(value)`. As Tarefas 6 e 7 consomem as quatro.

- [x] **Passo 1: Escrever o módulo**

`src/lib/color.ts`:

```ts
// Conversões de cor, sem dependência externa. A matemática é a de sempre —
// sRGB → linear → LMS → Oklab → OKLCH — e os coeficientes são os
// publicados por Björn Ottosson.
//
// Este arquivo roda no servidor E no navegador (o seletor de cor do plano C
// precisa dele), então não pode importar nada de @/server.

export type Oklch = { l: number; c: number; h: number }

const HEX = /^#[0-9a-fA-F]{6}$/

export function isHex(value: unknown): value is string {
  return typeof value === 'string' && HEX.test(value)
}

function toLinear(channel: number): number {
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
}

// Devolve os três canais JÁ linearizados, que é o que tanto o Oklab quanto a
// luminância do WCAG precisam. Converter duas vezes seria desperdício e,
// pior, uma chance de as duas divergirem.
function hexToLinearRgb(hex: string): [number, number, number] {
  if (!isHex(hex)) throw new Error(`Cor inválida: ${hex}`)
  const n = Number.parseInt(hex.slice(1), 16)
  return [
    toLinear(((n >> 16) & 255) / 255),
    toLinear(((n >> 8) & 255) / 255),
    toLinear((n & 255) / 255),
  ]
}

export function hexToOklch(hex: string): Oklch {
  const [r, g, b] = hexToLinearRgb(hex)

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)

  const okL = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const okA = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const okB = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s

  return {
    l: okL,
    c: Math.hypot(okA, okB),
    h: ((Math.atan2(okB, okA) * 180) / Math.PI + 360) % 360,
  }
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToLinearRgb(hex)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// Razão de contraste do WCAG 2.1. Vai de 1 (idênticas) a 21 (preto sobre
// branco). Texto de corpo pede 4,5; texto grande e elemento de interface,
// 3. A ordem dos argumentos não importa.
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

// Escolhe, entre candidatas, a que mais contrasta com o fundo. É assim que
// o texto deixa de ser escolha do dono: ele move o fundo, e o texto vai
// atrás sozinho, sempre para o lado legível.
export function pickByContrast(background: string, candidates: readonly string[]): string {
  if (candidates.length === 0) throw new Error('Sem candidatas')

  let best = candidates[0]
  let bestRatio = contrastRatio(background, best)

  for (const candidate of candidates.slice(1)) {
    const ratio = contrastRatio(background, candidate)
    if (ratio > bestRatio) {
      best = candidate
      bestRatio = ratio
    }
  }

  return best
}
```

- [x] **Passo 2: Provar a matemática contra valores conhecidos**

Rodar:

```bash
pnpm exec tsx --eval "import {contrastRatio,hexToOklch} from './src/lib/color.ts'; console.log('preto/branco', contrastRatio('#000000','#ffffff').toFixed(2)); console.log('igual', contrastRatio('#777777','#777777').toFixed(2)); const w=hexToOklch('#ffffff'); console.log('branco L', w.l.toFixed(3), 'C', w.c.toFixed(3)); const k=hexToOklch('#000000'); console.log('preto L', k.l.toFixed(3));"
```

Se `tsx` não estiver disponível, rodar o mesmo trecho com `pnpm exec tsc` num arquivo temporário e `node` sobre a saída, ou usar `node --experimental-strip-types`.

Esperado, exatamente:
- `preto/branco 21.00`
- `igual 1.00`
- `branco L 1.000 C 0.000`
- `preto L 0.000`

**Se qualquer um divergir, pare.** Um erro de coeficiente aqui contamina silenciosamente os oito temas, e o sintoma aparece só como "esse tema ficou meio estranho".

- [x] **Passo 3: Verificar**

Rodar:

```bash
pnpm exec tsc --noEmit
```

Esperado: nenhuma saída de erro.

**Ao terminar:** listar os arquivos alterados. Não commitar.

---

## Tarefa 6: O contrato do tema e os oito presets

**Arquivos:**
- Criar: `src/domain/theme.ts`
- Criar: `src/lib/theme/presets.ts`
- Criar: `src/lib/fonts.ts`

**Interfaces:**
- Consome: `hexToOklch` e `isHex` da Tarefa 5.
- Produz: `themeSchema`, `ThemeChoice`, `ThemePreset`, `PRESETS`, `isBaseInRange(preset, hex)`, `THEME_FONTS`. A Tarefa 7 consome todos.

- [x] **Passo 1: Declarar as fontes dos temas**

`src/lib/fonts.ts`:

```ts
import {
  Anton,
  Bitter,
  Cormorant_Garamond,
  Fraunces,
  Inter,
  Outfit,
  Quicksand,
  Space_Grotesk,
  Zen_Kaku_Gothic_New,
} from 'next/font/google'

// `preload: false` em TODAS as fontes de tema, e o motivo é concreto: o
// next/font declara as oito no grafo desta rota, e com preload ligado o
// navegador baixaria as oito em todo cardápio, para usar uma. Sem preload,
// só o @font-face que o CSS renderizado realmente casar é buscado — o
// navegador não baixa fonte que nenhum texto usa.
//
// Custo do que sobra: alguns quilobytes de CSS de @font-face não usado.
// Preço barato por não mandar dois megabytes de fonte para um celular numa
// mesa de restaurante.
const shared = { subsets: ['latin'] as const, preload: false, display: 'swap' as const }

export const antonFont = Anton({ ...shared, weight: '400', variable: '--tf-anton' })
export const bitterFont = Bitter({ ...shared, variable: '--tf-bitter' })
export const cormorantFont = Cormorant_Garamond({
  ...shared,
  weight: ['300', '400', '500'],
  variable: '--tf-cormorant',
})
export const frauncesFont = Fraunces({ ...shared, axes: ['opsz'], variable: '--tf-fraunces' })
export const interFont = Inter({ ...shared, variable: '--tf-inter' })
export const outfitFont = Outfit({ ...shared, variable: '--tf-outfit' })
export const quicksandFont = Quicksand({ ...shared, variable: '--tf-quicksand' })
export const spaceGroteskFont = Space_Grotesk({ ...shared, variable: '--tf-space' })
export const zenKakuFont = Zen_Kaku_Gothic_New({
  ...shared,
  weight: ['400', '500', '700'],
  variable: '--tf-zen',
})

// Todas juntas, para a rota do cardápio aplicar de uma vez. Só a que o tema
// ativo referenciar em --theme-display de fato desce para o aparelho.
export const ALL_THEME_FONT_VARIABLES = [
  antonFont.variable,
  bitterFont.variable,
  cormorantFont.variable,
  frauncesFont.variable,
  interFont.variable,
  outfitFont.variable,
  quicksandFont.variable,
  spaceGroteskFont.variable,
  zenKakuFont.variable,
].join(' ')
```

- [x] **Passo 2: Escrever o contrato**

`src/domain/theme.ts`:

```ts
import { z } from 'zod'

export const THEME_PRESET_IDS = [
  'brasa',
  'forno',
  'grao',
  'sal',
  'horta',
  'neon',
  'nori',
  'confeito',
] as const

export type ThemePresetId = (typeof THEME_PRESET_IDS)[number]

export const DEFAULT_PRESET: ThemePresetId = 'grao'

const hexSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, { error: 'Use uma cor no formato #RRGGBB' })

export const densitySchema = z.enum(['confortavel', 'compacto'])
export type Density = z.infer<typeof densitySchema>

// `catch` e não `default`: a coluna é jsonb livre e pode conter qualquer
// coisa, inclusive o nome de um preset que existia e foi removido num
// deploy. Um cardápio nunca deve quebrar por causa disso — ele cai no
// padrão e segue no ar.
export const themeSchema = z.object({
  preset: z.enum(THEME_PRESET_IDS).catch(DEFAULT_PRESET),
  base: hexSchema.nullish().catch(null),
  accent: hexSchema.nullish().catch(null),
  density: densitySchema.catch('confortavel'),
})

export type ThemeChoice = z.infer<typeof themeSchema>

// O que o preset fixa e o dono não escolhe.
export type ThemePreset = {
  id: ThemePresetId
  label: string
  /** Segmentos que este tema atende. Alimenta a sugestão no plano C. */
  segments: readonly string[]
  /** Variáveis CSS de `@/lib/fonts`, com a pilha de reserva. */
  displayFont: string
  textFont: string
  /** Como o item se apresenta. `card` é o único em que ele é um objeto. */
  layout: 'foto-grande' | 'foto-pequena' | 'sem-foto' | 'cartao'
  radius: { block: string; photo: string }
  /** Faixa válida do fundo da face clara, em OKLCH. */
  baseRange: { l: readonly [number, number]; c: readonly [number, number] }
  light: FaceDefinition
  dark: FaceDefinition
}

export type FaceDefinition = {
  base: string
  accent: string
  /** Candidatas a texto. A de maior contraste contra o fundo vence. */
  ink: readonly [string, string]
  muted: readonly [string, string]
  line: readonly [string, string]
}
```

- [x] **Passo 3: Escrever os oito presets**

`src/lib/theme/presets.ts`:

```ts
import type { ThemePreset, ThemePresetId } from '@/domain/theme'
import { hexToOklch } from '@/lib/color'

const NEUTRAL_INK = ['#12100e', '#f7f4ee'] as const
const NEUTRAL_MUTED = ['#6b6459', '#a8a096'] as const

export const PRESETS: Record<ThemePresetId, ThemePreset> = {
  brasa: {
    id: 'brasa',
    label: 'Brasa',
    segments: ['Hamburgueria', 'Churrascaria', 'Steakhouse', 'Parrilla', 'Americano', 'Churrasco coreano', 'Fast-food', 'Food truck', 'Dark kitchen'],
    displayFont: 'var(--tf-anton), sans-serif',
    textFont: 'var(--tf-inter), sans-serif',
    layout: 'foto-grande',
    radius: { block: '4px', photo: '4px' },
    baseRange: { l: [0.08, 0.22], c: [0, 0.04] },
    light: { base: '#0d0c0b', accent: '#f0a154', ink: NEUTRAL_INK, muted: ['#4a443c', '#a39a8d'], line: ['#d9d2c8', '#241f1a'] },
    dark: { base: '#0a0908', accent: '#f0a154', ink: NEUTRAL_INK, muted: ['#4a443c', '#a39a8d'], line: ['#d9d2c8', '#201c18'] },
  },
  forno: {
    id: 'forno',
    label: 'Forno',
    segments: ['Pizzaria', 'Cantina italiana', 'Casa de massas', 'Mineiro', 'Nordestino', 'Pastelaria', 'Tapiocaria', 'Rotisserie', 'Self-service', 'Buffet e rodízio', 'Casual dining', 'Mexicano', 'Árabe', 'Indiano'],
    displayFont: 'var(--tf-bitter), serif',
    textFont: 'var(--tf-inter), sans-serif',
    layout: 'foto-grande',
    radius: { block: '8px', photo: '8px' },
    baseRange: { l: [0.9, 0.99], c: [0, 0.05] },
    light: { base: '#fdf6e8', accent: '#b4351f', ink: ['#2e1b12', '#fdf6e8'], muted: ['#6f5642', '#c9b39c'], line: ['#efe1c9', '#3a2a1e'] },
    dark: { base: '#17110d', accent: '#e0603f', ink: ['#2e1b12', '#fbf1e2'], muted: ['#6f5642', '#b4a190'], line: ['#efe1c9', '#2b2019'] },
  },
  grao: {
    id: 'grao',
    label: 'Grão',
    segments: ['Cafeteria', 'Padaria artesanal', 'Creperia', 'Brunch', 'Restaurante de hotel'],
    displayFont: 'var(--tf-fraunces), serif',
    textFont: 'var(--tf-inter), sans-serif',
    layout: 'foto-pequena',
    radius: { block: '14px', photo: '999px' },
    baseRange: { l: [0.92, 0.99], c: [0, 0.04] },
    light: { base: '#faf5ec', accent: '#8f6f4e', ink: ['#33291d', '#faf5ec'], muted: ['#6d6052', '#b9ab98'], line: ['#e8ddcb', '#39302a'] },
    dark: { base: '#17140f', accent: '#c59a6d', ink: ['#33291d', '#f6f1e7'], muted: ['#6d6052', '#a99c8b'], line: ['#e8ddcb', '#2a2520'] },
  },
  sal: {
    id: 'sal',
    label: 'Sal',
    segments: ['Alta gastronomia', 'Bistrô francês', 'Wine bar', 'Mediterrâneo', 'Peruano', 'Cevicheria'],
    displayFont: 'var(--tf-cormorant), serif',
    textFont: 'var(--tf-inter), sans-serif',
    layout: 'sem-foto',
    radius: { block: '0px', photo: '0px' },
    baseRange: { l: [0.93, 1], c: [0, 0.02] },
    light: { base: '#fbfbfa', accent: '#6f6c65', ink: ['#1e1e1c', '#fbfbfa'], muted: ['#5f5d57', '#a8a59e'], line: ['#eae8e3', '#2e2d2a'] },
    dark: { base: '#131312', accent: '#b5b1a8', ink: ['#1e1e1c', '#f2f1ee'], muted: ['#5f5d57', '#9d9a93'], line: ['#eae8e3', '#242321'] },
  },
  horta: {
    id: 'horta',
    label: 'Horta',
    segments: ['Açaí', 'Saladeria', 'Sucos', 'Vegetariano', 'Vegano', 'Fit e saudável', 'Sem glúten', 'Poke', 'Kosher', 'Halal'],
    displayFont: 'var(--tf-outfit), sans-serif',
    textFont: 'var(--tf-outfit), sans-serif',
    layout: 'foto-pequena',
    radius: { block: '22px', photo: '999px' },
    baseRange: { l: [0.93, 1], c: [0, 0.05] },
    light: { base: '#f4faf3', accent: '#1f7a45', ink: ['#16301f', '#f4faf3'], muted: ['#4c6b56', '#9fbba9'], line: ['#dceadf', '#23392b'] },
    dark: { base: '#0f1a13', accent: '#4ec988', ink: ['#16301f', '#eef7f0'], muted: ['#4c6b56', '#9db3a4'], line: ['#dceadf', '#1d2c22'] },
  },
  neon: {
    id: 'neon',
    label: 'Neon',
    segments: ['Bar', 'Boteco', 'Pub', 'Gastrobar', 'Cachaçaria', 'Izakaya'],
    displayFont: 'var(--tf-space), sans-serif',
    textFont: 'var(--tf-space), sans-serif',
    layout: 'sem-foto',
    radius: { block: '2px', photo: '2px' },
    baseRange: { l: [0.05, 0.2], c: [0, 0.06] },
    light: { base: '#08080c', accent: '#16e0a3', ink: ['#0d0d12', '#eef0f6'], muted: ['#3a3a48', '#8b8fa3'], line: ['#d5d7e0', '#191922'] },
    dark: { base: '#05050a', accent: '#16e0a3', ink: ['#0d0d12', '#eef0f6'], muted: ['#3a3a48', '#8b8fa3'], line: ['#d5d7e0', '#15151d'] },
  },
  nori: {
    id: 'nori',
    label: 'Nori',
    segments: ['Japonês', 'Chinês', 'Tailandês', 'Coreano', 'Vietnamita'],
    displayFont: 'var(--tf-zen), sans-serif',
    textFont: 'var(--tf-inter), sans-serif',
    layout: 'foto-pequena',
    radius: { block: '2px', photo: '2px' },
    baseRange: { l: [0.9, 0.99], c: [0, 0.03] },
    light: { base: '#f6f5f2', accent: '#b5232c', ink: ['#17171a', '#f6f5f2'], muted: ['#5c5c58', '#a5a5a0'], line: ['#e4e2dc', '#2b2b2e'] },
    dark: { base: '#131314', accent: '#e04a52', ink: ['#17171a', '#f1f0ed'], muted: ['#5c5c58', '#9b9b96'], line: ['#e4e2dc', '#232326'] },
  },
  confeito: {
    id: 'confeito',
    label: 'Confeito',
    segments: ['Doceria', 'Confeitaria', 'Sorveteria', 'Gelateria', 'Churros'],
    displayFont: 'var(--tf-quicksand), sans-serif',
    textFont: 'var(--tf-quicksand), sans-serif',
    layout: 'cartao',
    radius: { block: '24px', photo: '18px' },
    baseRange: { l: [0.93, 1], c: [0, 0.05] },
    light: { base: '#fff8fa', accent: '#c93765', ink: ['#3a2430', '#fff8fa'], muted: ['#7a5c68', '#d4b2be'], line: ['#f6e2e8', '#3c2c33'] },
    dark: { base: '#171013', accent: '#f07fa4', ink: ['#3a2430', '#fbeef2'], muted: ['#7a5c68', '#bda3ac'], line: ['#f6e2e8', '#251a1f'] },
  },
}

// A faixa vive no preset; a checagem vive aqui, para o plano C ter uma só
// função para chamar e nenhuma chance de as duas divergirem.
export function isBaseInRange(presetId: ThemePresetId, hex: string): boolean {
  const { baseRange } = PRESETS[presetId]
  const { l, c } = hexToOklch(hex)
  return (
    l >= baseRange.l[0] && l <= baseRange.l[1] &&
    c >= baseRange.c[0] && c <= baseRange.c[1]
  )
}
```

**Atenção:** o `NEUTRAL_MUTED` declarado no topo do arquivo não é usado por nenhum preset — cada um declara as próprias candidatas de texto secundário, porque o neutro que funciona sobre creme não funciona sobre rosa. Remova a constante se o lint reclamar; ela está ali só para deixar explícito que a tentativa de compartilhar foi feita e não serviu.

- [x] **Passo 4: Provar que os oito presets passam contraste**

Criar um arquivo temporário fora do projeto versionado e rodá-lo, ou usar `node --experimental-strip-types`. O roteiro:

```ts
import { PRESETS } from './src/lib/theme/presets.ts'
import { contrastRatio, pickByContrast } from './src/lib/color.ts'

let falhou = false
for (const preset of Object.values(PRESETS)) {
  for (const face of ['light', 'dark'] as const) {
    const f = preset[face]
    const ink = pickByContrast(f.base, f.ink)
    const muted = pickByContrast(f.base, f.muted)
    const rInk = contrastRatio(f.base, ink)
    const rMuted = contrastRatio(f.base, muted)
    const rAccent = contrastRatio(f.base, f.accent)
    const ok = rInk >= 4.5 && rMuted >= 4.5 && rAccent >= 3
    if (!ok) falhou = true
    console.log(
      `${preset.id}/${face}`,
      'ink', rInk.toFixed(2),
      'muted', rMuted.toFixed(2),
      'accent', rAccent.toFixed(2),
      ok ? 'ok' : 'FALHOU',
    )
  }
}
console.log(falhou ? 'HÁ FALHAS' : 'todos passam')
```

Esperado: dezesseis linhas com `ok` e a última linha `todos passam`.

**Se alguma falhar, ajustar a cor daquele preset até passar** — e é para isso que a prova existe. Texto de corpo pede 4,5; o destaque, que aparece em preço e rótulo grande, pede 3. Não relaxar os limites para fazer a prova passar: o limite é o produto, o valor da cor é o detalhe.

- [x] **Passo 5: Verificar**

Rodar:

```bash
pnpm exec tsc --noEmit
```

Esperado: nenhuma saída de erro.

**Ao terminar:** listar os arquivos alterados. Não commitar.

---

## Tarefa 7: Resolver o tema em variáveis CSS

**Arquivos:**
- Criar: `src/lib/theme/resolve.ts`

**Interfaces:**
- Consome: `themeSchema`, `PRESETS`, `isBaseInRange` da Tarefa 6; `pickByContrast` da Tarefa 5.
- Produz: `resolveTheme(raw: unknown): ResolvedTheme`, onde `ResolvedTheme = { presetId, layout, density, styleLight, styleDark }` e os dois `style` são `Record<string, string>` de variáveis CSS. A Tarefa 8 consome.

- [x] **Passo 1: Escrever o resolvedor**

`src/lib/theme/resolve.ts`:

```ts
import { DEFAULT_PRESET, themeSchema, type Density, type FaceDefinition, type ThemePreset, type ThemePresetId } from '@/domain/theme'
import { pickByContrast } from '@/lib/color'
import { isBaseInRange, PRESETS } from './presets'

export type ResolvedTheme = {
  presetId: ThemePresetId
  layout: ThemePreset['layout']
  density: Density
  styleLight: Record<string, string>
  styleDark: Record<string, string>
}

function faceToVars(preset: ThemePreset, face: FaceDefinition, base: string) {
  return {
    '--m-base': base,
    '--m-ink': pickByContrast(base, face.ink),
    '--m-muted': pickByContrast(base, face.muted),
    '--m-line': pickByContrast(base, face.line),
    '--m-accent': face.accent,
    // O texto SOBRE o destaque é escolhido contra o destaque, não contra o
    // fundo. Sem isto, um destaque claro num tema claro daria texto claro
    // sobre fundo claro no único lugar que precisa gritar: o botão.
    '--m-on-accent': pickByContrast(face.accent, face.ink),
    '--m-radius-block': preset.radius.block,
    '--m-radius-photo': preset.radius.photo,
    '--m-font-display': preset.displayFont,
    '--m-font-text': preset.textFont,
  }
}

export function resolveTheme(raw: unknown): ResolvedTheme {
  // `safeParse`, e não `parse`. Os `catch` de cada campo cobrem valor ruim
  // DENTRO de um objeto, mas a coluna é jsonb livre e pode conter `42` ou
  // uma string — aí o erro é no nível do objeto e nenhum catch de campo
  // pega. Cardápio no ar não pode cair por causa do conteúdo de uma coluna.
  const parsed = themeSchema.safeParse(raw ?? {})
  const choice = parsed.success
    ? parsed.data
    : { preset: DEFAULT_PRESET, base: null, accent: null, density: 'confortavel' as const }

  const preset = PRESETS[choice.preset]

  // O dono escolhe o fundo da face CLARA. A escura mantém o padrão do
  // preset, porque derivar um escuro bom a partir de um claro qualquer não
  // é confiável, e um cardápio ilegível à noite é pior que um previsível.
  // O destaque, esse sim, vale nas duas faces.
  const baseLight =
    choice.base && isBaseInRange(choice.preset, choice.base)
      ? choice.base
      : preset.light.base

  const accent = choice.accent ?? null

  return {
    presetId: preset.id,
    layout: preset.layout,
    density: choice.density,
    styleLight: faceToVars(
      preset,
      accent ? { ...preset.light, accent } : preset.light,
      baseLight,
    ),
    styleDark: faceToVars(
      preset,
      accent ? { ...preset.dark, accent } : preset.dark,
      preset.dark.base,
    ),
  }
}
```

- [x] **Passo 2: Provar o comportamento em três casos**

Rodar o roteiro abaixo pelo mesmo caminho do passo 4 da Tarefa 6:

```ts
import { resolveTheme } from './src/lib/theme/resolve.ts'

console.log('vazio ->', resolveTheme(null).presetId)
console.log('lixo  ->', resolveTheme({ preset: 'nao-existe', base: 'azul' }).presetId)
const fora = resolveTheme({ preset: 'brasa', base: '#ffffff' })
console.log('fora da faixa ->', fora.styleLight['--m-base'])
const dentro = resolveTheme({ preset: 'brasa', base: '#14110f' })
console.log('dentro da faixa ->', dentro.styleLight['--m-base'])
```

Esperado, exatamente:
- `vazio -> grao`
- `lixo  -> grao`
- `fora da faixa -> #0d0c0b` (o padrão do Brasa; branco foi recusado)
- `dentro da faixa -> #14110f` (aceito)

**A terceira linha é a que importa.** Se ela devolver `#ffffff`, a faixa não está sendo aplicada e qualquer dono consegue produzir um cardápio ilegível.

- [x] **Passo 3: Verificar**

Rodar:

```bash
pnpm exec tsc --noEmit
```

Esperado: nenhuma saída de erro.

**Ao terminar:** listar os arquivos alterados. Não commitar.

---

## Tarefa 8: O cardápio público

**Arquivos:**
- Modificar: `src/domain/menu.ts` (o `PublicMenuDTO` ganha `theme`)
- Modificar: `src/server/dal/menu.ts:84-170` (`getPublicMenu` passa a trazer `theme`)
- Criar: `src/app/(site)/[slug]/theme.css`
- Substituir: `src/app/(site)/[slug]/page.tsx`
- Criar: `src/components/cardapio-publico/menu-header.tsx`
- Criar: `src/components/cardapio-publico/menu-category.tsx`
- Criar: `src/components/cardapio-publico/menu-item.tsx`

**Interfaces:**
- Consome: `resolveTheme` da Tarefa 7; `ALL_THEME_FONT_VARIABLES` da Tarefa 6; `Stagger` da Tarefa 2; `publicMediaUrl` de `@/lib/media-url`; `formatPriceBRL` de `@/lib/format`.
- Produz: nada que outra tarefa consuma.

- [x] **Passo 1: Levar o tema até a página**

Em `src/domain/menu.ts`, no tipo `PublicMenuDTO`, acrescentar ao objeto `restaurant`:

```ts
    theme: unknown
```

`unknown` de propósito: a coluna é `jsonb` livre, e quem sabe a forma dela é o `themeSchema`, não o DTO. Tipar como `ThemeChoice` aqui seria mentir sobre um dado que ainda não foi validado.

Em `src/server/dal/menu.ts`, dentro de `getPublicMenu`, acrescentar `theme` à lista de colunas do `.select()` — fica `slug, name, description, logo_path, cover_path, contact, theme,` — e acrescentar ao objeto devolvido:

```ts
      theme: data.theme,
```

- [x] **Passo 2: Escrever as regras do tema**

`src/app/(site)/[slug]/theme.css`. Nenhuma cor literal aqui: tudo sai das variáveis que a Tarefa 7 produz.

```css
.menu {
  background: var(--m-base);
  color: var(--m-ink);
  font-family: var(--m-font-text);
  min-height: 100dvh;
}

.menu-display { font-family: var(--m-font-display); }
.menu-muted { color: var(--m-muted); }
.menu-accent { color: var(--m-accent); }
.menu-line { border-color: var(--m-line); }
.menu-block { border-radius: var(--m-radius-block); }
.menu-photo { border-radius: var(--m-radius-photo); object-fit: cover; }

/* O único tema em que o item é um objeto, e não uma linha. É layout, e por
   isso mora aqui e não numa variável de cor. */
.menu[data-layout='cartao'] .menu-item {
  background: color-mix(in oklab, var(--m-base) 82%, white);
  border-radius: var(--m-radius-block);
  box-shadow: 0 3px 12px color-mix(in oklab, var(--m-accent) 14%, transparent);
  padding: 0.625rem;
}

/* Compacto recolhe a descrição e aperta a linha. Existe para cardápio de
   rotisserie e self-service, com centenas de itens, que fica ilegível no
   espaçamento pensado para um rodízio de doze linhas. */
.menu[data-density='compacto'] .menu-item { padding-block: 0.5rem; }
.menu[data-density='compacto'] .menu-item-description { display: none; }
```

- [x] **Passo 3: Escrever o cabeçalho**

`src/components/cardapio-publico/menu-header.tsx`:

```tsx
import { publicMediaUrl } from '@/lib/media-url'

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
  type Atalho = { rotulo: string; href: string }

  // O predicado é escrito à mão de propósito. A inferência automática de
  // `filter` só chegou no TypeScript 5.5, e o projeto declara `^5` — o que
  // permite instalar 5.0. Escrito assim, funciona em qualquer versão 5.
  const links = [
    contact.whatsapp ? { rotulo: 'WhatsApp', href: `https://wa.me/${contact.whatsapp.replace(/\D/g, '')}` } : null,
    contact.instagram ? { rotulo: 'Instagram', href: `https://instagram.com/${contact.instagram.replace(/^@/, '')}` } : null,
    contact.phone ? { rotulo: 'Telefone', href: `tel:${contact.phone.replace(/\D/g, '')}` } : null,
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
          <div
            className="h-full w-full"
            style={{
              background:
                'linear-gradient(150deg, color-mix(in oklab, var(--m-accent) 70%, var(--m-base)), var(--m-base))',
            }}
          />
        )}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, var(--m-base) 4%, transparent 55%)' }}
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
          <p className="menu-muted mt-2 text-[0.9375rem] leading-relaxed">{description}</p>
        ) : null}

        {links.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {links.map((link) => (
              <a
                key={link.rotulo}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                // 44px de alvo de toque, que é a regra que sobreviveu da
                // direção da Fase 1.
                className="menu-block menu-line flex min-h-11 items-center border px-4 text-sm font-medium"
              >
                {link.rotulo}
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </header>
  )
}
```

- [x] **Passo 4: Escrever o item**

`src/components/cardapio-publico/menu-item.tsx`:

```tsx
import type { MenuItemDTO } from '@/domain/menu'
import type { ThemePreset } from '@/domain/theme'
import { formatPriceBRL } from '@/lib/format'
import { publicMediaUrl } from '@/lib/media-url'

export function MenuItem({
  item,
  layout,
}: {
  item: MenuItemDTO
  layout: ThemePreset['layout']
}) {
  // A primeira imagem é a miniatura. Vídeo entra pela capa, nunca tocando
  // sozinho: som e dados móveis numa mesa de restaurante são agressão.
  const first = item.media[0]
  const thumb = first
    ? first.kind === 'image'
      ? publicMediaUrl('image', first.storagePath)
      : first.posterPath
        ? publicMediaUrl('image', first.posterPath)
        : null
    : null

  // O teste de `thumb !== null` fica em cada uso, e não numa constante
  // booleana. O TypeScript não estreita `thumb` a partir de um booleano
  // guardado numa variável — `src={thumb}` reclamaria de `string | null`.
  const podeFoto = thumb !== null && layout !== 'sem-foto'
  const photoSize = layout === 'foto-grande' || layout === 'cartao' ? 'h-[70px] w-[70px]' : 'h-[52px] w-[52px]'

  return (
    <li className="menu-item flex items-center gap-3 py-3">
      {podeFoto && thumb !== null && layout !== 'foto-pequena' ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb} alt="" className={`menu-photo shrink-0 ${photoSize}`} />
      ) : null}

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="menu-display text-[0.9375rem] font-semibold">
            {item.name}
            {item.isAvailable ? null : (
              <span className="menu-muted ml-2 text-xs font-normal">esgotado</span>
            )}
          </h3>
          {item.variants.length === 0 ? (
            <span className="menu-accent shrink-0 text-[0.9375rem] font-semibold">
              {formatPriceBRL(item.basePriceCents)}
            </span>
          ) : null}
        </div>

        {item.description ? (
          <p className="menu-item-description menu-muted mt-1 text-[0.8125rem] leading-snug">
            {item.description}
          </p>
        ) : null}

        {item.variants.length > 0 ? (
          <ul className="mt-2 space-y-1">
            {item.variants.map((variant) => (
              <li key={variant.id} className="flex items-baseline justify-between gap-3 text-[0.8125rem]">
                <span className="menu-muted">
                  {variant.name}
                  {variant.isAvailable ? null : ' · esgotado'}
                </span>
                <span className="menu-accent font-semibold">
                  {formatPriceBRL(variant.priceCents)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {podeFoto && thumb !== null && layout === 'foto-pequena' ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb} alt="" className={`menu-photo shrink-0 ${photoSize}`} />
      ) : null}
    </li>
  )
}
```

- [x] **Passo 5: Escrever a categoria**

`src/components/cardapio-publico/menu-category.tsx`:

```tsx
import type { MenuCategoryDTO } from '@/domain/menu'
import type { ThemePreset } from '@/domain/theme'
import { MenuItem } from './menu-item'

export function MenuCategory({
  category,
  layout,
}: {
  category: MenuCategoryDTO
  layout: ThemePreset['layout']
}) {
  return (
    <section className="pt-8">
      <h2 className="menu-display menu-accent text-xs font-bold uppercase tracking-[0.18em]">
        {category.name}
      </h2>
      {category.description ? (
        <p className="menu-muted mt-1 text-[0.8125rem]">{category.description}</p>
      ) : null}

      <ul className="menu-line mt-2 divide-y" style={{ borderColor: 'var(--m-line)' }}>
        {category.items.map((item) => (
          <MenuItem key={item.id} item={item} layout={layout} />
        ))}
      </ul>
    </section>
  )
}
```

**Nota:** `divide-y` do Tailwind usa `border-color` herdada; o `style` explícito garante a cor do tema mesmo se a herança falhar por ordem de cascata.

- [x] **Passo 6: Substituir a página**

`src/app/(site)/[slug]/page.tsx`, conteúdo inteiro:

```tsx
import { notFound } from 'next/navigation'
import { MenuCategory } from '@/components/cardapio-publico/menu-category'
import { MenuHeader } from '@/components/cardapio-publico/menu-header'
import { Stagger } from '@/components/motion/reveal'
import { ALL_THEME_FONT_VARIABLES } from '@/lib/fonts'
import { resolveTheme } from '@/lib/theme/resolve'
import { getPublicMenu } from '@/server/dal/menu'
import './theme.css'

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const menu = await getPublicMenu(slug)

  // Restaurante inexistente, em rascunho, suspenso ou removido caem todos
  // aqui. A resposta é a mesma para não revelar que o restaurante existe.
  if (!menu) notFound()

  const theme = resolveTheme(menu.restaurant.theme)

  return (
    <>
      {/* As variáveis das duas faces entram por uma folha de estilo
          embutida, e não por `style` no elemento, porque `style` não
          consegue expressar uma media query. A face escura só vale quando o
          aparelho do cliente pede escuro. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            [data-menu="${theme.presetId}"]{${toCss(theme.styleLight)}}
            @media (prefers-color-scheme: dark){
              [data-menu="${theme.presetId}"]{${toCss(theme.styleDark)}}
            }
          `,
        }}
      />
      <div
        data-menu={theme.presetId}
        data-layout={theme.layout}
        data-density={theme.density}
        className={`menu ${ALL_THEME_FONT_VARIABLES}`}
      >
        <MenuHeader
          name={menu.restaurant.name}
          description={menu.restaurant.description}
          logoPath={menu.restaurant.logoPath}
          coverPath={menu.restaurant.coverPath}
          contact={menu.restaurant.contact}
        />

        <main className="mx-auto w-full max-w-[560px] px-5 pb-16">
          <Stagger>
            {menu.categories.map((category) => (
              <MenuCategory key={category.id} category={category} layout={theme.layout} />
            ))}
          </Stagger>
        </main>
      </div>
    </>
  )
}

// Os valores são cores em hexadecimal, comprimentos e nomes de variável de
// fonte — todos já validados pelo themeSchema e pelo isBaseInRange antes de
// chegarem aqui. Nada vindo direto do cliente entra nesta string.
function toCss(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([name, value]) => `${name}:${value}`)
    .join(';')
}
```

- [x] **Passo 7: Verificar**

Rodar:

```bash
pnpm exec tsc --noEmit
```

Esperado: nenhuma saída de erro.

No navegador, com `pnpm dev`, abrir `localhost:3000/{slug}` de um restaurante ativo. Confirmar: a capa aparece, o nome usa a serifada do tema padrão (Grão), os preços aparecem à direita, as categorias entram em cascata curta.

**Ao terminar:** listar os arquivos alterados. Não commitar.

---

## Tarefa 9: Verificação de ponta a ponta

Nenhum código novo. Esta tarefa só produz evidência.

- [x] **Passo 1: Compilar para produção**

Rodar:

```bash
pnpm build
```

Esperado: build concluído, sem erro. Conferir na saída que `/[slug]` aparece como rota **dinâmica**, e não estática — ela depende de dados do banco a cada requisição.

- [x] **Passo 2: Percorrer os oito temas**

No SQL Editor do **projeto na nuvem** — não no Postgres em Docker, que não tem o dado que a aplicação gravou:

```sql
update public.restaurants
   set theme = jsonb_build_object('preset', 'brasa', 'density', 'confortavel')
 where slug = '<o slug do restaurante de prova>';
```

Recarregar `localhost:3000/{slug}` e conferir. Repetir trocando `'brasa'` por `forno`, `grao`, `sal`, `horta`, `neon`, `nori` e `confeito`.

Em cada um, conferir três coisas:
1. A **fonte mudou** — não basta a cor mudar. Se todos os oito parecerem Inter, as fontes não estão sendo aplicadas e a Tarefa 6 precisa voltar.
2. O **preço é legível** sobre o fundo.
3. Em `confeito`, o item é um **cartão** com sombra, e não uma linha.

- [x] **Passo 3: Provar que só as fontes usadas descem**

Com o cardápio aberto no tema `brasa`, abrir a aba de rede do navegador, filtrar por `font`, e recarregar.

Esperado: **no máximo duas ou três** famílias baixadas (Anton, Inter e a fallback do sistema). Se as nove aparecerem, `preload: false` não está valendo, e o celular do cliente está baixando dois megabytes de fonte para usar uma.

- [x] **Passo 4: Provar a face escura**

Com o cardápio aberto, alternar o modo escuro do sistema operacional (ou, no DevTools, `Rendering` → `Emulate prefers-color-scheme: dark`).

Esperado: o fundo muda e o texto continua legível, nos oito temas. Em `brasa` e `neon`, que já são escuros, a mudança é sutil — isso é esperado.

- [x] **Passo 5: Provar a recusa de cor fora da faixa**

No SQL Editor do projeto na nuvem:

```sql
update public.restaurants
   set theme = jsonb_build_object('preset', 'brasa', 'base', '#ffffff')
 where slug = '<o slug do restaurante de prova>';
```

Esperado: o cardápio continua **escuro**. O branco foi recusado pela faixa do Brasa e o padrão do preset prevaleceu. Se a tela ficar branca com texto claro por cima, a faixa não está sendo aplicada — volte à Tarefa 7.

- [x] **Passo 6: Provar que dado ruim não derruba a página**

```sql
update public.restaurants
   set theme = '{"preset":"tema-que-nao-existe","base":"azul","density":42}'::jsonb
 where slug = '<o slug do restaurante de prova>';
```

Esperado: a página **carrega**, no tema Grão, sem erro no console. Um `500` aqui significa que o `catch` do `themeSchema` não está fazendo o trabalho dele.

Ao terminar, restaurar o tema que o restaurante de prova deve ter.

- [x] **Passo 7: Percorrer no celular**

Abrir o cardápio num celular de verdade, na mesma rede. Conferir:
- Nenhuma rolagem horizontal, em nenhum dos oito temas.
- Os links de contato têm alvo de toque confortável.
- O texto de descrição é legível sem aproximar.

- [ ] **Passo 8: Relatar**

Listar, para cada passo: o comando rodado, a saída obtida e se corresponde ao esperado. Passo com resultado diferente do esperado é passo **não** concluído — não marcar a caixa.

---

## Cobertura da spec

| Seção da spec | Onde é implementada |
|---|---|
| §8.1 O que cai da Fase 1 | Tarefas 1 e 4 |
| §8.2 Fundação | Tarefas 1, 2 e 3 |
| §8.3 As três superfícies | Tarefa 4 |
| §8.4 Os oito temas | Tarefa 6 |
| §8.5 As duas cores do dono | Tarefas 5, 6 e 7 |
| §8.6 Densidade | Tarefas 6, 7 e 8 (passo 2) |
| §9.3 Cardápio público | Tarefa 8 |
| §11 `theme.preset` desconhecido cai no padrão | Tarefa 7, provado na Tarefa 9 passo 6 |
| §13 Verificação | Tarefa 9 |

**Fora deste plano, de propósito:** §3 modelo de dados, §4 autorização, §5 fluxo, §6 criação atômica, §7 endereço automático, §9.1 console e §9.2 painel. Esses são os planos B e C.
