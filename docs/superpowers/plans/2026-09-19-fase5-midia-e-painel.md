# Fase 5 — Pipeline de mídia e repaginação do painel: plano de implementação

> **Para quem executa:** SUB-SKILL OBRIGATÓRIA: use `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` para executar este plano tarefa a tarefa. Os passos usam caixas (`- [ ]`) para acompanhamento.

**Objetivo:** tirar o envio de mídia do modelo "sobe na hora, sem comprimir, um tipo por vez", tornar o trilho do cardápio colapsável, e repaginar painel e console sobre os primitivos que já existem no repositório e nunca foram usados.

**Arquitetura:** a mídia passa a viver em blob no navegador até o dono confirmar, e é comprimida no caminho — imagem por canvas, vídeo por WebCodecs com demultiplexador e multiplexador carregados sob demanda. A repaginação não inventa linguagem visual: ela adota `card`, `sidebar`, `progress`, `alert`, `avatar`, `attachment` e `breadcrumb`, que estão no projeto desde a Fase 1 e nunca foram importados por nenhuma tela.

**Pilha:** Next 16.3.5 (App Router), React 19.2.8, Tailwind v4, shadcn sobre Base UI, Supabase, WebCodecs, `mp4box.js`, `mp4-muxer`.

**Spec:** `docs/superpowers/specs/2026-09-19-fase5-midia-e-painel-design.md`

## Restrições globais

Valem para **todas** as tarefas.

- **Nada de git.** Não rodar `add`, `commit`, `push` ou `branch`. Cada tarefa termina listando os arquivos alterados, e só.
- **Nada de Docker.** Não existe banco de prova local. Existe o projeto na nuvem, e conferência por consulta REST com a chave anônima.
- **Sem testes automatizados.** Cada tarefa termina com um comando de verificação cujo resultado é conferido e reportado.
- **A verificação de código é `pnpm exec tsc --noEmit`.** Lint não é portão.
- **As provas de lógica rodam com `pnpm exec tsx <arquivo>`**, e o arquivo vai no **diretório temporário da sessão**, nunca no projeto. Exceção herdada da Fase 4: `scripts/verificar-contraste.ts` fica no projeto, porque é guarda de regressão.
- **Antes de escrever código, ler o guia pertinente em `node_modules/next/dist/docs/`.**
- **Composição usa `render`, nunca `asChild`.** E **link não passa pelo `render` do Button** — `button.md:150`. Link com cara de botão usa `<Link className={buttonVariants({ variant, size })}>`.
- **`cn` vem do pacote `cn`**, não de `@/lib/utils`.
- **Componente de cliente nunca importa `@/server/dal` nem `@/server/security`.** Server actions são a exceção deliberada.
- **`@/lib/color` não importa nada de `@/server`.**
- **Server action chamada de manipulador de evento vai dentro de `startTransition`.**
- **Rotas em `href` e `redirect` são externas**; `revalidatePath` recebe o **destino** (`@/server/revalidate`).
- **Português do Brasil** em toda a interface e em toda mensagem de erro.
- **Preço em centavos inteiros.**
- **Alvo de toque mínimo de 44px**, e cor nunca como único portador de significado.
- **Antes de concluir qualquer coisa sobre animação, rolagem ou evento de scroll no painel do navegador**, conferir `document.hidden` e contar quadros com `requestAnimationFrame`. A Fase 4 produziu um diagnóstico falso por não fazer isso.

## Valores que o plano inteiro usa

Copiados da spec. Qualquer tarefa que precise de um número usa **estes**:

| Grandeza | Valor |
|---|---|
| Mídias por item | **6**, qualquer mistura |
| Imagem: qualidade | WebP **0.86** |
| Imagem: maior lado | **1920px**, sem ampliar |
| Imagem: teto de peso | **5MB**, sobre a comprimida |
| Vídeo: maior lado | **1280px**, sem ampliar |
| Vídeo: bitrate alvo | **2,5 Mbps** |
| Vídeo: quadro-chave | a cada **2s** |
| Vídeo: teto de peso | **10MB**, sobre o comprimido |
| Vídeo: duração | **15s** |
| Vídeo: áudio | **descartado** |
| Escalonamento do trilho | **40ms** por chip, deslocamento de **8px** |
| Movimento | entrada 160–220ms, troca de estado 120ms, curva `cubic-bezier(0.16, 1, 0.3, 1)` |

## Desvios registrados na execução

Emendados aqui, no lugar. Tudo abaixo foi medido, não suposto.

**Duas afirmações minhas que estavam ERRADAS, e que o código desmentiu:**

1. **`ItemRow` já mostrava miniatura.** A spec (§7.1) e o plano (Tarefa 13,
   passo 1) diziam que não mostrava mídia nenhuma. Falso — ela existe desde a
   Fase 2. Eu afirmei sem conferir. O que de fato faltava ali era o **ponto
   focal**: o recorte era cego, o mesmo defeito que a Fase 4 consertou no
   feed. E a miniatura pegava a primeira IMAGEM, não a primeira TELA — se o
   dono põe o vídeo na frente, a lista mostrava outra coisa que o cliente.
   As duas foram corrigidas.
2. **`InviteDialog` já copiava com retorno**, inclusive com tratamento de
   falha e aviso. O plano (Tarefa 15, passo 1) dizia que o administrador
   copiava às cegas. Falso. **Nenhuma mudança foi feita ali.**

**Decisões tomadas durante a execução:**

3. **`mediabunny` no lugar de `mp4box` + `mp4-muxer`.** Ao instalar, o
   `mp4-muxer` veio **DEPRECADO** — "superseded by Mediabunny". Construir
   código novo sobre pacote abandonado seria dívida no dia um. O `mediabunny`
   é do mesmo autor, é mantido, é TypeScript puro sem wasm (compatível com a
   CSP) e substitui os DOIS por um, com uma API de alto nível — `Conversion` —
   que faz demux, transcode e mux numa chamada. As três partes que o plano
   avisava que falhariam em silêncio (description do decodificador, filas,
   fechamento de `VideoFrame`) deixaram de ser problema nosso.
4. **`quality: QUALITY_HIGH` no lugar de `bitrate: 2_500_000`.** A própria
   biblioteca marcou `bitrate` como obsoleto, e a escala relativa se adapta à
   resolução em vez de fixar um número que fica errado num vídeo menor.
5. **Onde o shell é montado.** O plano dizia "casca no layout do painel". Não
   dá: `painel/layout.tsx` envolve `/entrar`, `/convite` e as telas de
   restaurante, e montar `SidebarProvider` lá aninharia dois provedores — um
   recolhendo o outro. Cada contexto monta a própria casca: a lista em
   `restaurantes/page.tsx`, o restaurante em `restaurantes/[id]/layout.tsx`,
   o console em `admin/layout.tsx`. O layout do painel ficou só com o
   marcador de território.
6. **`Alert` só nas telas de entrada.** O plano mandava trocar todo parágrafo
   vermelho solto. Dentro de DIÁLOGO isso vira caixa com borda dentro de
   caixa com borda, que contraria a regra de "menos borda, mais superfície"
   da própria fase. Os de diálogo ficaram como linha compacta, que já tem
   `role="alert"`.
7. **`Tarefa 9` sem `AttachmentGroup`:** logo e capa usam o dropzone, mas
   continuam com a pré-visualização própria — elas são uma imagem cada, e uma
   faixa rolável para um item só é ruído.

## Mapa de arquivos

**Criados**

| Arquivo | Responsabilidade |
|---|---|
| `src/lib/media/comprimir-imagem.ts` | canvas → WebP, com a regra de não piorar |
| `src/lib/media/comprimir-video.ts` | WebCodecs; carrega demux/mux sob demanda |
| `src/lib/media/tipos.ts` | `MidiaPendente`, `ResultadoCompressao` |
| `src/components/cardapio/media-dropzone.tsx` | área de envio: arrastar, colar, clicar |
| `src/components/cardapio/media-item.tsx` | uma mídia na lista, gravada ou pendente |
| `src/components/shell/app-sidebar.tsx` | a navegação lateral dos dois territórios |
| `src/components/shell/app-shell.tsx` | provider + inset + topo com breadcrumb |
| `src/components/shell/copiavel.tsx` | texto com botão de copiar e retorno visível |
| `src/app/painel/restaurantes/[id]/identidade/loading.tsx` | esqueleto próprio |
| `src/app/painel/restaurantes/[id]/contato/loading.tsx` | idem |
| `src/app/painel/restaurantes/[id]/equipe/loading.tsx` | idem |
| `src/app/painel/restaurantes/loading.tsx` | idem |

