# Painel do restaurante Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task by task. Track each step with the checkboxes below.

**Goal:** Migrar o painel do restaurante para o sistema visual Tavvi e entregar Cardápio, Identidade, Contato e Equipe com os contratos atuais e experiência responsiva da spec.

**Architecture:** Generalizar a casca Console com uma configuração específica do restaurante, preservando a configuração administrativa. Manter páginas de leitura no servidor, componentes interativos no cliente e todas as gravações nas actions existentes; nenhuma migration ou assinatura de action nova entra neste escopo. Implementar as páginas e modos em etapas pequenas, mantendo a experiência mobile alinhada a cada etapa.

**Tech Stack:** Next.js instalado no repositório, React, TypeScript, Tailwind/CSS do projeto, `react-icons/lu`, Zod, server actions e DAL existentes.

**Spec:** `handoff-painel/SPEC.md`

## Global Constraints

- Não executar `git`, `test`, `typecheck`, `build` ou `lint`.
- Não criar testes nem migrations; não alterar assinaturas de actions, predicados de autorização, `proxy.ts`, territórios ou RLS.
- Preservar as três camadas de autorização: exibição por `canEdit`, DAL e RLS.
- Aplicar tokens `--tv-*` apenas ao escopo `.territorio-painel`; manter o cardápio público isolado.
- Usar `Plus Jakarta Sans` e `JetBrains Mono` pelos tokens de fonte existentes.
- Preservar as regras do domínio: descrição até 500 no restaurante e 600 no item; focal de 0 a 1; cores base dentro de `isBaseInRange`.
- Não implementar duplicação, seleção em massa, horário de funcionamento ou endereço estruturado.
- Telefone e WhatsApp são persistidos como dígitos com prefixo `55`; formatação ocorre no campo de edição.
- Logo e capa são recomendações, não bloqueios de publicação. A checagem de publicação segue o contrato atual, sem considerar visibilidade da categoria.
- Não adicionar dependências sem necessidade demonstrada; seguir os guias locais da versão instalada do Next antes de qualquer alteração de código.

## Review Focus

Inspecionar manualmente no código durante a implementação; nenhuma suíte ou comando de teste será executado.

1. Papel sem edição: só Cardápio aparece e controles de mutação não são renderizados; DAL/RLS seguem como barreiras.
2. Restaurante suspenso: publicar/despublicar não aparece; mensagem permanece legível e sem ação de dono.
3. Publicação com categoria oculta: a UI espelha a validação atual de itens visíveis e mídia, sem inventar condição de `category.isVisible`.
4. Identidade: todos os temas respeitam `baseRange`, `isBaseInRange` e o isolamento das fontes `--tf-*` na prévia.
5. Equipe: convites vencidos/revogados/resgatados não aparecem como pendentes; erro do último administrador é mostrado sem vazamento técnico.

---

## File Map

- `src/app/globals.css`: incluir `.territorio-painel` nos tokens e fontes Tavvi, sem alterar `.cardapio-publico`.
- `src/components/console/console-config.ts`: generalizar folha, ícone, rota e metadados para Console admin e painel.
- `src/components/console/console-shell.tsx`, `rail.tsx`, `mobile-dock.tsx`, `account-popover.tsx`, `command-palette.tsx`: consumir configuração e identidade da conta/contexto sem regressão do admin.
- `src/app/painel/restaurantes/[id]/layout.tsx`: montar config do restaurante a partir do workspace, papel, usuário e `getRestaurantNavigation`.
- `src/app/painel/restaurantes/[id]/page.tsx` e `src/components/cardapio/*`: cardápio, modos, busca, filtros, editor, mídia e publicação.
- `src/app/painel/restaurantes/[id]/identidade/page.tsx`, `src/components/painel/identity-form.tsx`, `theme-preview.tsx`, `brand-images.tsx`: identidade e prévia isolada.
- `src/app/painel/restaurantes/[id]/contato/page.tsx`, `src/components/painel/profile-form.tsx`: contato e normalização de canais.
- `src/app/painel/restaurantes/[id]/equipe/page.tsx`, `src/components/painel/member-row.tsx`, `src/components/convites/*`: equipe, papéis e convites.
- `src/app/painel/restaurantes/[id]/**/loading.tsx` e componentes de estado: skeletons e estados vazios/bloqueados.
- Criar componentes menores em `src/components/painel/` ou `src/components/cardapio/` quando uma tela exigir estado client-side que hoje não existe; manter cada arquivo focado por responsabilidade.

