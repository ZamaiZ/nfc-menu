# Tavvi Console Rebrand Implementation Plan

> **For agentic workers:** Execute the tasks in order. Keep changes inside `nfc-menu`; do not use the read-only `tavvi-mobile` or `post-login-rebrand/` references as edit targets.

**Goal:** Replace the visual identity and admin workflows under `src/app/admin/**` with the Tavvi Console experience while preserving authorization, data isolation, and the existing `/painel` shell.

**Architecture:** Add a distinct `src/components/console/` client shell and page component system, mounted only by the admin layout. Keep data access in the existing DAL/actions and use the specified platform invite RPCs. Build list and detail routes with server data and focused client overlays, then layer responsive navigation, status, and motion behavior over the canonical tokens.

**Tech Stack:** Next.js App Router (installed version; read local guides before coding), React, TypeScript, Tailwind CSS v4 utility classes, Base UI, shadcn primitives, `react-icons/lu`, `next/font/google`, existing theme/store/action/DAL conventions.

**Spec:** `docs/superpowers/specs/2026-09-23-tavvi-console-rebrand-design.md` (canonical requirements supplied in the user request on 2026-09-23; save them at this path before implementation if the design document is not yet present).

## Global Constraints

- Never run `git`, `typecheck`, `build`, `lint`, or `test`; do not create tests.
- Do not alter authorization predicates, `proxy.ts`, `safeNextPath`, `signInAction`, territory mapping, or RLS.
- Do not modify `/painel/*`, public menu files (`cardapio-publico/*`, `theme.css`), the website, or delivered login files (`auth/tavvi/*`).
- New console components live in `src/components/console/`; do not replace shell components still used by `/painel`.
- Component colors must use `--tv-*` tokens. Fixed hero, lime CTA, and dark mobile dock use the named fixed tokens `--tv-hero`, `--tv-lime`, `--tv-ink`, and `--tv-dock` only.
- Declare component presentation with Tailwind utility classes in JSX. Do not add component selectors such as `.tv-console-*`, `.tv-list-hero`, or `.tv-detail-drawer` to `globals.css`. Compose reusable styles through focused React components and `cn(...)`, not global CSS class abstractions.
- `globals.css` may hold the canonical `--tv-*` tokens and shadcn bridge, font variables, Tailwind theme mappings, and keyframes/animation definitions that utilities reference. Add missing `--color-tv-*` entries to `@theme inline` so components can use named utilities such as `bg-tv-panel`, `text-tv-muted`, and `border-tv-line`.
- Use Tailwind arbitrary values/utilities for exact dimensions and token values (`rounded-[22px]`, `bg-[var(--tv-surface)]`, responsive variants, group/peer selectors, reduced-motion variants). Inline styles are limited to measured/runtime geometry such as SVG `d`, dynamic clip paths, and spring-driven position/size values; they must not carry component colors or ordinary static presentation.
- Use `react-icons/lu`, Plus Jakarta Sans (`--font-tavvi`), and JetBrains Mono (`--font-tavvi-mono`, weight 500) as specified.
- Treat all values in the design as canonical when a prototype differs.
- Before writing Next.js code, read the matching installed guides in `node_modules/next/dist/docs/` for App Router, `template.tsx`, `searchParams`, `useLinkStatus`, and Server Actions. Follow this repo's installed Next version and its deprecation notes.
- Navigation items are discriminated by `kind`: a `leaf` has a real `href` and is rendered as a link; a `group` is a container/flyout, not a destination. Tooltips on collapsed rail leafs show that leaf's label and preserve its link. A group must never be turned into a fake leaf, assigned a route, or receive a destination tooltip in place of its flyout. Disabled leafs remain non-navigable. Preserve `aria-current` and active matching only for real leaf routes.
- Keep behavior and UI tests out of the implementation; manually inspect the specified acceptance states instead.

## Review Focus

