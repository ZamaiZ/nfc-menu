# Tavvi Web Login Implementation Plan

> **For agentic workers:** Implement this plan in the current session. Keep all edits inside `nfc-menu`; use `tavvi-mobile` only as a read-only reference.

**Goal:** Replace the admin login in `nfc-menu` with the Tavvi web composition from the supplied spec while preserving sign-in, redirect sanitization, proxy behavior, and host territories.

**Architecture:** Add private client/server components under `src/components/auth/tavvi`, scoped `--tv-*` tokens and Plus Jakarta Sans for `.territorio-admin`, then connect the shell to `/admin/entrar`. Add a page-only admin guard that redirects unauthorized users to the login with a neutral reason; keep `signInAction`, `safeNextPath`, `proxy.ts`, and `requirePlatformAdmin` authorization behavior intact.

**Tech Stack:** Next.js 16.3 App Router, React 19 `useActionState`, Tailwind CSS 4, `next/font/google`, `motion/react`, `react-icons/lu`, existing theme provider, Next Image.

**Spec:** User-supplied “Login web Tavvi (nfc-menu · território admin)” spec, with the two confirmed resolutions: omit session-expired state to preserve `proxy.ts`; use neutral no-permission copy and return to `/entrar`; make edits only in `nfc-menu`.

## Global Constraints

- Do not run `git`, `typecheck`, `build`, `lint`, or `test` commands.
- Do not add or run tests.
- Do not change `signInAction`, `safeNextPath`, `proxy.ts`, host territory mapping, or authorization predicates.
- Leave `/painel/entrar`, the global shadcn theme, the site, and mobile source unchanged.
- Leave root favicon and metadata untouched because they affect routes outside the admin territory.
- Use `tavvi-mobile` and the local `rebrand-login` mockups as read-only references.
- Keep all component colors in scoped `--tv-*` tokens; avoid hardcoded colors in component styles.

## File Map

- `src/app/layout.tsx`: load Plus Jakarta Sans alongside the existing Inter font variable.
- `src/app/globals.css`: define scoped Tavvi tokens and Tailwind aliases; keep existing global tokens intact.
- `src/app/admin/entrar/page.tsx`: read `next` and the approved `motivo=sem-acesso` state; render the Tavvi shell/form.
- `src/server/dal/auth.ts`: add a page-oriented platform-admin guard that redirects on lack of access; leave the existing throwing guard unchanged for actions.
- `src/app/admin/layout.tsx`: keep non-admin users outside `TavviShell` so the denial login stays full-screen.
- `src/app/admin/page.tsx`, `src/app/admin/restaurantes/page.tsx`, `src/app/admin/restaurantes/[id]/page.tsx`: use the page-oriented guard before loading private page data.
- `src/components/auth/tavvi/tavvi-auth-shell.tsx`: responsive layout, hero copy, theme control placement, footer.
- `src/components/auth/tavvi/auth-hero-copy.tsx`: lockup, badge, title and subtitle.
- `src/components/auth/tavvi/notched-surface.tsx`: measured hero shape, gradient and brandmark.
- `src/components/auth/tavvi/hero-theme-toggle.tsx`: cycle the existing theme provider's system/light/dark preference.
- `src/components/auth/tavvi/tavvi-sign-in-form.tsx`: preserve `useActionState(signInAction)` and sanitized hidden `next`; implement visible email validation, password reveal, Caps Lock, pending and neutral denial alert.
- `src/components/auth/tavvi/tavvi-field.tsx`: private field presentation, focus/error state and accessible reveal control.
- `src/lib/notched-path.ts`: port the existing mobile path calculation without changing the mobile source.
- `public/brand/`: copy the supplied PNG assets from `rebrand-login/assets`; use a compressed WebP brandmark for the large hero image if conversion is available without adding a dependency.

## Review Focus

- Unknown `motivo` query values must not produce a permission alert.
- Malformed `next` remains sanitized by the existing page and action paths.
- A non-admin account must still fail every private-page authorization check; only the page response changes to the login route.
- Narrow widths and short desktop viewports must scroll without clipping the form.
- The theme toggle must share persistence and keyboard changes with the existing provider.

## Tasks

### Task 1: Scoped identity tokens and font

- Add Plus Jakarta Sans to the root font loader as `--font-tavvi`, retaining Inter for all non-admin areas.
- Add the specified `--tv-*` light/dark tokens under `.territorio-admin` and Tailwind aliases for every token used as a utility class.
- Keep tokens not exposed to Tailwind accessible by `var(--tv-...)` in component styles.

### Task 2: Brand assets and shape utility

- Copy the three provided brand PNGs into `public/brand/`.
- Add `createNotchedPath` from the mobile reference in `src/lib/notched-path.ts`.
- Use the desktop 76×72 notch, radius 32, and mobile 76×72 notch, radius 28.
- Provide a rectangular clipped fallback before measurement; do not simulate the notch with painted blocks.

### Task 3: Tavvi auth shell and theme control

- Build the server shell with `<1024px` mobile composition and `>=1024px` desktop grid.
- At short heights, allow the page and hero to grow and scroll; keep the 360–440px form column from overlapping hero copy.
- Add the interactive theme control after the form in DOM order while positioning it in the hero notch; reuse `useTheme` and the provider's `system → light → dark` cycle.
- Honor reduced motion for reveal and icon rotation.

### Task 4: Sign-in form and login route

- Create private Tavvi fields/form with visible labels, custom email validation, accessible errors, password reveal, Caps Lock notice, autofill styling and responsive CTA.
- Keep `signInAction`, `pending`, hidden `next`, and `safeNextPath` flow unchanged.
- Render a neutral no-permission alert only for `motivo=sem-acesso`; return action removes that reason and restores the form.
- Remove session-expired UI because `proxy.ts` remains unchanged.
- Replace only the `/admin/entrar` shell; keep `/painel/entrar` on the existing shell.

### Task 5: Page-level admin denial feedback

- Add a separate page guard that authenticates with `requireUser`, checks the same `is_platform_admin` predicate, and redirects unauthorized accounts to `/entrar?motivo=sem-acesso`.
- Keep `requirePlatformAdmin` throwing for DAL operations and server actions; keep RPC failures in the generic error path rather than labeling them as denied.
- Keep a signed-in non-admin outside `TavviShell` on the admin layout; redirect a signed-in platform admin who opens `/entrar` to the sanitized destination.
- Use the page guard in the three admin pages before any private data access.

### Task 6: Manual review without prohibited commands

- Inspect the changed source and compare against the mockup at 1440×900 and the mobile composition below 1024px.
- Check empty, invalid email, credential failure, pending, no-permission, Caps Lock and reveal states; confirm short screens scroll.
- Do not run automated tests, builds, linters, typechecks, or git commands.

## Handoff

Execute natively in this session. Do not delegate work to subagents. Report the exact files changed and explicitly state that automated verification was not run due to project instructions.
