# Tavvi Shell, Admin e Painel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir o falso 404 do workspace de restaurante e substituir a experiência privada atual por um shell Tavvi premium, responsivo e consistente, preservando a identidade tipográfica própria do cardápio público.

**Architecture:** Um `TavviShell` contextual recebe uma configuração serializável produzida pelos layouts de servidor e compõe sidebar desktop, navegação mobile, paleta de comandos e controles de conta/tema. O acesso ao restaurante passa por uma função cacheada por request que distingue ausência real de falha de infraestrutura; layouts e páginas reutilizam esse contexto sem consultas duplicadas. A camada visual privada usa Inter e tokens Tavvi, enquanto o cardápio público permanece isolado pelos tokens de identidade do restaurante.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, shadcn/Radix, Motion, cmdk, Remix Icons, Supabase.

**Spec:** `docs/superpowers/specs/2026-09-21-tavvi-shell-admin-painel-design.md`

## Global Constraints

- Não executar `git`, `typecheck`, `build`, `lint` ou `test`, conforme `AGENTS.md`.
- Não criar ou rodar testes automatizados. A verificação será estática e manual no navegador.
- Antes de alterar APIs, convenções ou arquivos de rota do Next.js, reler o guia correspondente em `node_modules/next/dist/docs/`.
- Preservar alterações preexistentes e limitar cada etapa aos arquivos listados.
- Fazer toda edição manual com `apply_patch`.
- Não instalar `next-themes`: evoluir o provider de tema existente.
- Não alterar o sistema tipográfico do cardápio público; Inter é a fonte das superfícies privadas, autenticação e onboarding Tavvi.
- Não converter erros de rede, timeout, autenticação ou banco em `notFound()`.
- Não introduzir topbar global. O conteúdo começa pelo cabeçalho da própria página.

---

## Target File Map

### New files

- `src/components/providers/motion-provider.tsx` — boundary único de `LazyMotion` para animações privadas.
- `src/components/shell/navigation.types.ts` — contratos serializáveis de navegação e shell.
- `src/components/shell/navigation.ts` — itens contextuais, normalização de pathname e regras de item ativo.
- `src/components/shell/navigation-icons.tsx` — mapa explícito de nomes serializáveis para Remix Icons.
- `src/components/shell/sidebar-store.ts` — estado externo persistido e compartilhado de expansão da sidebar.
- `src/components/shell/nav-tree.tsx` — árvore desktop expandida, compacta e com flyouts acessíveis.
- `src/components/shell/command-palette-store.ts` — store externo mínimo para abrir/fechar a paleta.
- `src/components/shell/command-palette.tsx` — busca e navegação por comandos com `Ctrl/Cmd+K`.
- `src/components/shell/desktop-sidebar.tsx` — sidebar Tavvi 260/64 px.
- `src/components/shell/mobile-navigation.tsx` — dock mobile Conta/Início/Menu e seus painéis.
- `src/components/shell/tavvi-shell.tsx` — composição responsiva do shell.
- `src/components/shell/route-error-state.tsx` — estado reutilizável para falhas recuperáveis.
- `src/server/dal/restaurant-workspace.ts` — contexto de restaurante cacheado por request.

### Modified files

- `src/app/layout.tsx`, `src/app/globals.css` — Inter, tokens Tavvi, motion e base global.
- `src/components/theme/theme-provider.tsx`, `theme-script.tsx`, `theme-toggle.tsx` — persistência e atalho de tema.
- `src/components/shell/page-header.tsx`, `sign-out-button.tsx` — hierarquia e estados de interação.
- `src/app/admin/layout.tsx` — shell administrativo.
- `src/app/painel/restaurantes/page.tsx` — shell de seleção e lista responsiva.
- `src/app/painel/restaurantes/[id]/layout.tsx` — shell contextual do restaurante.
- `src/server/dal/restaurants.ts` — semântica correta de erro versus ausência.
- Páginas de `src/app/admin/**` e `src/app/painel/**` — superfícies, responsividade e estados.
- `src/components/auth/**`, `src/components/convites/**`, `src/components/painel/**`, `src/components/cardapio/**` — acabamento visual e responsivo.

### Removed after migration

- `src/components/shell/app-sidebar.tsx`
- `src/components/shell/app-shell.tsx`