- **Leaf/group distinction:** nested admin navigation data must distinguish a clickable route from a grouping label. Verify that only real leaf links receive label tooltips, groups open the navigation flyout, and neither `href` nor active state is fabricated for groups.
- **Root route matching:** `/` must activate Convites only at the exact root; `/convites/<id>` activates it by explicit `activeMatch`; unrelated paths and `/restaurantes...` must not.
- **Deep-link overlay validity:** invalid or missing invite/restaurant IDs must not render stale drawers; remove the invalid query parameter without changing authorization behavior.
- **Rotation and one-time link display:** rotation keeps recipient and expiry semantics, revokes the prior pending invite through the approved RPC, and exposes the new link only once in the created state.
- **Theme/token isolation:** admin token overrides must not leak into `/painel`, the public menu, or login; verify both themes and remaining shadcn primitives in admin.
- **Utility-class completeness:** all newly authored component styles, including hover/focus/mobile/reduced-motion states, must be represented by Tailwind utilities. Any remaining new global component selector is a migration miss; token definitions and keyframes are allowed.

---

## File Map

### New files

- `src/components/console/console-shell.tsx`: compose the admin desktop/mobile shells, route state, and overlay/action context.
- `src/components/console/console-config.ts`: serializable `ConsoleNavItem` types and `getConsoleConfig(user)`; navigation contains only authorized admin routes/actions already permitted by current access checks.
- `src/components/console/liquid-frame.tsx`, `use-liquid-pocket.ts`: SVG panel path and ref-driven spring animation, without React renders per animation frame.
- `src/components/console/rail.tsx`, `rail-flyout.tsx`, `account-popover.tsx`, `command-palette.tsx`, `rail-store.ts`, `mobile-dock.tsx`, `page-stage.tsx`: navigation, theme/account, command actions, persisted rail, responsive dock, and route entrance.
- `src/components/console/list-hero.tsx`, `toolbar.tsx`, `data-table.tsx`, `tv-badge.tsx`, `drawer.tsx`, `confirm-dialog.tsx`, `buttons.tsx`, `field.tsx`, `info-list.tsx`, `timeline.tsx`, `state-card.tsx`: reusable admin page primitives.
- `src/components/console/invites/{invite-table,invite-cards,invite-detail,invite-sheet,invite-drawer}.tsx`: invite list, details, create/rotate, and revoke flows.
- `src/components/console/restaurants/{restaurant-table,restaurant-cards,restaurant-detail,slug-field,status-options,restaurant-drawer}.tsx`: restaurant list, details, public URL, status, and removal flows.
- `src/app/admin/template.tsx`: segment-level entrance stage.
- `src/app/admin/convites/[id]/{page,loading}.tsx`: standalone invite deep link.
- `src/lib/format-date.ts`: timezone-stable Portuguese date formatting.

### Modified files

- `src/app/globals.css`: admin-only Tavvi tokens, shadcn bridge, motion, responsive and reduced-motion rules.
- `src/app/layout.tsx`: load JetBrains Mono and expose `--font-tavvi-mono`.
- `src/app/admin/{layout,page,loading,error,not-found}.tsx`: mount new shell, render invite list, and define territory states.
- `src/app/admin/restaurantes/{page,[id]/page,[id]/loading}.tsx`: list/detail server routes and loading state.
- `src/domain/{invite,restaurant}.ts`, `src/server/dal/{invites,restaurants}.ts`, `src/server/actions/invites.ts`: platform DTOs, RPC calls, rotation action, and restaurant detail fields.
- Reuse `src/lib/notched-path.ts`, existing theme hooks, `signOutAction`, restaurant actions, invite create/revoke actions, toast, and installed Base UI primitives where compatible.
- Keep legacy admin components that still have `/painel` or other importers; remove none in this project plan.

## Implementation Tasks

### Task 1: Inspect installed Next.js guidance and capture the canonical design document

**Files:**
- Create or confirm: `docs/superpowers/specs/2026-09-23-tavvi-console-rebrand-design.md`
- Read: `node_modules/next/dist/docs/` guides for App Router, `template.tsx`, `searchParams`, `useLinkStatus`, and Server Actions.
- Read: current `src/app/admin/layout.tsx`, navigation types/config/components, DAL/actions, theme hook, toast, and installed Base UI patterns.

- [ ] Read each required local Next guide before changing application code; note the installed API forms and deprecations in the implementation notes.
- [ ] Preserve the user's supplied specification at the canonical spec path, including its token tables, layout dimensions, endpoint behavior, and acceptance matrix. If that file already exists, compare it to the supplied requirements and update only missing/changed content.
- [ ] Record the nav invariant in the spec/implementation notes: `NavLeaf` is a real destination; `NavGroup` is a grouping/flyout container; tooltip label resolution must operate on the leaf under the pointer/focus and never infer a route from the group.
- [ ] Map existing component imports before replacing admin use so `/painel` retains its current shell and styles.

