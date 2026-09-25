# Refinamentos do painel do restaurante Implementation Plan

> **For agentic workers:** Required sub-skill after execution approval: use `superpowers:executing-plans` for native implementation. Implement one task at a time and review each diff before continuing.

**Goal:** Improve restaurant dashboard responsiveness and polish across menu media, availability, previews, navigation, and all data-driven empty states.

**Architecture:** Add a small panel-specific empty-state composition over the existing shadcn primitives and a shared floating preview shell with a phone frame and theme control. Keep the menu-specific preview content and empty-state copy at their current domain boundaries, while fixing optimistic availability and active navigation selection where those behaviors are owned.

**Tech Stack:** Next.js 16.3.5 App Router, React 19.2.8, TypeScript, Tailwind CSS 4, existing Base UI Popover, `react-icons`, Server Actions.

**Spec:** `docs/superpowers/specs/2026-09-25-refinamentos-painel-restaurante-design.md`

## Global Constraints

- Do not add dependencies.
- Do not add or run tests; do not run `typecheck`, `build`, `lint`, or Git commands.
- Use the existing Base UI Popover and shadcn Empty primitives.
- Keep the list presentation of menu items unchanged while resizing grid media.
- Respect `prefers-reduced-motion` for decorative entrance motion.
- Keep Contact preview data tied to the current form values and omit blank fields.

## Review Focus

- Rapid availability changes on different items and a failed action must not block or revert an unrelated item; inspect per-item pending and rollback paths in Task 5.
- An all-available Service view must show no empty message, while zero visible items must offer a relevant recovery action; inspect the rendering branches in Task 2 and the optimistic state in Task 5.
- Empty list, empty category, no-result filter, and upload/drop targets need distinct copy and appropriate density; inspect every adopted caller in Tasks 1, 2, and 3.
- Contact fields that are blank or edited but unsaved must render the current form values without fake restaurant details; inspect the value flow in Task 6.
- Long phone previews on a narrow viewport and Escape closure must remain usable; inspect sizing, popover semantics, and focus behavior in Task 6.
- A nested restaurant route must mark exactly one leaf as current while keeping its parent group open; inspect active href selection in Task 6.

---

### Task 1: Add the shared panel empty-state composition