---

## Shared Contracts

Use estes contratos como fonte única. Não passe componentes React, funções ou objetos Supabase do servidor para o shell cliente.

```ts
export type NavIconName =
  | "mail"
  | "store"
  | "restaurant"
  | "menu"
  | "palette"
  | "contact"
  | "team";

export type NavLeaf = {
  kind: "leaf";
  label: string;
  href: string;
  icon: NavIconName;
  description?: string;
  keywords?: string[];
  disabled?: boolean;
};

export type NavGroup = {
  kind: "group";
  id: string;
  label: string;
  icon: NavIconName;
  description?: string;
  children: NavLeaf[];
};

export type NavItem = NavLeaf | NavGroup;

export type TavviShellConfig = {
  homeHref: string;
  userLabel: string | null;
  contextLabel?: string;
  contextDescription?: string;
  items: NavItem[];
};
```

O contexto do restaurante deve expor somente o necessário às páginas:

```ts
import type { MemberRole } from "@/domain/invite";

export type RestaurantWorkspace = {
  restaurant: RestaurantMemberDTO;
  role: MemberRole | null;
  canEdit: boolean;
};
```

`null` significa exclusivamente “restaurante não encontrado ou não acessível para este usuário”. Falhas de consulta devem lançar exceção e chegar ao `error.tsx`.

---

## Task 1: Establish the Tavvi Visual Foundation

**Files:**

- Create: `src/components/providers/motion-provider.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`
- Inspect only: `src/lib/fonts.ts`

- [ ] Reabrir a documentação local de fonts/layout/CSS do Next.js 16 antes da alteração e confirmar que `next/font/google` continua sendo o caminho documentado.
- [ ] Usar Inter no layout raiz e nas superfícies privadas. Manter Fraunces somente para o pequeno território público existente e as fontes temáticas isoladas no cardápio.
- [ ] Manter em `src/lib/fonts.ts` todas as fontes usadas pelo cardápio público e suas variáveis; não misturar essas famílias com a interface privada.
- [ ] Criar o provider de Motion com import leve:

```tsx
"use client";

import { LazyMotion, domAnimation } from "motion/react";

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}
```

- [ ] Envolver os providers já existentes com `MotionProvider` sem alterar a ordem necessária ao tema ou aos tooltips.
- [ ] Definir em `globals.css` os tokens semânticos privados Tavvi: canvas, surface, elevated, border, text, muted, brand teal, hover, active, danger, success, focus ring, radius e shadow para claro/escuro.
- [ ] Aplicar Inter em `.territorio-admin` e `.territorio-painel`; garantir que `.menu`, `.menu-display` e demais seletores do cardápio continuem usando as variáveis de identidade do restaurante.
- [ ] Atualizar o metadata da plataforma para `Tavvi` e o template `%s · Tavvi`, preservando metadata específico do cardápio quando já definido pela rota pública.
- [ ] Remover regras globais que forçam serif em títulos privados. Títulos de admin/painel devem herdar Inter e usar peso/letter-spacing, não trocar de família. O título da página pública raiz fica fora do escopo visual desta repaginação.
- [ ] Adicionar utilitários estruturais mínimos para `tavvi-page`, `tavvi-surface` e safe areas mobile apenas se forem usados em três ou mais locais; manter estilos específicos nos componentes.
- [ ] Verificar estaticamente que `.territorio-admin` e `.territorio-painel` resolvem para Inter, que a página pública raiz ainda preserva sua composição e que `ALL_THEME_FONT_VARIABLES` continua aplicado no cardápio público.

## Task 2: Make Theme State Durable and Keyboard-Accessible

**Files:**

- Modify: `src/components/theme/theme-provider.tsx`
- Modify: `src/components/theme/theme-script.tsx`
- Modify: `src/components/theme/theme-toggle.tsx`