**Modificados**

| Arquivo | O que muda |
|---|---|
| `src/app/globals.css` | `shimmer`, `scroll-fade-x`, `scrollbar-none`, escala de espaço, curva, `--heading-face` |
| `src/domain/media.ts` | `MAX_MIDIAS_POR_ITEM`; tetos por tipo saem |
| `src/server/dal/media.ts` | teto único; `width`/`height` gravados |
| `src/components/cardapio/media-editor.tsx` | reescrito sobre staging |
| `src/components/cardapio/item-edit-dialog.tsx` | confirma as pendentes ao salvar |
| `src/components/cardapio/item-create-dialog.tsx` | ganha o editor em modo sem id |
| `src/components/cardapio/item-row.tsx` | miniatura da primeira mídia |
| `src/components/cardapio/category-section.tsx` | vira seção com cabeçalho |
| `src/components/painel/brand-images.tsx` | dropzone + compressão, sem staging |
| `src/components/painel/publish-bar.tsx` | vira card de estado |
| `src/components/cardapio-publico/menu-rail.tsx` | colapsável |
| `src/components/cardapio-publico/menu-cover.tsx` | ícones nos contatos |
| `src/components/cardapio-publico/menu-media.tsx` | usa `width`/`height` quando existem |
| `src/components/cardapio-publico/theme.css` | máscara do trilho, escalonamento |
| `src/components/auth/auth-shell.tsx` | pede a serifada explicitamente |
| `src/app/painel/layout.tsx`, `src/app/admin/layout.tsx` | adotam o shell |
| as 17 telas | adotam `card`, `alert`, `avatar`, `progress` |

**Removidos**

`src/components/shell/top-bar.tsx` e `src/components/shell/territory-nav.tsx`, na Tarefa 3, quando o shell novo estiver de pé.

---

# Bloco A — Fundação visual

## Tarefa 1: As classes que faltam, a escala de espaço e a curva

**Arquivos:**
- Modificar: `src/app/globals.css`

**Interfaces:**
- Produz: as classes `shimmer`, `scroll-fade-x`, `scrollbar-none`; os tokens `--space-1..8` e `--curva`.

- [ ] **Passo 1: conferir que elas realmente não existem**

```bash
grep -rn "shimmer\|scroll-fade-x\|scrollbar-none" src/app/globals.css node_modules/shadcn/tailwind.css
```

Esperado: nenhuma linha. `attachment.tsx` usa as três e nenhuma está definida — é por isso que o estado de "enviando" dele não anima.

- [ ] **Passo 2: escrever as três**

No fim de `src/app/globals.css`, fora de `@layer` — elas precisam vencer utilitário:

```css
/* As três classes abaixo são exigidas por `components/ui/attachment.tsx`,
   que veio do shadcn sem elas. Sem estas definições o componente renderiza,
   mas o estado de "enviando" não anima e a faixa mostra barra de rolagem. */

/* Brilho que atravessa o texto enquanto algo está em curso. Aplicado ao
   TÍTULO do anexo, não ao contêiner: o movimento fica onde o olho já está. */
@keyframes shimmer-passagem {
  from {
    background-position: 200% 0;
  }
  to {
    background-position: -200% 0;
  }
}

.shimmer {
  background-image: linear-gradient(
    90deg,
    var(--muted-foreground) 0%,
    var(--foreground) 45%,
    var(--muted-foreground) 90%
  );
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: shimmer-passagem 1.6s linear infinite;
}

/* Esmaecimento nas pontas de um rolador horizontal. A `mask-image` some com
   o conteúdo em vez de cortá-lo numa borda reta, e de quebra avisa que há
   mais para o lado — coisa que uma borda dura não diz. */
.scroll-fade-x {
  -webkit-mask-image: linear-gradient(
    to right,
    transparent 0,
    black 12px,
    black calc(100% - 12px),
    transparent 100%
  );
  mask-image: linear-gradient(
    to right,
    transparent 0,
    black 12px,
    black calc(100% - 12px),
    transparent 100%
  );
}

.scrollbar-none {
  scrollbar-width: none;
}
.scrollbar-none::-webkit-scrollbar {
  display: none;
}

/* Quem pediu menos movimento recebe o texto parado, e não um brilho lento. */
@media (prefers-reduced-motion: reduce) {
  .shimmer {
    animation: none;
    background-image: none;
    color: var(--muted-foreground);
    -webkit-background-clip: border-box;
    background-clip: border-box;
  }
}
```

- [ ] **Passo 3: a escala de espaço e a curva**

Dentro do `@theme inline` que já existe:

```css
  /* Ritmo declarado, base 4px. Existe porque hoje cada tela escolhe o
     próprio espaçamento — py-8 aqui, p-4 ali, gap-3 acolá — e é essa
     variação miúda que faz o painel parecer montado por partes. */
  --spacing-1: 0.25rem;
  --spacing-2: 0.5rem;
  --spacing-3: 0.75rem;
  --spacing-4: 1rem;
  --spacing-5: 1.5rem;
  --spacing-6: 2rem;
  --spacing-7: 3rem;
  --spacing-8: 4rem;

  /* Uma curva só no produto. É a expo-out que `Reveal` já usa desde a Fase
     3A: arranca rápido e freia longo, o que faz o movimento parecer resposta
     do sistema e não enfeite. */
  --ease-saida: cubic-bezier(0.16, 1, 0.3, 1);
```

- [ ] **Passo 4: conferir no navegador**

Subir o app e, no console do painel do navegador:

```js
getComputedStyle(document.documentElement).getPropertyValue('--ease-saida')
```

Esperado: `cubic-bezier(0.16, 1, 0.3, 1)`.

- [ ] **Passo 5: conferir o código**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Passo 6: relatar**

Arquivos alterados: `src/app/globals.css`. Nada de git.

---

## Tarefa 2: A serifada volta a ser só do título de página

**Arquivos:**
- Modificar: `src/app/globals.css` — o bloco `.territorio-painel`
- Modificar: `src/components/auth/auth-shell.tsx`

**Esta é a mudança de maior alcance visual da fase, e a mais fácil de passar despercebida:** ela troca a fonte de **todo** `CardTitle`, `DialogTitle`, `SheetTitle` e `EmptyTitle` do painel **sem tocar em nenhum desses arquivos**.

**Interfaces:**
- Consome: `--font-display` e `--font-heading`, que já existem.
- Produz: nada. É troca de token.

- [ ] **Passo 1: entender o que se está desfazendo**

```bash
grep -n -B 4 -A 4 "territorio-painel" src/app/globals.css
```

O bloco atual aponta `--heading-face` para a serifada, com o comentário da Fase 3A explicando a intenção: "o painel ganha a serifada em todo título". A Fase 5 reverte isso — quando todo título é serifado, nenhum tem peso.

- [ ] **Passo 2: trocar o bloco**

```css
  /* A Fase 3A apontava `--heading-face` para a serifada aqui, o que levava a
     Fraunces a todo Card, Dialog, Sheet e Empty do painel. A intenção era
     coesão; o efeito foi banalizar a face.
     
     A Fase 5 reverte: a serifada é pedida EXPLICITAMENTE por quem a quer, e
     quem a quer é o título de página — via `font-display`. O resto do painel
     fica na Inter, que é o que carrega texto de interface melhor.
     
     A classe continua existindo porque o shell a usa para o território, e
     porque ela é o lugar certo caso o painel volte a precisar de um token
     próprio. */
  .territorio-painel {
    --heading-face: var(--font-sans), ui-sans-serif, system-ui, sans-serif;
  }
```

- [ ] **Passo 3: devolver a serifada a quem é título de página**

Em `src/components/auth/auth-shell.tsx`, o `<h1>` usa `font-heading`. Ele **é** título de página — e é a primeira tela que o dono vê:

```tsx
          <h1 className="font-display text-display font-semibold leading-tight tracking-[-0.01em]">
```

O comentário acima dele, que explica a herança por território, passa a dizer: a face é pedida direto porque esta casca serve os dois territórios e, nos dois, isto é título de página.

- [ ] **Passo 4: varrer quem mais é título de página**

```bash
grep -rn "font-heading" src/ --include="*.tsx"
```

Cada ocorrência é uma decisão: título de página vira `font-display`; título de cartão, diálogo ou vazio **fica** em `font-heading`, que agora é Inter. Anotar no relatório quantas de cada.

- [ ] **Passo 5: conferir o código**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Passo 6: conferir tela a tela**

Esta é a parte que não dá para pular. Abrir, no painel: entrar, lista de restaurantes, cardápio, identidade, contato, equipe, começar; e no console: entrar, convites, restaurantes, detalhe. Em cada uma, confirmar que **o título de página é serifado e o resto não é**.

Anexar captura da tela de entrar e de uma com diálogo aberto.

- [ ] **Passo 7: relatar**

Arquivos alterados: `src/app/globals.css`, `src/components/auth/auth-shell.tsx`, mais os que o passo 4 apontar. Nada de git.

---

## Tarefa 3: O shell com navegação lateral

**Arquivos:**
- Criar: `src/components/shell/app-sidebar.tsx`, `src/components/shell/app-shell.tsx`
- Modificar: `src/app/painel/layout.tsx`, `src/app/admin/layout.tsx`, `src/app/painel/restaurantes/[id]/layout.tsx`
- Remover: `src/components/shell/top-bar.tsx`, `src/components/shell/territory-nav.tsx`

**O primitivo já resolve o celular.** `src/components/ui/sidebar.tsx` usa `useIsMobile` e cai num `Sheet` internamente. **`drawer` não entra.**

**Interfaces:**
- Consome: `SidebarProvider`, `Sidebar`, `SidebarHeader`, `SidebarContent`, `SidebarGroup`, `SidebarGroupLabel`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton`, `SidebarFooter`, `SidebarInset`, `SidebarTrigger` de `@/components/ui/sidebar`; `Breadcrumb*` de `@/components/ui/breadcrumb`.
- Produz:
  - `<AppSidebar territorio={'painel' | 'admin'} email={string | null} itens={ItemNav[]} rodape?={ReactNode} />`
  - `<AppShell sidebar={ReactNode} trilha={Trilha[]} acoes?={ReactNode}>{children}</AppShell>`
  - `type ItemNav = { href: string; label: string; icone: ReactNode }`
  - `type Trilha = { label: string; href?: string }` — sem `href` é a página atual.

- [ ] **Passo 1: ler a API do primitivo antes de montar**

```bash
grep -n "^function Sidebar\|^function useSidebar" src/components/ui/sidebar.tsx
```

Conferir, no arquivo local, as props de `Sidebar` (`side`, `variant`, `collapsible`) e o que `SidebarMenuButton` aceita (`isActive`, `render`). Não copiar exemplo da doc pública do shadcn: este é sobre Base UI.

- [ ] **Passo 2: a navegação lateral**

Criar `src/components/shell/app-sidebar.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

export type ItemNav = { href: string; label: string; icone: React.ReactNode }