**Manual acceptance:** the design doc and local guide set are available to the implementer; the existing navigation model confirms `kind: 'leaf' | 'group'` and its callers are mapped before any rewrite.

### Task 2: Add console-only design tokens and mono font

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

- [ ] Add all theme-dependent and fixed `--tv-*` values from spec §3.1 under `.territorio-admin` and `.dark .territorio-admin`, preserving existing shared admin/login variables unless the spec explicitly replaces them.
- [ ] Add the shadcn variable bridge from spec §3.2 under both admin theme selectors, plus the `--ease-saida` motion curve and reduced-motion rules.
- [ ] Add `@theme inline` color mappings for the color tokens consumed as Tailwind utilities, including `tv-rail`, `tv-panel`, `tv-line`, `tv-line-strong`, `tv-accent`, `tv-accent-surface`, `tv-ok`, `tv-ok-surface`, `tv-neutral`, `tv-neutral-surface`, `tv-row-hover`, `tv-row-selected`, `tv-glass`, and `tv-scrim`. Use arbitrary utilities such as `shadow-[var(--tv-overlay-shadow)]` for non-color tokens.
- [ ] Add JetBrains Mono via `next/font/google`, weight 500 only, with variable `--font-tavvi-mono`; do not change public or `/painel` font assignments.
- [ ] Use no component-level hex values; fixed colors are referenced through the specified fixed tokens.
- [ ] Remove the newly added `.tv-*` shell and component presentation rules from `globals.css` after moving each corresponding style to the component's Tailwind `className`; retain only tokens, theme mappings, font plumbing, keyframes, and necessary base rules.

**Manual acceptance:** inspect admin and `/painel` token scopes in both theme classes; open an existing shadcn dialog/tooltip in admin and verify the bridge applies without changing the panel territory.

### Tailwind conversion order for all UI tasks

The following order is mandatory for Tasks 5–12 so the current in-progress implementation does not accrete more component CSS:

1. Convert shell geometry and navigation first (`console-shell`, liquid frame, rail, flyout, account, command palette, mobile dock). Use Tailwind responsive and state variants; preserve dynamic spring geometry as the only style values written directly to DOM.
2. Convert shared primitives (`ListHero`, toolbar, tables/cards, badges, drawer, sheet, dialogs, toast, skeletons). Prefer explicit `className` strings and `cn` variants; keep exact spec values as arbitrary utilities where no token utility exists.
3. Convert invite and restaurant details/lists, including row hover actions, selected drawer rows, mobile card alternatives, input focus/error states, and stacked overlays.
4. Remove the new component CSS block from `globals.css` only after no JSX references any removed `.tv-*` class. Preserve existing styles outside the new Console block, especially login, `/painel`, and public menu rules.
5. Search manually for each remaining `.tv-` selector and each component `className` that uses a `.tv-*` presentation hook. The only permitted `.tv-*` references are design token names and runtime `data-*` hooks with no matching component style selector.

**Visual correction carried forward:** the selected navigation leaf and liquid pocket share the vertical center of the viewport. The rail's brand/search stay at the top and account/pin controls stay at the bottom. Keep leaf tooltip and group flyout semantics separate while converting their classes.

### Task 3: Extend safe platform data contracts and date helpers

**Files:**
- Modify: `src/domain/invite.ts`, `src/domain/restaurant.ts`
- Modify: `src/server/dal/invites.ts`, `src/server/dal/restaurants.ts`
- Create: `src/lib/format-date.ts`

- [ ] Add `PlatformInviteDTO`, `InviteState`, and `inviteState()` exactly as specified; leave team `InviteDTO`/`listInvites` behavior intact.
- [ ] Change only platform admin listing to `list_platform_admin_invites()`, retain `requirePlatformAdmin()` before the RPC, map fields into the DTO, and sort descending by `createdAt`.
- [ ] Add `getPlatformInvite(id)` with UUID parsing, platform-admin enforcement, the `get_platform_admin_invite` RPC, and null for no row.
- [ ] Add `updatedAt` and `segment` to `RestaurantDetailDTO`; select `updated_at, segment` in `getRestaurantForAdmin` without changing its authorization or filtering.
- [ ] Add `formatLong` and `formatShort` using `Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' })` and stable parse handling for server/client parity.