## Tasks

### Task 1: Tokens Tavvi e casca compartilhada do painel

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/components/console/console-config.ts`
- Modify: `src/components/console/console-shell.tsx`
- Modify: `src/components/console/rail.tsx`
- Modify: `src/components/console/mobile-dock.tsx`
- Modify: `src/components/console/account-popover.tsx`
- Modify: `src/components/console/command-palette.tsx`
- Modify: `src/app/painel/restaurantes/[id]/layout.tsx`
- Read before editing: `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`, `05-server-and-client-components.md`, `04-linking-and-navigating.md`; relevant CSS guide in `node_modules/next/dist/docs/01-app/01-getting-started/11-css.md`.

**Interfaces:**
- `getRestaurantNavigation(id, canEdit)` remains the source of route visibility.
- The generalized `ConsoleConfig` must carry leaves with stable string keys, `href`, label, description/subtitle, icon, context label, user label, role label, and a home href. Admin config continues to supply the existing platform routes and counts.
- The restaurant config maps the existing nav icons to `LuBookOpen`, `LuPalette`, `LuContact`, and `LuUsers`; no leaf is synthesized for a role that lacks permission.

- [x] Add panel tokens to both light and dark `.territorio-painel` selectors; change the panel base font to `--font-tavvi` and mono to `--font-tavvi-mono`.
- [x] Extend Console leaf/config types to support panel routes and context/account labels while retaining current admin defaults.
- [x] Make Rail icon lookup handle the four panel icons; show “Painel” and restaurant name in its context header, with 88px collapsed and 248px pinned widths for the restaurant; admin remains 80px/272px.
- [x] Pass account description `MEMBER_ROLE_LABELS[role] · restaurant name`; keep theme controls and sign out behavior unchanged.
- [x] Parameterize MobileDock home destination and labels so panel “Início” opens the restaurant menu; retain admin counts and links.
- [x] Make CommandPalette accept optional action entries so “Novo convite” remains in admin and panel only exposes available pages/theme.
- [x] Replace `TavviShell` in the restaurant layout with the shared Console shell, deriving config only from existing workspace/user/navigation data.
- [x] Review both admin and panel shell call sites in source; confirm public menu selectors/styles were not widened.

### Task 2: Cardápio base, publicação e modos Ver

**Files:**
- Modify: `src/app/painel/restaurantes/[id]/page.tsx`
- Modify: `src/components/painel/publish-bar.tsx`
- Modify/reuse: `src/components/cardapio/category-section.tsx`, `item-row.tsx`, `category-dialog.tsx`, `item-edit-dialog.tsx`, `item-create-dialog.tsx`, `media-editor.tsx`, `media-focal.tsx`, `variants-editor.tsx`, `reorder-buttons.tsx`
- Create focused components under `src/components/cardapio/` for mode tabs, menu toolbar, filters, index rail, and grid view if current components cannot own that state cleanly.

**Interfaces:**
- Input remains `OwnerMenuCategoryDTO[]`, restaurant DTO/status, `canEdit`, and existing actions.
- `localStorage` key for mode/preferences includes restaurant id; data is presentation state only.
- Publish calls `setPublishedAction`; owner DTO `semMidia` remains the source for no-media filter/count.

- [ ] Build shared page header, publication checklist, public link, copy/open actions, status for `draft`/`active`/`suspended`; mirror existing server checks exactly.
- [ ] Add Lista, Índice, Grade tabs and persist the selected mode per restaurant; keep `canEdit=false` read-only.
- [ ] Implement list category/item display, empty category state, item search and counts for Todos/Sem mídia/Indisponíveis/Ocultos.
- [ ] Keep sorting disabled while search/filter changes visible order; send full `{ id, position }[]` arrays to reorder actions and restore local order on `ActionResult` failure.
- [ ] Reuse current item/category dialogs and wire create/update/delete/availability/move/visibility actions; keep destructive confirmations for item/category deletion and omit duplicate/bulk selection controls.
- [ ] Preserve upload sequence (ticket → upload → register), six-media cap, media ordering, focal values 0–1, and variant actions.
- [ ] Use only `--tv-*` for panel chrome; verify preview/public-card styles stay in their own scope.

### Task 3: Cardápio modos Trabalhar

**Files:**
- Modify/create focused components in `src/components/cardapio/`.
- Modify: `src/app/painel/restaurantes/[id]/page.tsx` only for mode composition/data passed to components.

**Interfaces:**
- The same category/item DTO and existing item/reorder actions as Task 2; no new server contract.
- Mode selection remains client-side and keyed per restaurant.

- [ ] Implement Estúdio with inline item selection/editor and isolated live preview; edits call `updateItemAction` and existing media/variant actions.
- [ ] Implement Quadro with category columns; moving an item updates `categoryId` then reorders both source and destination arrays through existing actions.
- [ ] Implement Planilha with name/category/price editing, Enter-to-save, Escape-to-revert, visibility toggle, and availability toggle.
- [ ] Implement Sequência using the public feed inclusion predicate: visible category, visible item, media present; show unavailable items with “Esgotado” and calculate real feed position.
- [ ] Implement Serviço availability cards and “Tudo disponível de novo” using only `setItemAvailabilityAction`.
- [ ] Keep these modes hidden from read-only roles except Lista, Índice, Grade and read-only Sequência.

### Task 4: Identidade e prévia

**Files:**
- Modify: `src/app/painel/restaurantes/[id]/identidade/page.tsx`
- Modify: `src/components/painel/identity-form.tsx`, `brand-images.tsx`, `theme-preview.tsx`
- Create focused preview component under `src/components/painel/` if needed.

**Interfaces:**
- Save only through `updateIdentityAction`; image uploads use `createBrandUploadTicketAction` and `setBrandImageAction`.
- Theme preset options come from `PRESETS`, segment suggestions from `PRESETS[*].segments`, and base validation from `isBaseInRange`.

- [ ] Arrange the editor and 300px fixed preview; make the phone preview 236×484 on desktop and a 146px collapsible preview on mobile.
- [ ] Wire logo/cover replace and remove flows, preserving `storagePath: null` for removal.
- [ ] Render preset cards with existing display-font/name/face data; generate base options only inside the preset's `baseRange` and validate before save.
- [ ] Keep preset preview typography (`--tf-*`) scoped to its preview container; do not inherit Tavvi tokens into the public menu.
- [ ] Add light/dark preview toggle, density selection and sticky save/reset status with `base` and `accent` restored to `null`.

### Task 5: Contato e normalização

**Files:**
- Modify: `src/app/painel/restaurantes/[id]/contato/page.tsx`
- Modify: `src/components/painel/profile-form.tsx`
- Read: `src/components/cardapio-publico/menu-cover.tsx`, `src/domain/restaurant.ts`.

**Interfaces:**
- Save through `updateRestaurantProfileAction` and current `updateRestaurantProfileSchema`; no schema expansion.
- Phone/WhatsApp canonical saved form is ASCII digits with `55` prefix; public links continue stripping non-digits.

- [ ] Render About, Channels and single-field Address sections plus a themed public-card preview; omit business hours and address-parts controls.
- [ ] Format Brazilian phone inputs for display and normalize to digits with `55` before building the action payload; ensure editing existing canonical numbers displays local formatting without duplicating `55`.
- [ ] Normalize Instagram by removing a leading `@` and validate client presentation without changing server schema limits.
- [ ] Preserve the 500-character description limit; add discard/save state and `ActionResult` messages.
- [ ] Keep sticky save controls above MobileDock at small widths.

### Task 6: Equipe

**Files:**
- Modify: `src/app/painel/restaurantes/[id]/equipe/page.tsx`
- Modify: `src/components/painel/member-row.tsx`
- Modify/reuse: `src/components/convites/invite-dialog.tsx`, `src/components/convites/invite-list.tsx`
- Read: `src/server/dal/members.ts`, `src/server/dal/invites.ts`, `src/domain/invite.ts`.

**Interfaces:**
- Members from `listMembers`; invites from `listInvites`; status from `inviteStatus`/`INVITE_STATUS_LABELS` and role metadata from `MEMBER_ROLE_LABELS`/`MEMBER_ROLE_HINTS`.
- Mutations remain `changeMemberRoleAction`, `removeMemberAction`, `createTeamInviteAction`, `revokeInviteAction`.

- [ ] Render role cards using current labels/hints and distinguish edit/read access.
- [ ] Keep self role control disabled; map role updates/removals to existing actions and show the DAL's last-admin message without raw database errors.
- [ ] Derive invite status and show only pending invitations in the pending list; implement copy and revoke flows.
- [ ] Invite modal supports current four roles and 1/7/30 day choices with `createTeamInviteSchema` bounds.
- [ ] Render empty state when there is only the current member; use bottom sheet layout on mobile.

### Task 7: Mobile gestures, sheets and accessibility

**Files:**
- Modify/create focused components under `src/components/cardapio/` and `src/components/painel/`.
- Modify: `src/components/console/mobile-dock.tsx`, `src/app/globals.css` only where shared mobile tokens/layout require it.

**Interfaces:**
- All gestures call the same existing actions as their desktop controls. No gesture creates a new data contract.
- Respect `prefers-reduced-motion`; all tap targets are at least 44px.

- [ ] Convert item editor and dialogs to sheets; support 60%/100% editor height, drag-up expansion (>70px) and drag-down close (>110px), plus explicit expand/collapse controls.
- [ ] Implement item swipe right availability toggle (80px), swipe left delete affordance (88px), 480ms long-press menu without duplicate/multi-select, and pull-to-refresh with `router.refresh()`.
- [ ] Add reorder handle mode with 76px row targets and disable swipe gestures while reordering.
- [ ] Implement mobile two-column grid, studio tabs, board `scroll-snap`, compact spreadsheet, and one-column sequence/service layouts.
- [ ] Verify dock navigation uses panel home href, account sheet displays restaurant role/context, menu sheet lists only permitted routes, and save bars clear the dock safe area.
- [ ] Apply reduced-motion behavior (state change without spring) and keyboard/escape/focus behavior to sheets and menus.

### Task 8: Loading, empty, blocked and final source review

**Files:**
- Modify: `src/app/painel/restaurantes/[id]/loading.tsx`, `identidade/loading.tsx`, `contato/loading.tsx`, `equipe/loading.tsx`
- Modify focused components from Tasks 1–7.

- [ ] Match each route's loading skeleton to its final page structure.
- [ ] Add normal, draft, blocked, empty, read-only and loading states required by the spec, including suspended restaurant behavior.
- [ ] Review the spec's token map against the implemented CSS variables; search panel components for hard-coded palette hex values and replace with `--tv-*` except restaurant preview values supplied by `PRESETS`.
- [ ] Inspect action call sites and render conditions to confirm admin access is never inferred from client state and no action signature/auth predicate changed.
- [ ] Review the public menu files and confirm no `.territorio-painel`/Tavvi styles leaked into `components/cardapio-publico/*`.
- [ ] Stop without running any prohibited command or test suite; report source-review limitations explicitly.

## Plan Self-Review

- Coverage: Tasks 1–8 cover spec sections 0–7 and the approved decisions in section 9; section 8 ordering is preserved, with mobile polish consolidated after page controls exist.
- No schema or action changes: all writes route through the existing action names and Zod contracts listed in the spec.
- No tests or forbidden commands: project instructions explicitly prohibit tests and the named commands, so review checkpoints are source inspection and the final result must not claim runtime verification.
- Type dependencies: Task 1 produces generalized Console leaf/config props used by the panel layout and shared shell; Tasks 2–3 share owner DTO/actions; Task 7 consumes those controls without changing action contracts.