**Files:**
- Create: `src/components/painel/panel-empty-state.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `Empty`, `EmptyHeader`, `EmptyMedia`, `EmptyTitle`, `EmptyDescription`, and `EmptyContent` from `src/components/ui/empty.tsx`.
- Produces: `PanelEmptyState` with required `icon`, `title`, and `description`; optional `action`; and `density: 'page' | 'section' | 'compact'` defaulting to `section`.

- [x] **Step 1: Define the shared component API and compose the shadcn primitives.** Use `ReactNode` for `icon` and `action`; render the action only when supplied. Keep the component semantic and avoid embedding any restaurant-specific copy.

```tsx
type PanelEmptyStateProps = {
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
  density?: 'page' | 'section' | 'compact'
}
```

- [x] **Step 2: Add density styles and one entrance animation.** Use a data attribute for density, a short opacity/translate entrance, and a `prefers-reduced-motion` override that removes translation and animation.
- [x] **Step 3: Review the component source.** Confirm the `action` is keyboard reachable, the icon is decorative when its title gives the meaning, and compact density does not force a large minimum height.

### Task 2: Apply contextual empty states to menu and collection flows

**Files:**
- Modify: `src/app/painel/restaurantes/page.tsx`
- Modify: `src/components/painel/menu-workspace.tsx`
- Modify: `src/components/cardapio/menu-work-modes.tsx`
- Modify: `src/app/painel/restaurantes/[id]/equipe/page.tsx`
- Consume: `src/components/painel/panel-empty-state.tsx`

**Interfaces:**
- Consumes: `PanelEmptyState` from Task 1.
- Produces: Each empty situation uses context-specific icon, title, description, density, and a natural existing action where available.

- [x] **Step 1: Replace the no-restaurants presentation with `PanelEmptyState`.** Keep the existing restaurant-access explanation and page-level layout.
- [x] **Step 2: Replace menu-start, no-search-result, and empty-category markup.** Keep the quick category actions for a new menu; add a direct action to clear the current query/filter when the result set is empty.
- [x] **Step 3: Add empty recovery callbacks from `MenuWorkspace` to `MenuWorkModes`.** The hidden-item callback selects list view and the hidden filter; the feed callback returns to the full list because an empty feed can result from hidden categories/items as well as missing media.
- [x] **Step 4: Use compact contextual empty states for board columns, an empty board, an empty spreadsheet, an unselected studio, and an empty sequence.** Retain “Solte um item nesta coluna” as the board instruction. When there are no categories, offer the existing category action; when a category exists but has no items, offer the existing item action. The sequence recovery action returns to the full menu because an empty feed can also result from hidden categories or items.
- [x] **Step 5: Handle Service zero-visible-items separately from an empty menu and all-available items.** With no items at all, offer to open the menu; with only hidden items, offer the hidden-item filter; render nothing extra when visible items are all available.
- [x] **Step 6: Replace the “Só você por aqui” notice with a section-density empty state.** Keep the member table intact and direct the user to the existing invite action in the page header without duplicating the invite dialog.
- [x] **Step 7: Review each conditional against its data source.** Verify that a hidden-only menu, a menu with no media, empty categories, an empty spreadsheet, and a menu with all items available each reaches the intended distinct branch.

### Task 3: Apply empty states to item media and variants

**Files:**
- Modify: `src/components/cardapio/media-editor.tsx`
- Modify: `src/components/cardapio/variants-editor.tsx`
- Consume: `src/components/painel/panel-empty-state.tsx`

**Interfaces:**
- Consumes: `PanelEmptyState` from Task 1.
- Produces: Media and variant collection empties share the visual system while retaining their existing adjacent upload and add controls.

- [x] **Step 1: Replace the no-saved-or-pending-media message with a compact empty state.** Keep `MediaDropzone` immediately available; explain that adding media makes the item eligible for the public feed.
- [x] **Step 2: Replace the no-variants helper paragraph with a compact empty state.** Keep the name/price inputs and add button in place; explain the use case with examples such as sizes.
- [x] **Step 3: Review loading, pending-upload, and populated branches.** The empty state appears only when both saved and queued media are empty, and only when the variant array is empty.

### Task 4: Reduce menu grid media size

**Files:**
- Modify: `src/app/globals.css`
- Review: `src/components/cardapio/item-row.tsx`

**Interfaces:**
- Consumes: Existing `presentation="grid"` class contract.
- Produces: Grid-only image dimensions that leave room for title, price, description, tags, and controls.

- [x] **Step 1: Replace the grid image `9 / 11` ratio with a landscape ratio and a responsive height cap.** Keep `object-fit: cover` and reserve image space to avoid layout shifts.
- [x] **Step 2: Adjust grid card spacing only where required by the smaller image.** Preserve card actions and readable item details; do not change list-row thumbnail sizing.
- [x] **Step 3: Review the responsive grid rules.** Confirm that the smaller media rule wins at the existing narrow-screen breakpoint and does not clip card controls.

### Task 5: Make Service availability optimistic and item-scoped

**Files:**
- Modify: `src/components/cardapio/menu-work-modes.tsx`
- Consume: `setItemAvailabilityAction` from `src/server/actions/menu.ts`

**Interfaces:**
- Consumes: Current item DTOs and the existing availability Server Action.
- Produces: Immediate per-item display updates, pending feedback for the affected item, and item-scoped rollback on action failure.

- [x] **Step 1: Add local optimistic availability keyed by item ID.** Read each card's visible status from the local override when present, falling back to its server-provided `isAvailable` value.
- [x] **Step 2: Track pending item IDs instead of disabling every Service card from the shared transition flag.** Prevent duplicate submissions for the same item while leaving other cards available.
- [x] **Step 3: Update the selected item before invoking the Server Action.** On success, reconcile the override with the revalidated server value; on failure, remove only that item's override and show the existing error toast.
- [x] **Step 4: Add a subtle accessible pending indicator to the affected card.** Expose pending state without making the availability status depend on color alone.
- [x] **Step 5: Review overlapping responses and mode changes.** Ensure a completion for one item cannot clear another item's pending state or optimistic value.

### Task 6: Share the floating preview shell between Identity and Contact

**Files:**
- Create: `src/components/painel/floating-restaurant-preview.tsx`
- Create: `src/components/painel/contact-preview.tsx`
- Modify: `src/components/painel/theme-preview.tsx`
- Modify: `src/components/painel/identity-form.tsx`
- Modify: `src/components/painel/profile-form.tsx`
- Modify: `src/app/painel/restaurantes/[id]/contato/page.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Produces: `FloatingRestaurantPreview` with a render callback `(mode: 'light' | 'dark') => React.ReactNode` so each form supplies its own live preview content.
- Produces: `ContactPreview` with `theme`, `name`, `description`, `phone`, `whatsapp`, `instagram`, and `address` props.
- Consumes: Existing Base UI `Popover` and `ThemePreview`; `ProfileForm` remains the owner of current unsaved field values.