**Manual acceptance:** inspect the mapping against migration `0016_mobile_admin_invites.sql`; confirm only the platform-admin path uses the platform RPC; compare representative dates on server-rendered and client-rendered surfaces.

### Task 4: Implement invite rotation server path

**Files:**
- Modify: `src/server/dal/invites.ts`, `src/server/actions/invites.ts`

- [ ] Implement `rotatePlatformInvite(id)` with UUID validation, platform-admin enforcement, the same rate-limit bucket as create, token generation/hash, and `rotate_platform_admin_invite(p_invite_id, p_token_hash)`.
- [ ] Map `P0002` to `UserFacingError('Convite não encontrado.')`; map `P0001` to `ConflictError('Somente convites pendentes podem gerar um novo link.')`.
- [ ] Record `invite.rotated` audit data with the new invite ID and `{ rotatedFrom: id }`; build the returned link with the existing `originFor('painel', protocol)` convention.
- [ ] Add `rotatePlatformInviteAction(inviteId)` through `runAction` and `revalidateListas()`.

**Manual acceptance:** review RPC parameter names and error codes against migration `0016_mobile_admin_invites.sql`; confirm audit subject references the new ID and rotation cannot bypass admin/rate-limit checks.

### Task 5: Build shared console shell configuration and navigation primitives

**Files:**
- Create: `src/components/console/console-config.ts`, `rail-store.ts`, `rail.tsx`, `rail-flyout.tsx`, `account-popover.tsx`, `command-palette.tsx`
- Reuse without changing panel behavior: `src/components/shell/navigation.types.ts`, `navigation.ts`, `command-palette-store.ts`, theme hook, `signOutAction`

- [ ] Define `ConsoleNavItem` keys, hrefs, `activeMatch`, label/subtitle/icon and `getConsoleConfig(user)`, with Convites (`/`, `/convites`) and Restaurantes (`/restaurantes`) only.
- [ ] Implement `isActive`: root href matches exact `/` only, then explicit `activeMatch` prefixes; restaurant match supports detail route.
- [ ] Build rail rows from real item objects. Use `<Link>` for each leaf. For collapsed navigation, put the tooltip on that leaf's trigger and derive its accessible label from the same leaf; do not attach it to the group container.
- [ ] Render any `kind: 'group'` as a flyout trigger/container, not an `href` target. Keep flyout child rows as real leaf links and use Escape to close. Never use a group label as the active route tooltip.
- [ ] Keep disabled leafs non-interactive and without pending navigation; preserve `aria-current="page"` only on the matching leaf.
- [ ] Add `tv_rail` cookie serialization, server-readable initial value, `useSyncExternalStore`, and Ctrl/⌘+B handling that ignores repeats and editable controls.
- [ ] Add account popover with focus/escape/outside handling, focus return, existing theme persistence, and pending sign-out UI.
- [ ] Reuse the existing command-palette store/hotkey mechanics in a separate Tavvi-styled component; include only config pages and the two specified actions.

**Manual acceptance:** with a nested nav fixture, leaf hover/focus shows its own label and remains a link; group hover opens the flyout and has no route semantics; disabled leaf does not navigate. Confirm exactly two admin pages appear in Ctrl/⌘+K and direct route matching remains correct.

### Task 6: Build liquid frame and desktop shell

**Files:**
- Create: `src/components/console/liquid-frame.tsx`, `use-liquid-pocket.ts`, `console-shell.tsx`
- Modify later in Task 9: `src/app/admin/layout.tsx`

- [ ] Implement the single SVG path using the provided `pocketPath` geometry and constants; render with static SSR fallback dimensions and initial rail cookie width.
- [ ] Keep simulation state in refs; integrate independent `cy` and `L` springs at fixed substeps, write path/rail/main geometry directly to DOM, and cancel rAF at rest.
- [ ] Measure shell dimensions with `ResizeObserver`; snap on resize, first client measurement, reduced motion, and `data-motion="off"`.
- [ ] Drive destination immediately from clicked leaf `pendingHref`; clear it when pathname changes and return to actual active item if navigation aborts.
- [ ] Implement desktop rail/panel geometry, flyout delays, label animations, avatar, and active item using the leaf/group rule from Task 5.
- [ ] Respect `prefers-reduced-motion`; do not put animated rail width or main left offset through React state or CSS transitions.