- [ ] Preservar o contrato `light | dark | system` e uma única chave de storage já usada pelo projeto; não criar segunda fonte de verdade.
- [ ] Fazer o script pré-hidratação ler a mesma chave, resolver `system`, aplicar a classe no elemento raiz e declarar `color-scheme` antes da pintura.
- [ ] No provider, escutar mudança de `prefers-color-scheme` somente quando a preferência salva for `system`.
- [ ] Registrar `Ctrl+Alt+T` e `AltGr+T` como atalhos equivalentes, ignorando inputs, textareas, selects e elementos `contenteditable`.
- [ ] O ciclo do atalho deve ser `system → light → dark → system`.
- [ ] Reimplementar o toggle como dropdown/radio acessível com as três escolhas, ícone do estado resolvido, indicação selecionada e rótulo textual.
- [ ] Garantir que o trigger compacto da sidebar continue utilizável por tooltip e que a versão mobile tenha área mínima de toque de 44 px.
- [ ] Fazer inspeção manual de reload: tema escolhido não pisca para o tema oposto e o atalho atualiza menu e documento.

## Task 3: Define Navigation and Route Semantics

**Files:**

- Create: `src/components/shell/navigation.types.ts`
- Create: `src/components/shell/navigation.ts`
- Create: `src/components/shell/navigation-icons.tsx`

- [ ] Implementar os contratos da seção “Shared Contracts”.
- [ ] Criar `getAdminNavigation()` com Convites e Restaurantes.
- [ ] Criar `getRestaurantNavigation(restaurantId, canEdit)` usando URLs externas ao rewrite (`/restaurantes/:id/...`): Cardápio sempre visível; Identidade, Contato e Equipe somente quando `canEdit` for verdadeiro.
- [ ] Implementar `externalPathname(pathname)` que remova somente prefixos internos exatos `/admin` e `/painel`, preservando a raiz e query-independent matching.
- [ ] Implementar matching segment-aware para evitar que `/restaurantes/1` ative `/restaurantes/10`:

```ts
export function isHrefActive(pathname: string, href: string) {
  const current = externalPathname(pathname);
  return current === href || current.startsWith(`${href}/`);
}
```

- [ ] Para itens irmãos sob o mesmo restaurante, marcar Cardápio ativo apenas no índice exato; Identidade, Contato e Equipe devem ter precedência em suas subrotas.
- [ ] Implementar `flattenNavItems(items)` para a paleta e `isGroupActive(pathname, group)` para a árvore.
- [ ] Mapear cada `NavIconName` a um Remix Icon em um `Record<NavIconName, IconType>`, sem serializar componentes através do boundary servidor/cliente.
- [ ] Verificar as rotas existentes com `rg --files src/app/admin src/app/painel` e ajustar os hrefs à estrutura real, sem inventar páginas.

## Task 4: Port the Reference NavTree Behaviors

**Files:**

- Create: `src/components/shell/nav-tree.tsx`
- Reference: `C:/Users/Eduardo Zamai/Documents/suite/components/custom/NavTree/NavTree.tsx`
- Reference: `C:/Users/Eduardo Zamai/Documents/suite/components/custom/NavTree/NavTree.types.ts`
- Reference: `C:/Users/Eduardo Zamai/Documents/suite/components/custom/navigation.ts`
- Reference: `C:/Users/Eduardo Zamai/Documents/suite/components/custom/navigation.types.ts`

- [ ] Ler integralmente o `NavTree.tsx` de referência e cada helper local que ele importe antes de portar.
- [ ] Preservar as duas renderizações: labels/filhos inline no modo expandido e ícones com flyout portalizado no modo compacto.
- [ ] Portar a hierarquia visual: rail vertical de grupo, active indicator, pesos de labels, espaçamento e estados hover/pressed/focus.
- [ ] Portar os comportamentos de flyout: abertura por mouse e teclado, pequeno atraso de fechamento, scrim, Escape, retorno de foco, navegação por Tab e prevenção de fechamento ao mover ponteiro entre trigger e painel.
- [ ] Trocar tipos, tokens, ícones e helpers da Suite pelos contratos Tavvi; não copiar imports inexistentes.
- [ ] Usar `m` de `motion/react-m` dentro do boundary criado na Task 1 e respeitar `prefers-reduced-motion`.
- [ ] Para item `disabled`, renderizar estado perceptível e impedir navegação sem remover o item da ordem de leitura.
- [ ] Usar `aria-current="page"`, `aria-expanded`, `aria-controls` e labels adequados.
- [ ] Comparar manualmente, lado a lado, estados expandido, compacto, ativo, hover, focus e flyout com a referência Suite.

## Task 5: Implement the Command Palette