- [x] **Step 1: Implement `FloatingRestaurantPreview` with a fixed, labeled trigger and the existing Base UI Popover.** Include the Claro/Escuro segmented control, an accessible preview title, viewport-bounded dimensions, and internal scrolling for narrow screens.
- [x] **Step 2: Build a reusable phone frame for the preview content.** Keep the frame width responsive, cap its height to the popover, and prevent screen content from expanding outside the frame.
- [x] **Step 3: Adapt the Identity preview to use the shared shell.** Remove the sticky aside and mobile clipping rule; pass the live name and selected theme through the render callback.
- [x] **Step 4: Pass the restaurant theme to `ProfileForm` and feed its current `values` into `ContactPreview`.** Render the restaurant name and description with only the populated contact channels/address; do not render sample dishes on the Contact screen.
- [x] **Step 5: Remove the static Contact aside.** Place the shared floating trigger within the page/form tree so it can reflect unsaved values while freeing the main content column.
- [x] **Step 6: Style the fixed trigger and popover for desktop and mobile.** Keep safe-area spacing, visible focus, a clear stacking order above the mobile dock, and the trigger reachable while scrolling.
- [x] **Step 7: Review all close paths and content combinations.** Confirm Escape and outside-click behavior from Base UI, focus restoration, both theme modes, blank fields, long phone/address values, and live edits.

### Task 7: Select exactly one active sidebar leaf

**Files:**
- Modify: `src/components/console/console-config.ts`
- Modify: `src/components/console/console-shell.tsx`
- Modify: `src/components/console/rail.tsx`
- Modify: `src/components/console/mobile-dock.tsx`
- Modify: `src/components/console/command-palette.tsx`
- Review: `src/components/shell/navigation.ts`

**Interfaces:**
- Consumes: The pathname and the full flat set of console leaves, including each leaf's `href` and optional `activeMatch` prefixes.
- Produces: A single longest matching active leaf shared by the rail marker, mobile navigation, command palette, and active indicator position.

- [x] **Step 1: Resolve one active console leaf by the longest matching route prefix.** Use the same result for selected styling, `aria-current`, mobile navigation, and the active indicator position.
- [x] **Step 2: Review platform admin routes and restaurant root, identity, contact, and team routes.** Confirm the restaurant root is selected only when no more specific child route matches.

## Final source review

- [x] Review all changed call sites against the component interfaces defined above.
- [x] Review CSS cascade and responsive overrides for grid media, empty-state motion, and popover positioning.
- [x] Review error and pending paths in Service and keyboard paths in the popover.
- [x] Do not run tests, typecheck, build, lint, or Git commands, in accordance with the project instructions.