**Manual acceptance:** compare at 1440×900 and 1024×768; confirm rail and content move together, path reaches its target, pending active state starts before route resolution, resize snaps cleanly, and reduced motion snaps without translation.

### Task 7: Build mobile dock and shared overlay primitives

**Files:**
- Create: `src/components/console/mobile-dock.tsx`, `drawer.tsx`, `confirm-dialog.tsx`, `buttons.tsx`, `field.tsx`, `info-list.tsx`, `timeline.tsx`, `state-card.tsx`, `tv-badge.tsx`
- Reuse behavior patterns from: `src/components/shell/mobile-navigation.tsx`, installed Base UI, `src/components/ui/toast.tsx`

- [ ] Implement mobile dock, account/menu panels, scrim, safe-area insets, focus trap, Escape, and scroll lock; dock stays dark in both themes.
- [ ] Implement drawer and confirm dialog semantics/focus return with the specified stack order and pending action states.
- [ ] Implement status tone mapping and `TvBadge` labels for invite and restaurant states.
- [ ] Build shared button, form field, stepper, info list, timeline, and empty/error state primitives only from `--tv-*` tokens.
- [ ] Restyle/reuse toast with mobile top and desktop bottom placement and polite live announcement.

**Manual acceptance:** check 390×844 safe-area behavior and keyboard-only opening/closing; check drawer/dialog focus behavior and topmost Escape ordering; inspect all seven state badge labels in both themes.

### Task 8: Build list-page primitives and route entrance

**Files:**
- Create: `src/components/console/page-stage.tsx`, `list-hero.tsx`, `toolbar.tsx`, `data-table.tsx`
- Reuse: `src/lib/notched-path.ts`

- [ ] Implement desktop/mobile `ListHero`, notch measurement/fallback, brandmark watermark, summary, and CTA placement.
- [ ] Implement responsive `Toolbar` search and invite status chips with accessible radiogroup behavior and URL-controlled values.
- [ ] Implement table primitives with semantic table/row/cell roles, row overlay link, action buttons above it, hover/focus behavior, and selected row style.
- [ ] Add `PageStage` to stage the first three direct page blocks; reduced motion keeps opacity-only entrance.

**Manual acceptance:** inspect 1440×900, 1024×768, and 390×844 in both themes; resize hero while open and confirm notch measurement updates without jitter; confirm focus-visible action access and 200% zoom does not clip text.

### Task 9: Mount shell and convert invite list, URL filters, and deep links

**Files:**
- Modify: `src/app/admin/layout.tsx`, `src/app/admin/page.tsx`
- Create: `src/components/console/invites/invite-table.tsx`, `invite-cards.tsx`, `invite-drawer.tsx`

- [ ] Replace only the admin `TavviShell` with `ConsoleShell`; preserve existing access-denied logic and server-side admin gate.
- [ ] Fetch platform invite list and pending count through a `React.cache`-wrapped loader shared with layout where needed.
- [ ] Render desktop table at `lg` and mobile/tablet cards below it; apply invite state/search client-side over the complete small list.
- [ ] Keep `q`/`situacao` in the URL with 200 ms debounce; open/close `?convite=<uuid>` via `router.replace(..., { scroll: false })` only for desktop drawer state.
- [ ] Resolve the selected invite on the server; for invalid/missing IDs close the drawer and remove the query parameter. Cards link to `/convites/<uuid>`.
- [ ] Implement empty list and no-result states with the specified copy and counts announcement.

**Manual acceptance:** compare invite ordering/counts; test case-insensitive search, each status chip, no result, empty dataset, drawer deep link, and mobile card detail link. Verify query-only changes do not replay route entrance or reset scroll.

### Task 10: Implement invite details, create/rotate sheet, and revocation

**Files:**
- Create: `src/components/console/invites/invite-detail.tsx`, `invite-sheet.tsx`
- Modify: `src/components/console/console-shell.tsx`, invite drawer/list integration from Task 9
- Reuse actions: create/revoke invite actions and Task 4 rotation action