**Files:**

- Create: `src/components/shell/command-palette-store.ts`
- Create: `src/components/shell/command-palette.tsx`
- Inspect: `src/components/ui/command.tsx`
- Inspect: `src/components/ui/kbd.tsx`
- Reference: `C:/Users/Eduardo Zamai/Documents/suite/components/custom/CommandPalette/CommandPalette.tsx`
- Reference: `C:/Users/Eduardo Zamai/Documents/suite/components/custom/CommandPalette/CommandPaletteTrigger.tsx`
- Reference: `C:/Users/Eduardo Zamai/Documents/suite/components/custom/CommandPalette/command-palette-store.ts`

- [ ] Criar store externo simples com `useSyncExternalStore`, sem dependência adicional:

```ts
type Listener = () => void;
let open = false;
const listeners = new Set<Listener>();

export function setCommandPaletteOpen(next: boolean) {
  open = next;
  listeners.forEach((listener) => listener());
}

export function useCommandPaletteOpen() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => open,
    () => false,
  );
}
```

- [ ] Registrar `Ctrl/Cmd+K`, ignorar campos editáveis e prevenir o comportamento padrão apenas quando o atalho for reconhecido.
- [ ] Montar comandos a partir de `flattenNavItems(config.items)` e ações secundárias de tema.
- [ ] Usar os componentes cmdk existentes, com título/descrição para leitores de tela, empty state, grupos “Navegação” e “Aparência”.
- [ ] Navegar com `router.push(href)` e fechar a paleta ao selecionar.
- [ ] Exibir `⌘ K` em macOS e `Ctrl K` nos demais ambientes sem causar mismatch de hidratação; resolver a legenda após mount ou usar rótulo neutro no HTML inicial.
- [ ] Disponibilizar um trigger reutilizável para sidebar expandida, compacta e menu mobile.
- [ ] Verificar manualmente abertura, busca por label/keyword, setas, Enter, Escape e restauração de foco.

## Task 6: Build the Desktop Sidebar

**Files:**

- Create: `src/components/shell/desktop-sidebar.tsx`
- Create: `src/components/shell/sidebar-store.ts`
- Modify: `src/components/shell/sign-out-button.tsx`
- Reference: `C:/Users/Eduardo Zamai/Documents/suite/components/custom/Sidebar`
- Reference: `C:/Users/Eduardo Zamai/Documents/suite/components/custom/ThemeToggle`

- [ ] Ler integralmente o entry point, estilos e helpers relevantes da Sidebar de referência.
- [ ] Implementar largura expandida de 260 px e compacta de 64 px, com transição equivalente à referência e sem deslocamentos abruptos do conteúdo.
- [ ] Criar `sidebar-store.ts` com `useSyncExternalStore`, `getSidebarCollapsed`, `setSidebarCollapsed` e `toggleSidebarCollapsed`; persistir na chave `tavvi:sidebar:collapsed` e usar snapshot de servidor expandido.
- [ ] Registrar `Ctrl/Cmd+B`, ignorando campos editáveis, para alternar o estado.
- [ ] Cabeçalho expandido: monograma `TV`, nome `Tavvi`, contexto opcional do restaurante e botão de colapso. Compacto: monograma e controles por tooltip.
- [ ] Corpo: `NavTree` e trigger da paleta, mantendo navegação rolável sem mover o rodapé.
- [ ] Rodapé: email/identidade do usuário, ThemeToggle e logout. Em modo compacto, ícones centralizados com tooltips.
- [ ] Evoluir `SignOutButton` para aceitar `compact?: boolean` e exibir pending state sem mudar sua action de servidor.
- [ ] Tratar logout como ação destrutiva visualmente só no hover/focus; não usar vermelho permanente como ruído.
- [ ] Aplicar borda, superfícies e sombras dos tokens Tavvi, não os verdes da Suite.
- [ ] Verificar a paridade comportamental com a referência em 1440 px, incluindo reload da preferência, atalhos e tooltips.

## Task 7: Build the Mobile Navigation

**Files:**

- Create: `src/components/shell/mobile-navigation.tsx`
- Reference: `C:/Users/Eduardo Zamai/Documents/suite/components/custom/MobileNavigation`