// A navegação dos DOIS territórios. Eles não diferem em casca — diferem em
// conteúdo, que é o que a Fase 3 quis dizer com "o console é mais sóbrio".
// Duas cascas para dizer a mesma coisa era o que fazia o painel parecer
// montado por partes.
export function AppSidebar({
  titulo,
  itens,
  rodape,
}: {
  titulo: string
  itens: ItemNav[]
  rodape?: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-4">
        <span className="font-display text-section font-semibold">
          {titulo}
        </span>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Gerenciar</SidebarGroupLabel>
          <SidebarMenu>
            {itens.map((item) => (
              <SidebarMenuItem key={item.href}>
                {/* O pathname que o cliente enxerga JÁ vem reescrito pelo
                    proxy, com o prefixo do território. Comparar com o caminho
                    externo exige olhar o fim, não a igualdade. */}
                <SidebarMenuButton
                  isActive={pathname.endsWith(item.href)}
                  render={<Link href={item.href} />}
                >
                  {item.icone}
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      {rodape ? <SidebarFooter className="p-3">{rodape}</SidebarFooter> : null}
    </Sidebar>
  )
}
```

- [ ] **Passo 3: a casca**

Criar `src/components/shell/app-shell.tsx`:

```tsx
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'

export type Trilha = { label: string; href?: string }

// O topo perdeu a navegação e ficou com CONTEXTO e AÇÕES. É a divisão que
// faz uma tela profunda parar de parecer uma página solta: a lateral diz
// onde se pode ir, a trilha diz onde se está.
export function AppShell({
  sidebar,
  trilha,
  acoes,
  children,
}: {
  sidebar: React.ReactNode
  trilha: Trilha[]
  acoes?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      {sidebar}
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border/70 bg-background/85 px-4 supports-[backdrop-filter]:bg-background/70 supports-[backdrop-filter]:backdrop-blur-md">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-5" />

          <Breadcrumb>
            <BreadcrumbList>
              {trilha.map((passo, indice) => (
                <React.Fragment key={passo.label}>
                  {indice > 0 ? <BreadcrumbSeparator /> : null}
                  <BreadcrumbItem>
                    {passo.href ? (
                      <BreadcrumbLink href={passo.href}>
                        {passo.label}
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage>{passo.label}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>

          {acoes ? <div className="ml-auto flex items-center gap-2">{acoes}</div> : null}
        </header>

        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
```

Importar `React` no topo para o `React.Fragment`.

- [ ] **Passo 4: ligar no painel**

`src/app/painel/layout.tsx` monta `AppShell` com `AppSidebar` quando há usuário, e segue sem casca quando não há — ele também envolve `/entrar` e `/convite/{token}`, que precisam ser alcançáveis sem sessão. O `ThemeToggle` e o `SignOutButton` vão para o `rodape` da lateral.

A classe `territorio-painel` permanece no elemento externo.

- [ ] **Passo 5: ligar no restaurante e no console**

`src/app/painel/restaurantes/[id]/layout.tsx` deixa de renderizar `TerritoryNav` e passa a alimentar os itens da lateral — Cardápio, Identidade, Contato, Equipe —, com a mesma regra de papel que já existe: quem não é administrador vê só Cardápio.

`src/app/admin/layout.tsx` faz o mesmo com Convites e Restaurantes.

- [ ] **Passo 6: remover as duas barras**

```bash
grep -rn "TopBar\|TerritoryNav" src/
```

Esperado depois de ajustar: nenhuma linha fora dos próprios arquivos. Então remover `src/components/shell/top-bar.tsx` e `src/components/shell/territory-nav.tsx`.

- [ ] **Passo 7: conferir o código**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Passo 8: conferir nos dois tamanhos**

Desktop: a lateral aparece, o item ativo está marcado, recolher e expandir funciona. Celular (375px): a lateral vira folha, o gatilho abre, e tocar num item fecha.

**Conferir `document.hidden` e contar quadros antes de concluir qualquer coisa sobre a animação de abrir.**

Anexar captura dos dois tamanhos.

- [ ] **Passo 9: relatar**

Arquivos alterados: dois criados, três layouts, dois removidos. Nada de git.

---

# Bloco B — O pipeline de mídia

## Tarefa 4: Compressão de imagem

**Arquivos:**
- Criar: `src/lib/media/tipos.ts`, `src/lib/media/comprimir-imagem.ts`
- Prova: `<temp da sessão>/prova-compressao.md` (roteiro de navegador, não script — canvas não existe no Node)

**Interfaces:**
- Produz:
  - `type ResultadoCompressao = { blob: Blob; largura: number; altura: number; comprimiu: boolean }`
  - `comprimirImagem(arquivo: File): Promise<ResultadoCompressao>`

- [ ] **Passo 1: os tipos**

Criar `src/lib/media/tipos.ts`:

```ts
// `comprimiu: false` significa que o ORIGINAL está voltando, e não que algo
// falhou. Acontece quando a compressão sairia maior — PNG pequeno, foto já
// otimizada — e comprimir para piorar é o defeito clássico deste tipo de
// código.
export type ResultadoCompressao = {
  blob: Blob
  largura: number
  altura: number
  comprimiu: boolean
}

export type EstadoMidia =
  | 'pendente'
  | 'comprimindo'
  | 'enviando'
  | 'erro'
  | 'pronta'

// Uma mídia escolhida e ainda NÃO gravada. Ela vive no navegador até o dono
// confirmar. `idLocal` é do navegador, não do banco: a linha do banco só
// existe depois do envio.
export type MidiaPendente = {
  idLocal: string
  arquivo: File
  previewUrl: string
  kind: 'image' | 'video'
  estado: EstadoMidia
  progresso: number
  erro?: string
  comprimido?: Blob
  largura?: number
  altura?: number
  duracaoMs?: number
  posterBlob?: Blob
}
```

- [ ] **Passo 2: a compressão**

Criar `src/lib/media/comprimir-imagem.ts`:

```ts
import type { ResultadoCompressao } from './tipos'

const MAIOR_LADO = 1920
const QUALIDADE = 0.86

// Canvas, e não uma biblioteca. O navegador já sabe redimensionar e
// codificar; trazer dependência para isso seria peso no pacote de uma tela
// que o dono abre do celular.
export async function comprimirImagem(
  arquivo: File,
): Promise<ResultadoCompressao> {
  const bitmap = await createImageBitmap(arquivo)

  try {
    // Sem AMPLIAR: `Math.min(1, ...)`. Esticar uma foto pequena para 1920
    // aumentaria o arquivo sem acrescentar um pixel de informação.
    const escala = Math.min(
      1,
      MAIOR_LADO / Math.max(bitmap.width, bitmap.height),
    )
    const largura = Math.round(bitmap.width * escala)
    const altura = Math.round(bitmap.height * escala)

    const original: ResultadoCompressao = {
      blob: arquivo,
      largura: bitmap.width,
      altura: bitmap.height,
      comprimiu: false,
    }

    const canvas = document.createElement('canvas')
    canvas.width = largura
    canvas.height = altura
    const contexto = canvas.getContext('2d')
    if (!contexto) return original

    contexto.drawImage(bitmap, 0, 0, largura, altura)

    // WebP é o PEDIDO, não a promessa: Safari antigo aceita o pedido e
    // devolve PNG calado. Quem chama lê `blob.type` em vez de supor — é a
    // mesma regra que `captureVideoPoster` segue desde a Fase 2.
    const blob = await new Promise<Blob | null>((resolver) => {
      canvas.toBlob((saida) => resolver(saida), 'image/webp', QUALIDADE)
    })

    if (!blob || blob.size >= arquivo.size) return original

    return { blob, largura, altura, comprimiu: true }
  } finally {
    // Sem isto, um dono que escolhe dez fotos segura dez bitmaps
    // descomprimidos na memória do celular.
    bitmap.close()
  }
}
```

- [ ] **Passo 3: conferir o código**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Passo 4: medir**

A prova roda no navegador, porque canvas não existe no Node. Ela acontece de fato na Tarefa 7, quando o dropzone existir. Registrar aqui o que será medido: **para uma foto real, o tamanho antes e depois e as dimensões de saída**. Comprimir sem medir não é comprimir, é torcer.

- [ ] **Passo 5: relatar**

Arquivos criados: `src/lib/media/tipos.ts`, `src/lib/media/comprimir-imagem.ts`. Nada de git.

---

## Tarefa 5: Compressão de vídeo

**Este é o item de maior risco da fase.** A spec o declara como o primeiro a ser cortado (§12). Se ao fim do passo 5 o caminho não fechar, **parar, relatar, e seguir com o fallback** — o resto da fase não depende dele.

**Arquivos:**
- Modificar: `package.json` — duas dependências
- Criar: `src/lib/media/comprimir-video.ts`
- Modificar: `next.config.ts` — nada. **A CSP não muda**: os dois pacotes são JavaScript puro, sem wasm.

**Interfaces:**
- Produz: `comprimirVideo(arquivo: File, aoProgredir: (pct: number) => void): Promise<ResultadoCompressao | null>` — **`null` significa "não deu, suba o original"**, e não erro.

- [ ] **Passo 1: instalar**

```bash
pnpm add mp4box mp4-muxer
```

- [ ] **Passo 2: confirmar o suporte antes de escrever**

No console do navegador, com o app rodando:

```js
({
  encoder: typeof VideoEncoder !== 'undefined',
  h264: await VideoEncoder.isConfigSupported({codec:'avc1.42001f',width:720,height:1280,bitrate:2500000}).then(r=>r.supported),
})
```

Esperado: `true` nos dois. Foi o que a sondagem da fase mediu.

- [ ] **Passo 3: escrever o compressor**

Criar `src/lib/media/comprimir-video.ts`:

```ts
import type { ResultadoCompressao } from './tipos'

const MAIOR_LADO = 1280
const BITRATE = 2_500_000
const INTERVALO_CHAVE_S = 2

// WebCodecs trabalha com AMOSTRAS, não com arquivos. Por isso são dois
// pacotes: um para ler o MP4 de entrada e outro para escrever o de saída.
//
// Os dois entram por `import()` DINÂMICO, e só aqui dentro: quem nunca envia
// vídeo nunca baixa os ~110KB. A compressão de imagem não depende de nenhum
// deles — é canvas, que o navegador já tem.
//
// Devolve `null` quando não dá para comprimir. Não é erro: é o caminho de
// fallback da §3.5 da spec, e quem chama sobe o original.
export async function comprimirVideo(
  arquivo: File,
  aoProgredir: (pct: number) => void,
): Promise<ResultadoCompressao | null> {
  // iPhone com Safari anterior ao 17 não tem WebCodecs. Ninguém fica
  // impedido de enviar por causa disso.
  if (typeof VideoEncoder === 'undefined' || typeof VideoDecoder === 'undefined') {
    return null
  }

  // O demultiplexador só lê MP4 e MOV, que é o que celular grava. WebM cai
  // no fallback.
  if (!/(mp4|quicktime)$/.test(arquivo.type)) return null

  try {
    const [{ default: MP4Box }, { Muxer, ArrayBufferTarget }] = await Promise.all([
      import('mp4box'),
      import('mp4-muxer'),
    ])

    // ...o corpo do transcodificador entra aqui, e está detalhado no passo 4.
    // Ele é a única parte da fase que não dá para escrever de olhos fechados.
    return await transcodificar(arquivo, MP4Box, Muxer, ArrayBufferTarget, aoProgredir)
  } catch {
    // Qualquer falha no caminho vira fallback, nunca erro na cara do dono.
    // Ele quer publicar um prato, não depurar um codec.
    return null
  }
}
```

- [ ] **Passo 4: ler a API real do `mp4box` instalado, antes de escrever o corpo**

```bash
D=$(find node_modules/.pnpm -maxdepth 1 -name "mp4box@*" | head -1); grep -n "onReady\|setExtractionOptions\|onSamples\|appendBuffer\|fileStart\|avcC" "$D/node_modules/mp4box/dist/mp4box.all.d.ts" 2>/dev/null | head -30
```

Se o pacote não trouxer tipos, ler `entry.d.ts` ou o próprio `dist`. **O que precisa sair daqui:** o nome exato do evento de metadados, a forma de `setExtractionOptions`, o formato das amostras em `onSamples`, e por onde o `avcC` é alcançado.

- [ ] **Passo 5: o transcodificador, com as três partes que exigem cuidado**

**Este é o único passo do plano sem código pronto para colar, e é deliberado.** A API do `mp4box` varia entre versões, e escrever aqui uma chamada que eu não verifiquei seria pior que nomear com precisão onde a coisa quebra. O passo 4 fecha essa lacuna antes de a primeira linha ser escrita.

O corpo tem três pontos que falham **em silêncio**, e é neles que a atenção vai:

**a) A configuração do decodificador precisa da `description`.** H.264 em MP4 guarda os parâmetros de sequência num box `avcC`; sem passá-lo, `VideoDecoder.configure` aceita e depois falha ao decodificar o primeiro quadro. O `mp4box` expõe isso em `trak.mdia.minf.stbl.stsd.entries[0].avcC` — é preciso serializá-lo para `Uint8Array`.

**b) Encoder e decoder têm fila.** `decoder.decode()` não devolve quadro; ele chama `output`. Encadear decodificação e codificação sem esperar `decoder.flush()` e `encoder.flush()` produz arquivo truncado, e o sintoma é um vídeo que toca os dois primeiros segundos.

**c) O `VideoFrame` precisa ser fechado.** Cada quadro não fechado segura memória de GPU; num vídeo de 15s a 30fps são 450 quadros, e o navegador mata a aba antes do fim.

O redimensionamento vai na própria configuração do encoder (`width`/`height` alvo), sem canvas intermediário — o encoder escala.

Parâmetros: `codec: 'avc1.42001f'`, `bitrate: 2_500_000`, `framerate` lido da entrada, e `keyFrameEvery` correspondente a 2 segundos.

`aoProgredir` é chamado com `amostrasProcessadas / totalDeAmostras * 100`.

Ao fim, o alvo do multiplexador vira `new Blob([target.buffer], { type: 'video/mp4' })`.

- [ ] **Passo 6: medir com arquivo real — e o portão de desistência**

Com o dropzone da Tarefa 7 de pé, enviar um vídeo real de celular e registrar:

| | |
|---|---|
| Tamanho antes | ? |
| Tamanho depois | ? |
| Dimensões de saída | ? |
| Tempo de compressão | ? |
| O vídeo toca inteiro no cardápio | sim / não |

**Se o vídeo sair truncado, sem tocar, ou maior que o original**, e a causa não estiver entre os três pontos do passo 4: **parar aqui**. Relatar, e mudar `comprimirVideo` para devolver `null` sempre. O fallback vira o comportamento normal, o teto de 10MB segue protegendo, e a fase continua inteira — é exatamente o corte que a §12 da spec previu.

- [ ] **Passo 7: relatar**

Arquivos: `package.json`, `src/lib/media/comprimir-video.ts`. Anexar a tabela de medição. Nada de git.

---

## Tarefa 6: Teto único de seis telas

**Arquivos:**
- Modificar: `src/domain/media.ts`
- Modificar: `src/server/dal/media.ts` — `registerItemMedia`

**Interfaces:**
- Produz: `MAX_MIDIAS_POR_ITEM = 6`. `MEDIA_LIMITS.image.maxPerItem` e `.video.maxPerItem` **saem**.

- [ ] **Passo 1: o domínio**

Em `src/domain/media.ts`, remover `maxPerItem` dos dois tipos e acrescentar:

```ts
// Teto por ITEM, não por tipo. O dono não pensa em "quantas imagens e
// quantos vídeos"; pensa em "quantas telas tem meu prato" — que é o que o
// cliente rola no feed. Uma regra, um número, uma mensagem de recusa.
//
// Seis telas verticais já é bastante antes de chegar ao próximo prato.
export const MAX_MIDIAS_POR_ITEM = 6
```

- [ ] **Passo 2: o servidor**

Em `registerItemMedia`, o bloco que hoje conta por tipo passa a contar o item inteiro:

```ts
  const todas = siblings ?? []

  if (todas.length >= MAX_MIDIAS_POR_ITEM) {
    // ConflictError, não Error cru: só UserFacingError e suas filhas
    // atravessam o runAction com a mensagem intacta.
    throw new ConflictError(
      `Este prato já tem ${MAX_MIDIAS_POR_ITEM} telas. Remova uma para enviar outra.`,
    )
  }
```

A `position` continua sendo `todas.length`, que a Fase 4 já corrigiu.

**Itens que já têm mais de seis continuam válidos** — o teto é conferido só ao inserir, e nada é apagado.

- [ ] **Passo 3: varrer quem lia o teto antigo**

```bash
grep -rn "maxPerItem" src/
```

Cada ocorrência vira `MAX_MIDIAS_POR_ITEM`.

- [ ] **Passo 4: conferir o código**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Passo 5: relatar**

Arquivos alterados: `src/domain/media.ts`, `src/server/dal/media.ts`, mais os que o passo 3 apontar. Nada de git.

---

## Tarefa 7: Staging em blob, dropzone e `attachment`

O coração da fase.

**Arquivos:**
- Criar: `src/components/cardapio/media-dropzone.tsx`, `src/components/cardapio/media-item.tsx`
- Modificar: `src/components/cardapio/media-editor.tsx` (reescrito), `src/components/cardapio/item-edit-dialog.tsx`

**Interfaces:**
- Consome: `comprimirImagem`, `comprimirVideo`, `MidiaPendente`; `Attachment*` de `@/components/ui/attachment`; `Progress` de `@/components/ui/progress`.
- Produz:
  - `<MediaDropzone onArquivos={(arquivos: File[]) => void} aceitos={readonly string[]} desabilitado={boolean} restantes={number} />` — `aceitos` é a lista de MIMEs; a Tarefa 9 passa só os de imagem.
  - `<MediaEditor itemId={string | null} media={OwnerMenuItemDTO['media']} onPendentesChange={(qtd: number) => void} ref={MediaEditorHandle} />`
  - `type MediaEditorHandle = { enviarPendentes: (itemId: string) => Promise<boolean> }` — devolve `false` se alguma falhou.

- [ ] **Passo 1: o dropzone**

Criar `src/components/cardapio/media-dropzone.tsx`. Ele aceita **arrastar, colar e clicar**, com um `input` escondido e `accept` juntando os dois tipos:

```tsx
const ACEITOS = [...MEDIA_LIMITS.image.mimes, ...MEDIA_LIMITS.video.mimes]
```

Um só `input`, `multiple`, sem separar foto de vídeo — a spec §3.6. O estado de "solte aqui" vem de `onDragOver`/`onDragLeave` com um contador, porque `dragleave` dispara ao passar por cima de um filho e um booleano simples pisca.

A colagem ouve `paste` na janela **enquanto o diálogo estiver aberto**, e lê `event.clipboardData.files`.

Arquivo de tipo não aceito é recusado **no dropzone**, antes de qualquer processamento, com o motivo.

- [ ] **Passo 2: a lista unificada**

Criar `src/components/cardapio/media-item.tsx`: uma entrada da lista, que serve **gravada e pendente**. Monta `Attachment` com `orientation="vertical"`, `AttachmentMedia variant="image"` para a miniatura, `AttachmentTitle`, `AttachmentDescription` com o tamanho, e `AttachmentActions` com remover e reordenar.

O `state` do `Attachment` mapeia direto de `MidiaPendente.estado`: `pendente → 'idle'`, `comprimindo → 'processing'`, `enviando → 'uploading'`, `erro → 'error'`, `pronta → 'done'`. É para isso que o primitivo tem esse prop, e é aí que a classe `shimmer` da Tarefa 1 aparece.

Quando `estado === 'enviando'`, mostra `<Progress value={progresso} />`.

- [ ] **Passo 3: o editor, reescrito sobre duas listas**

`media-editor.tsx` passa a manter `gravadas` (do servidor) e `pendentes` (estado local). A lista exibida é a concatenação, e a ordem é única entre as duas.

Ao escolher arquivos: cria um `MidiaPendente` por arquivo, com `previewUrl` de `URL.createObjectURL`, estado `pendente`. **Nada sobe.**

`useEffect` de limpeza revoga **todas** as `previewUrl` ao desmontar, e o removedor revoga a sua. Sem isso, um dono que troca dez fotos numa sessão segura dez blobs na memória do celular.

- [ ] **Passo 4: o envio, exposto por `ref`**

O editor expõe `enviarPendentes(itemId)` por `useImperativeHandle`. Para cada pendente, em ordem:

1. `estado = 'comprimindo'` → `comprimirImagem` ou `comprimirVideo`
2. confere o teto de peso **sobre o comprimido**; acima dele, `estado = 'erro'` com o tamanho final — o dono não tem como adivinhar
3. `estado = 'enviando'` → `createUploadTicketAction` → `uploadToSignedUrl`
4. `registerItemMediaAction` com `width`, `height`, `focalX/Y` padrão e, no vídeo, `posterPath` e `durationMs`
5. `estado = 'pronta'`

**Falha é isolada:** um `try/catch` por mídia. A que falhou fica em `erro` com o motivo e botão de tentar de novo; as outras seguem. A função devolve `false` se alguma falhou.

- [ ] **Passo 5: o diálogo confirma**

`item-edit-dialog.tsx` ganha uma `ref` para o editor. No `submit`, depois de `updateItemAction` dar certo, chama `enviarPendentes(item.id)`. Só fecha se voltar `true`; se voltar `false`, permanece aberto com os erros à vista.

E ganha a guarda de fechamento: com pendentes, `onOpenChange(false)` pede confirmação dizendo **quantas** se perderiam.

- [ ] **Passo 6: conferir o código**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Passo 7: provar o staging**

No painel, num item:

1. Escolher três arquivos — duas fotos e um vídeo, **no mesmo envio**. Confirmar que aparecem na lista e que **nada subiu**: a aba de rede não mostra requisição ao storage.
2. Fechar o diálogo sem salvar → pede confirmação dizendo "3".
3. Reabrir → a lista está vazia, e o cardápio público não mudou.
4. Escolher de novo, reordenar, salvar → os três sobem, com progresso visível, e aparecem no cardápio público **na ordem escolhida**.
5. Medir e registrar o antes e depois de uma foto e de um vídeo. **É esta a prova de compressão que as Tarefas 4 e 5 deixaram pendente.**

Anexar a tabela de medição e captura da lista com os três estados.

- [ ] **Passo 8: relatar**

Arquivos: dois criados, dois reescritos. Anexar medições. Nada de git.

---

## Tarefa 8: Criar item já com mídia

**Arquivos:**
- Modificar: `src/components/cardapio/item-create-dialog.tsx`

Hoje é impossível, e não por esquecimento: `registerItemMedia` exige um `itemId` que ainda não existe. Com staging, some o impedimento.

- [ ] **Passo 1: montar o editor sem id**

`ItemCreateDialog` passa a renderizar `<MediaEditor itemId={null} media={[]} ref={editorRef} />`. Com `itemId` nulo o editor **só acumula** — não tem para onde enviar, e a interface não oferece.

- [ ] **Passo 2: enviar depois do nascimento**

No `submit`, depois de `createItemAction` devolver `{ id }`, chamar `editorRef.current.enviarPendentes(id)`.

**Se o item não nascer, nada sobe** — as pendentes continuam pendentes e o dono corrige o formulário sem perder os arquivos que já escolheu.

- [ ] **Passo 3: conferir o código**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Passo 4: provar**

Criar um item já com uma foto, e confirmar que ele nasce com ela — sem passar pela edição. Depois, criar um item com foto **e preço inválido**: o item não nasce, a foto continua na lista, e corrigir o preço salva os dois.

- [ ] **Passo 5: relatar**

Arquivo alterado: `src/components/cardapio/item-create-dialog.tsx`. Nada de git.

---

## Tarefa 9: Logo e capa adotam o dropzone e a compressão

**Arquivos:**
- Modificar: `src/components/painel/brand-images.tsx`

**Sem staging, de propósito.** Logo e capa continuam gravando sozinhas, na hora do envio, como a Fase 3 decidiu: envio de arquivo já é uma confirmação por si, e amarrá-lo a um botão criaria um estado em que o arquivo está no storage e o banco ainda não sabe dele.

A diferença entre as duas telas tem motivo real: **mídia de item pertence a um item que pode não existir ainda; logo e capa pertencem a um restaurante que sempre existe.**

- [ ] **Passo 1: trocar o botão pelo dropzone**

Reusar `MediaDropzone`, restrito a imagem (`aceitos={MEDIA_LIMITS.image.mimes}`), um arquivo por vez.

- [ ] **Passo 2: comprimir antes de subir**

Entre escolher e `createBrandUploadTicketAction`, passar por `comprimirImagem`. A capa é a imagem mais pesada do sistema e é a que mais ganha.

O `mimeType` mandado para o ticket vem de `blob.type`, **não** de `file.type` — depois da compressão eles divergem, e mandar o antigo grava um arquivo com content-type errado.

- [ ] **Passo 3: conferir o código**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Passo 4: provar**

Enviar uma capa grande e registrar antes e depois. Conferir no cardápio público que ela continua nítida — compressão que estraga a capa é pior que capa pesada.

- [ ] **Passo 5: relatar**

Arquivo alterado: `src/components/painel/brand-images.tsx`. Anexar a medição. Nada de git.

---

## Tarefa 10: `width` e `height` param de ser nulos

**Arquivos:**
- Modificar: `src/components/cardapio/media-editor.tsx` — manda as dimensões
- Modificar: `src/components/cardapio-publico/menu-media.tsx` — usa quando existem
- Modificar: `src/domain/menu.ts` — `MenuMediaDTO` ganha `width`/`height`
- Modificar: `src/server/dal/menu.ts` — lê as colunas

Fecha a limitação que a Fase 4 aceitou: o enquadramento deixa de ser decidido no `onLoad`, e a foto para de trocar de enquadramento depois de carregar.

- [ ] **Passo 1: gravar**

A compressão já devolve `largura` e `altura`. `registerItemMediaAction` passa a recebê-las — o schema já aceita `width` e `height` desde a Fase 0.

- [ ] **Passo 2: ler**

`MenuMediaDTO` ganha `width: number | null` e `height: number | null`.

**Em inglês, e não `largura`/`altura`**: o DTO já usa `storagePath`, `posterPath`, `altText`, `durationMs`, `focalX` e `focalY`. Misturar idioma dentro de um tipo é como se descobre, seis meses depois, que existem dois campos para a mesma coisa.

`getPublicMenu` acrescenta `width, height` ao `select`, ao tipo `RawMedia` e ao mapeamento.

- [ ] **Passo 3: decidir antes de carregar**

Em `menu-media.tsx`, o estado `encaixa` passa a nascer calculado quando as dimensões vêm do banco:

```tsx
  // Quando o banco sabe as dimensões, a decisão de sangria ou moldura é
  // tomada ANTES de a imagem carregar, e não há troca de enquadramento no
  // meio. Linhas antigas continuam nulas e caem no `onLoad`, que fica como
  // reserva — e é por isso que ele não sai daqui.
  const [encaixa, setEncaixa] = useState<boolean | null>(() =>
    media.width && media.height
      ? cabeNoFormato(
          media.width,
          media.height,
          window.innerWidth,
          window.innerHeight,
        )
      : null,
  )
```

O inicializador é uma função porque toca `window` — num componente de cliente ele só roda no navegador, mas a forma preguiçosa deixa isso explícito.

- [ ] **Passo 4: conferir o código**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Passo 5: provar**

Enviar uma foto em paisagem nova e conferir, no cardápio, que ela **já nasce emoldurada** — sem o pulo de sangria para moldura que a Fase 4 tinha. Conferir também uma foto antiga, de antes desta tarefa: ela continua funcionando pelo `onLoad`.

- [ ] **Passo 6: relatar**

Arquivos alterados: quatro. Nada de git.

---

# Bloco C — O cardápio público

Independente dos Blocos A, B e D.

## Tarefa 11: O trilho colapsável

**Arquivos:**
- Modificar: `src/components/cardapio-publico/theme.css`
- Modificar: `src/components/cardapio-publico/menu-rail.tsx`

**Os três defeitos que esta tarefa conserta**, todos relatados com captura: a seta de voltar não existe na primeira tela; o último chip é fatiado por uma borda reta; e tudo abre expandido, ocupando a faixa sobre a foto.

**Interfaces:**
- Produz: `<MenuRail categorias ativa onIrParaCapa onIrParaCategoria />` — mesma assinatura de hoje. `menu-feed.tsx` não muda.

- [ ] **Passo 1: as regras de CSS**

Em `theme.css`, acrescentar:

```css
/* O trilho abre COLAPSADO. Aberto o tempo todo, ele ocupa a faixa sobre a
   foto e fatia o último chip numa borda reta — foi o primeiro desenho, e
   estava errado nos dois pontos. */

/* Os chips continuam ocupando espaço quando fechados, e apenas somem. Animar
   a LARGURA do contêiner seria o caminho "certo", e é justamente o que
   engasga: `width: auto` não é animável, e as alternativas com `max-width`
   saltam. Como o trilho flutua sobre a foto e o véu já cobre a faixa
   inteira, espaço invisível aqui não custa nada visualmente — e `inert`
   resolve o que importa de verdade, que é foco e toque. */
.menu-rail-item {
  opacity: 0;
  transform: translateX(-8px);
  transition:
    opacity 180ms var(--ease-saida),
    transform 180ms var(--ease-saida);
  /* O escalonamento: cada chip entra 40ms depois do anterior. */
  transition-delay: calc(var(--i) * 40ms);
}

.menu-rail[data-aberto='true'] .menu-rail-item {
  opacity: 1;
  transform: none;
}

/* Fechar é rápido e junto. Escalonar a saída faria o trilho parecer lento
   justamente quando a pessoa já decidiu que não quer mais ele ali. */
.menu-rail[data-aberto='false'] .menu-rail-item {
  transition-delay: 0ms;
}

.menu-rail[data-aberto='false'] .menu-rail-lista {
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .menu-rail-item {
    transition: none;
    transition-delay: 0ms;
  }
}
```

- [ ] **Passo 2: a máscara que acaba com o corte**

Na mesma folha, o rolador dos chips ganha esmaecimento nas pontas:

```css
/* O chip deixa de ser cortado por uma linha reta e se dissolve — e isso
   avisa que há mais para o lado, coisa que uma borda dura não diz. */
.menu-rail-lista {
  -webkit-mask-image: linear-gradient(
    to right,
    black 0,
    black calc(100% - 28px),
    transparent 100%
  );
  mask-image: linear-gradient(
    to right,
    black 0,
    black calc(100% - 28px),
    transparent 100%
  );
}
```

Só na direita: à esquerda fica a pílula, e não há o que esmaecer.

- [ ] **Passo 3: o componente**

`menu-rail.tsx` ganha `const [aberto, setAberto] = useState(false)` e:

- O `<nav>` recebe `className="menu-rail ..."` e `data-aberto={aberto}`.
- **A pílula da esquerda é sempre visível.** Fechada, mostra ícone e o nome da categoria atual — ou "Cardápio", na capa. Aberta, vira fechar, com `RiCloseLine`.
- **O primeiro item da lista é "Início"**, que chama `onIrParaCapa`. É ele que substitui a seta solta: como item da lista, a função de voltar **existe desde a primeira tela**, em vez de aparecer e sumir.
- Cada `<li>` recebe `className="menu-rail-item"` e `style={{ '--i': indice } as React.CSSProperties}`.
- A `<ul>` recebe `className="menu-rail-lista ..."` e `inert={!aberto}`.
- Escolher categoria chama `onIrParaCategoria` **e** `setAberto(false)`.

`inert` é booleano em React 19 e tira os chips escondidos do foco e do leitor de tela — sem ele, `Tab` passeia por botões invisíveis.

- [ ] **Passo 4: fechar ao deslizar**

`menu-feed.tsx` já sabe quando a coluna muda. O trilho fecha sozinho: `MenuRail` ganha `ativa` como dependência de um `useEffect` que chama `setAberto(false)`. Aberto, ele não fica no caminho da foto.

- [ ] **Passo 5: conferir o código**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Passo 6: conferir no navegador, em 375px**

**Antes de concluir qualquer coisa sobre a animação, medir:**

```js
let q=0; const t0=performance.now();
(function tick(){q++; if(performance.now()-t0<500) requestAnimationFrame(tick)})();
await new Promise(r=>setTimeout(r,700));
({quadros:q, oculto:document.hidden})
```

`quadros: 0` significa que a janela está atrás de outra e **a medição não vale** — foi assim que a Fase 4 produziu um diagnóstico falso.

Com quadros:

1. Abrir o cardápio → o trilho está **colapsado**, com uma pílula só.
2. Tocar → os chips entram um a um, da esquerda para a direita.
3. Nenhum chip é cortado por borda reta; o último se dissolve.
4. Escolher uma categoria → vai até ela **e o trilho fecha**.
5. Deslizar para outro prato com o trilho aberto → fecha sozinho.
6. Com o trilho fechado, `Tab` **não** alcança os chips escondidos.
7. Num restaurante com **uma categoria só**: expande igual. Aqui o trilho não some como o contador da Fase 4 — uma categoria única ainda precisa do "Início" ao lado dela, e sem expandir não haveria como voltar para a capa.

Anexar captura de fechado e de aberto.

- [ ] **Passo 7: relatar**

Arquivos alterados: `theme.css`, `menu-rail.tsx`, `menu-feed.tsx`. Nada de git.

---

## Tarefa 12: Ícones nos atalhos de contato

**Arquivos:**
- Modificar: `src/components/cardapio-publico/menu-cover.tsx`
- Modificar: `src/app/painel/restaurantes/[id]/contato/page.tsx` e `src/components/painel/profile-form.tsx`

**Os nomes foram conferidos** em `react-icons/ri`: `RiWhatsappLine`, `RiInstagramLine`, `RiPhoneLine`, `RiMapPinLine`.

- [ ] **Passo 1: o cardápio**

Em `menu-cover.tsx`, o tipo `Atalho` ganha `icone: React.ReactNode`, e cada entrada traz o seu. O `<a>` passa a renderizar `{link.icone}{link.rotulo}` com `gap-2`.

Todos continuam com `target="_blank"` e `rel="noopener noreferrer"`.

**Registrado:** `target="_blank"` num `tel:` não faz nada de útil. Fica por consistência, a pedido do dono do projeto.

- [ ] **Passo 2: o painel**

Os **mesmos ícones** entram nos campos da tela de Contato, para o dono reconhecer o que está preenchendo. O projeto tem `src/components/ui/field-icon.tsx`, já em uso — usar ele, não montar à mão.

- [ ] **Passo 3: conferir o código**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Passo 4: conferir no navegador**

No cardápio, os três atalhos com ícone, legíveis nas duas faces. No painel, os campos com o mesmo conjunto. Anexar captura.

- [ ] **Passo 5: relatar**

Arquivos alterados: três. Nada de git.

---

# Bloco D — As telas

Depende do Bloco A. A Tarefa 13 depende também da 7, para a miniatura.

## Tarefa 13: A tela do cardápio

**Arquivos:**
- Modificar: `src/components/cardapio/item-row.tsx`, `src/components/cardapio/category-section.tsx`, `src/components/painel/publish-bar.tsx`
- Criar: `src/components/shell/copiavel.tsx`
- Modificar: `src/app/painel/restaurantes/[id]/page.tsx`

- [ ] **Passo 1: a linha do item mostra a foto**

Hoje `ItemRow` **não exibe mídia nenhuma**. Num produto que virou feed de fotos na Fase 4, o dono edita o cardápio sem ver o que o cliente vê.

A miniatura da primeira mídia entra à esquerda do nome, `size-12 rounded-lg object-cover`, com `object-position` vindo do ponto focal. Item sem mídia mostra, no mesmo espaço, a marca "Sem foto" que a Fase 4 criou — ela sai de junto do nome e vira o próprio lugar da imagem.

Vídeo sem capa cai no ícone `RiFilmLine`.

- [ ] **Passo 2: a faixa de publicação vira card de estado**

`publish-bar.tsx` passa a usar `Card` — o primitivo existe e nunca foi usado; hoje a faixa é `rounded-xl border border-border bg-surface-2 p-4` montado à mão.

Conteúdo: a situação com `badge`, o endereço público em `Copiavel`, o que falta para publicar — a contagem de itens sem mídia já está ligada ao botão desde a Fase 4 —, e as ações.

- [ ] **Passo 3: o copiável**

Criar `src/components/shell/copiavel.tsx`: texto monoespaçado com botão de copiar e **retorno visível** — o ícone vira um "copiado" por 2 segundos. Hoje o endereço público aparece como texto morto, e o link de convite é mostrado uma vez sem confirmação de cópia.

Usa `navigator.clipboard.writeText`, com `try/catch`: em contexto não seguro ele lança, e o botão precisa dizer isso em vez de não fazer nada.

- [ ] **Passo 4: a categoria vira seção**

`category-section.tsx` passa a `Card` com `CardHeader`, o nome em `CardTitle`, a contagem em `CardDescription` e as ações em `CardAction`. Os itens vão em `CardContent`, com `divide-y` entre eles — **fio só entre conteúdos de mesmo peso**, que é a regra da §6.1 da spec.

- [ ] **Passo 5: conferir o código**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Passo 6: conferir no navegador**

Um restaurante com pelo menos uma categoria, um item com foto, um sem, e um com vídeo. Conferir a miniatura, a marca "Sem foto", o card de estado e a cópia do endereço. Anexar captura.

- [ ] **Passo 7: relatar**

Arquivos: um criado, quatro alterados. Nada de git.

---

## Tarefa 14: As demais telas do painel

**Arquivos:**
- Modificar: `src/app/painel/restaurantes/page.tsx`, `.../identidade/page.tsx`, `.../contato/page.tsx`, `.../equipe/page.tsx`, `.../comecar/page.tsx`
- Modificar: `src/components/painel/member-row.tsx`, `src/components/auth/auth-shell.tsx`

- [ ] **Passo 1: lista de restaurantes**

De `Item` empilhado e só texto, para **grade de `Card`**: miniatura da capa no topo, logo sobreposto, nome em `CardTitle`, endereço público em `CardDescription`, situação em `badge`. O cartão inteiro é o alvo do link.

O desvio de "um restaurante só" que já existe **permanece** — ele é anterior a esta tela.

- [ ] **Passo 2: equipe**

`member-row.tsx` ganha `Avatar` com `AvatarFallback` nas iniciais do e-mail — o primitivo existe e nunca foi usado. Papel em `badge`, ações ao fim da linha.

- [ ] **Passo 3: começar**

O "Passo 2 de 3" em texto vira `<Progress value={(passo / 3) * 100} />` com o rótulo ao lado.

- [ ] **Passo 4: identidade e contato**

Herdam a casca e os campos agrupados. A identidade **mantém a pré-visualização dupla da Fase 4** sem alteração — ela é a prova de contraste do dono, e mexer nela é risco sem ganho.

- [ ] **Passo 5: a casca de entrada**

`auth-shell.tsx` ganha a marca acima do título e deixa de ser formulário solto no escuro. O `font-display` da Tarefa 2 já está nele.

- [ ] **Passo 6: conferir o código**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Passo 7: conferir no navegador**

As cinco telas, em celular e desktop, nas duas faces. Anexar captura da lista de restaurantes e da equipe.

- [ ] **Passo 8: relatar**

Arquivos alterados: sete. Nada de git.

---

## Tarefa 15: O console

**Arquivos:**
- Modificar: `src/app/admin/page.tsx`, `src/app/admin/restaurantes/page.tsx`, `src/app/admin/restaurantes/[id]/page.tsx`
- Modificar: `src/components/convites/invite-list.tsx`, `src/components/convites/invite-dialog.tsx`, `src/components/admin/*.tsx`

**Este é o primeiro item a ser cortado depois da compressão de vídeo**, se o prazo apertar. O painel sozinho já entrega o pedido.

- [ ] **Passo 1: convites**

O link do convite volta **uma vez** e não há confirmação de cópia — o administrador copia às cegas. Passa a usar `Copiavel` da Tarefa 13.

A lista adota `Card` e `badge` para validade e situação.

- [ ] **Passo 2: restaurantes**

A tabela **mantém** — tabela é a forma certa para essa densidade. Ganha badges consistentes e espaçamento da escala nova.

- [ ] **Passo 3: detalhe do restaurante**

Slug, situação e plaquinhas em `Card` separados, cada um com uma responsabilidade. O token da plaquinha usa `Copiavel`.

- [ ] **Passo 4: conferir o código**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Passo 5: conferir no navegador**

As quatro telas do console. Anexar captura de convites.

- [ ] **Passo 6: relatar**

Arquivos alterados: seis ou mais. Nada de git.

---

## Tarefa 16: Esqueletos, estados e erro

**Arquivos:**
- Criar: quatro `loading.tsx` (lista de restaurantes, identidade, contato, equipe)
- Modificar: `src/app/painel/loading.tsx`, `src/app/painel/restaurantes/[id]/loading.tsx`, `src/app/admin/loading.tsx`
- Modificar: `src/app/painel/error.tsx`, `src/app/admin/error.tsx`

- [ ] **Passo 1: esqueletos que espelham o layout**

Os três de hoje são retângulos genéricos sem relação com a tela que carregam, e o efeito é um salto quando o conteúdo chega. Cada um passa a ter **a mesma grade do conteúdo real**: a lista de restaurantes mostra cartões do tamanho dos cartões; o cardápio mostra o card de estado e duas seções com três linhas cada.

`SidebarMenuSkeleton`, que o primitivo de lateral já exporta, serve a navegação.

- [ ] **Passo 2: erro que se recupera**

`error.tsx` passa a usar `Alert` com `AlertTitle`, `AlertDescription` e `AlertAction` — hoje é parágrafo vermelho solto. A ação é `reset()`, que o Next já entrega.

- [ ] **Passo 3: os parágrafos vermelhos soltos**

```bash
grep -rn "text-destructive" src/ --include="*.tsx"
```

Cada um vira `Alert`, **exceto** os de validação de campo, que pertencem ao campo e ficam onde estão — `FieldDescription` já os serve.

- [ ] **Passo 4: conferir o código**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Passo 5: conferir no navegador**

Com rede lenta emulada, navegar entre as telas e conferir que o esqueleto **tem a forma do conteúdo** que chega depois. Anexar captura de um esqueleto ao lado da tela pronta.

- [ ] **Passo 6: relatar**

Arquivos: quatro criados, cinco alterados. Nada de git.

---

## Tarefa 17: Verificação de ponta a ponta

Não escreve código. Existe porque o que não é conferido explicitamente não foi conferido.

- [ ] **Passo 1: código e guardas**

```bash
pnpm exec tsc --noEmit
```

```bash
pnpm exec tsx scripts/verificar-contraste.ts
```

O guarda de contraste **tem de continuar verde**: esta fase não mexe nos tokens de cor do cardápio, e ele prova isso.

- [ ] **Passo 2: nenhum resquício**

```bash
grep -rn "TopBar\|TerritoryNav\|maxPerItem" src/
```

Esperado: nenhuma linha.

- [ ] **Passo 3: a tabela de compressão**

Reunir, num lugar só, as medições das Tarefas 5, 7 e 9:

| Arquivo | Antes | Depois | Dimensões | Tempo |
|---|---|---|---|---|
| foto de prato | | | | |
| capa do restaurante | | | | |
| vídeo de celular | | | | |

Se a linha do vídeo estiver vazia porque a Tarefa 5 foi cortada, **dizer isso** em vez de omitir.

- [ ] **Passo 4: o ciclo do dono**

1. Entrar → lateral no lugar, item ativo marcado.
2. Criar um item **já com foto e vídeo no mesmo envio** → nasce com os dois.
3. Fechar o diálogo com pendente → pede confirmação com a contagem certa.
4. Chegar a seis telas → o dropzone desabilita e diz o teto.
5. Publicar → recusa enquanto houver item sem mídia.
6. Trocar a capa → comprime e aparece no cardápio.

- [ ] **Passo 5: o cardápio público**

1. Trilho colapsado ao abrir; expande escalonado; fecha ao escolher categoria.
2. Nenhum chip cortado por borda reta.
3. Os três atalhos com ícone, abrindo em `_blank`.
4. Foto nova em paisagem **já nasce emoldurada**, sem pulo de enquadramento.

**Medir quadros antes de concluir qualquer coisa sobre 1.**

- [ ] **Passo 6: as 17 telas**

Celular e desktop, faces clara e escura. Conferindo em cada uma: **título de página serifado e o resto não** — é o efeito da Tarefa 2, o de maior alcance e o que mais facilmente passa despercebido numa tela que ninguém abriu.

- [ ] **Passo 7: relatar o fechamento**

Tabela de tarefa por tarefa, capturas anexadas, e **as pendências que ficaram** — entre elas, se a compressão de vídeo foi cortada e se o console entrou. Nada de git: listar os arquivos alterados na fase inteira.