- [ ] Build `InviteDetail` hero, info rows, state-sensitive event timeline, action buttons, and pending/other-state behavior.
- [ ] Implement create/rotation sheet state in shell context, form validation, 1–30 day stepper, and server action submission.
- [ ] In created state, show link once, support clipboard fallback, require copy before “Já copiei o link,” and confirm discard if closing uncopied.
- [ ] On rotation success update selected drawer ID to the new invite ID; on create/rotate completion show toast and refresh list.
- [ ] Implement revoke confirmation and action; on success keep detail drawer open on Revogado and announce success.

**Manual acceptance:** exercise creation with blank/valid/invalid email; stepper boundaries; copy success/fallback; blocked confirmation until copy; discard confirmation; rotation pending-only error and ID handoff; revocation from row and detail.

### Task 11: Implement restaurant list, detail, and mutations

**Files:**
- Create: `src/components/console/restaurants/{restaurant-table,restaurant-cards,restaurant-detail,slug-field,status-options,restaurant-drawer}.tsx`
- Modify: `src/app/admin/restaurantes/page.tsx`, `src/app/admin/restaurantes/[id]/page.tsx`
- Reuse existing restaurant actions and validation; do not change DAL authorization predicates.

- [ ] Implement list search, desktop table, responsive cards, initials, segment fallback, state badges, and empty state.
- [ ] Add desktop `?restaurante=<uuid>` drawer and mobile/tablet `/restaurantes/<id>` page behavior; create the full detail route for desktop deep links as specified.
- [ ] Implement public link copy feedback and slug editor using the existing update action and validation, with normalization and conflict messaging.
- [ ] Implement status radio cards using existing status action; require the specified suspend confirmation and preserve current `StatusForm` suspension description literally.
- [ ] Implement creation/update dates and remove confirmation/action; on success leave the list without the removed restaurant and show toast.

**Manual acceptance:** test valid, invalid, and already-used slugs; public link copy; all status choices and suspension confirmation; removal from drawer and standalone detail; ensure a removed row disappears after refresh.

### Task 12: Add route states and segment-level transitions

**Files:**
- Create: `src/app/admin/template.tsx`, `src/app/admin/convites/[id]/page.tsx`, `src/app/admin/convites/[id]/loading.tsx`
- Modify: `src/app/admin/loading.tsx`, `error.tsx`, `not-found.tsx`, `src/app/admin/restaurantes/[id]/loading.tsx`

- [ ] Implement template-driven route entry and reset `<main>` scroll only when route segment changes; search-param-only overlay/filter changes preserve scroll and animation.
- [ ] Add standalone invite detail and verify existing restaurant detail route uses the new component at all breakpoints.
- [ ] Build route skeletons with matching hero/toolbar/list geometry and reduced-motion shimmer behavior.
- [ ] Implement shared not-found and error state cards; error retry calls `reset()`, not-found returns to Convites.
- [ ] Use `useLinkStatus` only on real Next `<Link>` navigation affordances; pending route indicator belongs to the clicked leaf tile and never a group/fake tooltip target.

**Manual acceptance:** navigate between segments and query parameters, confirm correct entrance/scroll behavior; inspect loading/error/not-found visually and verify pending ring attaches only to real route links.

### Task 13: Final manual acceptance and scope audit

**Files:** all implementation files above; no test files.

- [ ] Compare the prototype/spec matrix at 1440×900, 1024×768, and 390×844 in light/dark.
- [ ] Manually exercise rail/flyout/pin/cookie, leaf-vs-group tooltip semantics, account/theme/sign-out pending, palette, dock, search/filter, invite lifecycle, restaurant lifecycle, and all route states.
- [ ] Check keyboard-only use, focus restoration, Escape stacking, reduced motion, 200% zoom, safe area, aria labels/live announcements, and text status labels.
- [ ] Inspect token usage for raw component colors and verify fixed-token exceptions only occur in hero, lime CTA, and dock surfaces described in the spec.
- [ ] Confirm `/painel`, public menu, site, login, auth/access predicates, `proxy.ts`, `safeNextPath`, territory mapping, and RLS files were not changed.
- [ ] Do not run `git`, `typecheck`, `build`, `lint`, or `test`.

## Execution Notes

Deliver tasks in the order above because shell configuration and data contracts define interfaces consumed by list, overlay, and route work. If implementation is delegated, keep each task bounded to its listed files and require the manual acceptance items before moving to the next task. The reference artifact URL supplied during planning could not be opened because no browser surface was available in this session; the detailed user-provided specification remains canonical, and the local `post-login-rebrand/` assets are read-only visual references.