- [ ] Ler integralmente os componentes e hooks diretamente usados pela MobileNavigation de referência.
- [ ] Criar dock fixo com três destinos: Conta, Início e Menu; o botão central navega para `config.homeHref`.
- [ ] Respeitar safe area inferior e reservar espaço no conteúdo para o dock não cobrir ações/formulários.
- [ ] Conta abre painel com usuário, ThemeToggle e logout; Menu abre a navegação contextual; ambos devem compartilhar a linguagem visual do desktop.
- [ ] Portar da referência: focus trap, Escape, clique/scrim para fechar, retorno de foco, body scroll lock e fechamento ao navegar.
- [ ] Destacar o destino/contexto ativo sem depender apenas de cor.
- [ ] Garantir alvos mínimos de 44 × 44 px e labels visíveis; não usar navegação icon-only no mobile.
- [ ] A paleta de comandos deve estar acessível pelo painel Menu, mantendo `Ctrl/Cmd+K` para teclado externo.
- [ ] Verificar manualmente em larguras 320, 375, 768 e orientação landscape.

## Task 8: Compose TavviShell and Migrate Layouts

**Files:**

- Create: `src/components/shell/tavvi-shell.tsx`
- Modify: `src/app/admin/layout.tsx`
- Modify: `src/app/painel/restaurantes/page.tsx`
- Modify: `src/app/painel/restaurantes/[id]/layout.tsx`
- Remove after imports are gone: `src/components/shell/app-sidebar.tsx`
- Remove after imports are gone: `src/components/shell/app-shell.tsx`

- [ ] Implementar o shell como client boundary que recebe `TavviShellConfig` e `children`:

```tsx
export function TavviShell({
  config,
  children,
}: {
  config: TavviShellConfig;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <DesktopSidebar config={config} />
      <main className="tavvi-shell-content">{children}</main>
      <MobileNavigation config={config} />
      <CommandPalette config={config} />
    </div>
  );
}
```

- [ ] Fazer o `TavviShell` e o `DesktopSidebar` consumirem `sidebar-store.ts`. O shell define `data-sidebar-collapsed` e `--sidebar-width` (`260px` ou `64px`); o conteúdo usa a mesma variável, sem segundo estado.
- [ ] Em admin, construir a configuração no layout servidor e envolver somente rotas autenticadas; `/admin/entrar` continua sem shell.
- [ ] Em painel, manter páginas de autenticação/convite sem shell. A lista de restaurantes recebe shell básico; o workspace `[id]` recebe contexto e navegação do restaurante.
- [ ] Garantir que URLs do cliente continuem públicas (`/restaurantes/...`) embora o filesystem interno use `/painel` por rewrite.
- [ ] Remover qualquer topbar global antiga e deixar o título na própria página.
- [ ] Buscar imports de `AppShell` e `AppSidebar`; migrar todos antes de apagar os dois arquivos antigos.
- [ ] Verificar visualmente que desktop e mobile nunca aparecem simultaneamente no breakpoint.

## Task 9: Correct Restaurant Error Semantics and Deduplicate Data

**Files:**

- Modify: `src/server/dal/restaurants.ts`
- Modify: `src/server/dal/auth.ts`
- Create: `src/server/dal/restaurant-workspace.ts`
- Modify: `src/app/painel/restaurantes/[id]/layout.tsx`
- Modify: `src/app/painel/restaurantes/[id]/page.tsx`
- Modify: pages below `src/app/painel/restaurantes/[id]/**` that fetch the same restaurant/role
- Modify: `src/app/painel/error.tsx`
- Create: `src/app/painel/not-found.tsx`
- Modify: `src/app/admin/error.tsx`
- Modify: `src/app/admin/not-found.tsx`
- Create: `src/components/shell/route-error-state.tsx`

- [ ] Reler os guias locais do Next.js sobre `notFound`, error boundaries e cache antes da alteração.
- [ ] Em `getRestaurantForMember`, `getRestaurantForAdmin` e `myRole`, separar os casos de erro e ausência. `myRole` devolve `null` apenas quando o RPC responde sem papel; erro do RPC lança exceção segura.

```ts
const { data, error } = await query.maybeSingle();

if (error) {
  throw new Error("Não foi possível carregar o restaurante.", {
    cause: error,
  });
}

return data ?? null;
```

- [ ] Não vazar mensagem SQL, URL Supabase, token, stack ou detalhes internos para a interface.
- [ ] Criar `getRestaurantWorkspace` com `cache` de React e derivar `canEdit` de uma função de autorização já existente, não de duplicação textual da regra:

```ts
import { cache } from "react";

export const getRestaurantWorkspace = cache(async (restaurantId: string) => {
  const [restaurant, role] = await Promise.all([
    getRestaurantForMember(restaurantId),
    myRole(restaurantId),
  ]);

  if (!restaurant) return null;

  return {
    restaurant,
    role,
    canEdit: role === "admin",
  } satisfies RestaurantWorkspace;
});
```

- [ ] Importar `MemberRole` de `src/domain/invite.ts`; os papéis reais são `admin`, `cashier`, `attendant` e `waiter`, e somente `admin` habilita edição na interface atual.
- [ ] Fazer layout e páginas chamarem a mesma função cacheada. O layout usa `notFound()` somente quando o retorno é `null`.
- [ ] Preservar `requireRestaurantAdmin` nas mutations administrativas; o DTO do shell não substitui autorização de servidor.
- [ ] Criar `RouteErrorState` cliente com título seguro, mensagem contextual, botão `Tentar novamente` ligado a `reset()` e link de saída para `/restaurantes`.
- [ ] Diferenciar visualmente 404 real (“restaurante não encontrado ou sem acesso”) de falha recuperável (“não foi possível carregar agora”).
- [ ] Inspecionar com busca estática todos os padrões `if (error || !data) return null` em DALs usados por admin/painel e corrigir somente onde a função promete “não encontrado”.
- [ ] Validar manualmente quatro fluxos: UUID válido, UUID inexistente, usuário sem acesso e backend indisponível/timeout. Apenas o UUID inexistente ou sem acesso pode terminar em 404.

## Task 10: Rework Shared Page Primitives and States

**Files:**

- Modify: `src/components/shell/page-header.tsx`
- Modify: `src/app/admin/loading.tsx`
- Modify: relevant `src/app/painel/**/loading.tsx`
- Modify: `src/components/auth/auth-shell.tsx`
- Modify: `src/components/auth/sign-in-form.tsx`
- Modify: `src/components/auth/sign-up-form.tsx`

- [ ] Redesenhar `PageHeader` com eyebrow opcional, título, descrição, ações, alinhamento responsivo e largura de leitura; manter API pequena:

```ts
type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
};
```

- [ ] Padronizar container de página: largura máxima adequada, gutters 20/24/32 px e ritmo vertical previsível.
- [ ] Substituir spinners isolados por skeletons que reproduzam a geometria real da página correspondente.
- [ ] Padronizar empty states com ícone, título, descrição e CTA; evitar caixas gigantes quando há pouco conteúdo.
- [ ] Redesenhar AuthShell com marca `TV`/`Tavvi`, Inter, painel focado e feedbacks claros, sem sidebar.
- [ ] Manter labels persistentes em inputs, mensagens de erro próximas ao campo e foco visível.
- [ ] Garantir que botões pending preservem largura e incluam texto de estado, não apenas spinner.
- [ ] Verificar contraste, zoom a 200%, ordem de foco e ausência de scroll horizontal a 320 px.

## Task 11: Redesign Admin Pages

**Files:**

- Modify: `src/app/admin/page.tsx`
- Modify: `src/app/admin/restaurantes/page.tsx`
- Modify: `src/app/admin/restaurantes/[id]/page.tsx`
- Modify: `src/components/convites/invite-list.tsx`
- Modify: `src/components/convites/invite-dialog.tsx`

- [ ] Transformar a home/Convites em página com PageHeader, CTA primário, resumo compacto e listagem legível.
- [ ] Desktop: tabela com cabeçalho discreto, densidade confortável, badges semânticos e ações alinhadas.
- [ ] Mobile: cards próprios para convite; não comprimir a tabela nem depender de scroll horizontal.
- [ ] Redesenhar o diálogo de convite com hierarquia, descrição de consequência, validação e pending state.
- [ ] Redesenhar Restaurantes com endereço/slug, tipo, status e ação principal. Tornar a linha/célula de nome navegável com foco visível.
- [ ] Mobile: cards de restaurante com status e ação explícita; preservar toda informação importante.
- [ ] Redesenhar detalhe administrativo com informações agrupadas por significado, não uma grade arbitrária de cards.
- [ ] Garantir estados vazio, carregando e erro coerentes com Task 10.
- [ ] Comparar screenshots em 1440, 1024, 768, 375 e 320 px com a hierarquia aprovada no spec.

## Task 12: Redesign Restaurant Selection and Menu Workspace

**Files:**

- Modify: `src/app/painel/restaurantes/page.tsx`
- Modify: `src/app/painel/restaurantes/[id]/page.tsx`
- Modify: `src/components/cardapio/category-section.tsx`
- Modify: `src/components/cardapio/item-row.tsx`
- Modify: `src/components/cardapio/category-dialog.tsx`
- Modify: `src/components/cardapio/new-category-button.tsx`
- Modify: `src/components/cardapio/item-create-dialog.tsx`
- Modify: `src/components/cardapio/item-edit-dialog.tsx`
- Modify: `src/components/cardapio/new-item-button.tsx`
- Modify: `src/components/cardapio/reorder-buttons.tsx`
- Modify: `src/components/cardapio/variants-editor.tsx`
- Modify: `src/components/cardapio/media-editor.tsx`
- Modify: `src/components/cardapio/media-dropzone.tsx`
- Modify: `src/components/cardapio/media-item.tsx`
- Modify: `src/components/cardapio/media-focal.tsx`
- Modify: `src/components/painel/publish-bar.tsx`

- [ ] Redesenhar seleção de restaurantes como cards claros e acionáveis, incluindo slug, tipo, status e affordance de entrada.
- [ ] No workspace de cardápio, usar PageHeader e uma barra de publicação compacta que não compita com o conteúdo.
- [ ] Categorias devem ser seções ordenáveis com título, contagem, estado de visibilidade e ações previsíveis.
- [ ] Itens devem mostrar nome, descrição resumida, preço, disponibilidade e ação sem exigir hover para descobrir controles essenciais.
- [ ] Em mobile, converter linhas em cards compactos; manter drag handles apenas quando realmente operáveis por toque e oferecer alternativa por menu/ações.
- [ ] Aplicar motion somente a mudanças que explicam estado: expandir categoria, inserir/remover item, feedback de publicação. Respeitar reduced motion.
- [ ] Preservar integralmente o visual do cardápio público; limitar mudanças aos componentes de edição listados nesta task.
- [ ] Verificar manualmente edição, reordenação, ações destrutivas, publicação e navegação de volta ao seletor.

## Task 13: Redesign Identity, Contact, Team, and Onboarding

**Files:**

- Modify: `src/app/painel/restaurantes/[id]/identidade/page.tsx`
- Modify: `src/app/painel/restaurantes/[id]/contato/page.tsx`
- Modify: `src/app/painel/restaurantes/[id]/equipe/page.tsx`
- Modify: `src/app/painel/restaurantes/[id]/comecar/page.tsx`
- Modify: `src/components/painel/identity-form.tsx`
- Modify: `src/components/painel/profile-form.tsx`
- Modify: `src/components/painel/member-row.tsx`
- Modify: `src/components/painel/brand-images.tsx`
- Modify: `src/components/painel/theme-preview.tsx`
- Modify: `src/components/convites/invite-dialog.tsx`

- [ ] Identidade: agrupar marca, tipografia, cores e imagens em seções progressivas; manter preview visível sem dominar o formulário.
- [ ] O preview deve continuar usando a identidade escolhida pelo restaurante, nunca Inter forçada dentro da simulação do cardápio.
- [ ] Contato: agrupar dados públicos, endereço e canais; usar helper text para formatos e consequências de publicação.
- [ ] Equipe: desktop com tabela limpa; mobile com cards de membro. Mostrar papel, status e ações com permissões reais.
- [ ] Onboarding: transformar em sequência curta com progresso, objetivo de cada etapa, validação local e CTA consistente; preservar rotas/actions atuais.
- [ ] Brand images: áreas de upload com preview, estado vazio, progresso/pending e instrução de proporção/formato já aceitos pelo backend.
- [ ] Ações destrutivas devem exigir confirmação já existente ou diálogo explícito, sem confirmação por `window.confirm` se houver componente Radix disponível.
- [ ] Usuários sem `canEdit` veem dados em modo leitura e não recebem controles que falharão no servidor; autorização real continua nas actions.
- [ ] Verificar manualmente estados com e sem imagem, equipe vazia, convite pendente, usuário sem permissão e campos inválidos.

## Task 14: Accessibility, Responsive, and Cleanup Pass

**Files:**

- Modify: somente os arquivos listados nas Tasks 1–13 quando a inspeção final encontrar um problema objetivo
- Remove: `src/components/shell/app-sidebar.tsx`
- Remove: `src/components/shell/app-shell.tsx`
- Update: `docs/superpowers/specs/2026-09-21-tavvi-shell-admin-painel-design.md` only if implementation reveals an approved design discrepancy

- [ ] Buscar imports mortos dos componentes removidos e referências visuais antigas (`font-display`, Fraunces, topbar, sidebar Sheet genérica).
- [ ] Confirmar que nenhuma superfície privada usa família diferente de Inter, exceto previews deliberados do cardápio.
- [ ] Confirmar que todos os controles icon-only têm accessible name e tooltip quando apropriado.
- [ ] Percorrer toda a navegação por teclado: sidebar, flyouts, paleta, dialogs, dock mobile, formulários e logout.
- [ ] Confirmar foco visível, Escape, retorno de foco e bloqueio de scroll em overlays.
- [ ] Confirmar ausência de hover-only actions essenciais e ausência de scroll horizontal a 320 px.
- [ ] Verificar contraste em claro/escuro e reduced motion.
- [ ] Inspecionar no navegador as rotas:
  - `/admin`
  - `/admin/restaurantes`
  - `/restaurantes`
  - `/restaurantes/:id`
  - `/restaurantes/:id/identidade`
  - `/restaurantes/:id/contato`
  - `/restaurantes/:id/equipe`
  - `/restaurantes/:id/comecar`
  - autenticação e convite
- [ ] Reproduzir especificamente o acesso direto a `/restaurantes/09c1356e-55b2-43c9-b002-cf1ebf3344cb`, reload e navegação interna. Confirmar que falha transitória mostra error boundary e que restaurante existente abre/redirecta corretamente.
- [ ] Usar apenas leitura estática, busca com `rg` e inspeção no navegador como verificação. Não executar nenhum dos comandos proibidos pelo `AGENTS.md`.

---

## Manual Acceptance Checklist

- [ ] Desktop sidebar é visual e comportamentalmente equivalente à referência Suite, adaptada à marca Tavvi e à paleta teal.
- [ ] Sidebar persiste 260/64 px, `Ctrl/Cmd+B` funciona e não dispara em campos editáveis.
- [ ] Mobile dock replica Conta/Início/Menu com overlays acessíveis, safe area e body lock.
- [ ] `Ctrl/Cmd+K` abre uma paleta funcional em admin e painel.
- [ ] `Ctrl+Alt+T`/`AltGr+T` percorre sistema/claro/escuro e persiste sem flash incorreto.
- [ ] Admin, painel, autenticação e onboarding usam Inter; cardápio público conserva as fontes da identidade selecionada.
- [ ] 404 ocorre somente para recurso ausente ou sem acesso; timeout/erro de infraestrutura oferece retry.
- [ ] A consulta de contexto do restaurante é deduplicada por request.
- [ ] Tabelas têm representação mobile em cards, sem conteúdo truncado ou scroll horizontal obrigatório.
- [ ] Todos os estados loading, empty, error, disabled e pending estão visíveis e coerentes.
- [ ] A interface funciona em claro/escuro, teclado, reduced motion e larguras de 320 a 1440 px.

## Plan Self-Review

- [x] Conferir cada requisito do spec e mapear para ao menos uma task/checklist acima.
- [x] Buscar placeholders vagos neste plano e substituir instruções não executáveis por critérios concretos.
- [x] Confirmar consistência dos tipos `TavviShellConfig`, `NavItem`, `RestaurantWorkspace` e nomes de roles com o código real antes da primeira edição.
- [x] Confirmar que nenhum passo manda executar os comandos proibidos pelo `AGENTS.md`.
- [x] Confirmar que nenhuma task altera o cardápio público fora do isolamento tipográfico necessário.
