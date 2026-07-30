# Background Treatment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Soften the public site's base background color and add a slow, GPU-cheap animated gradient drift, replacing the current pure-white/near-black flat background.

**Architecture:** One new CSS class (`.site-bg`) in `src/app/globals.css` that supplies an animated `linear-gradient` background with light/dark variants and a `prefers-reduced-motion` freeze. The locale layout's `<body>` swaps its flat `bg-white`/`dark:bg-neutral-950` utilities for this class.

**Tech Stack:** Tailwind CSS 4 (`@theme`, `@custom-variant dark`), plain CSS `@keyframes`. No JavaScript, no new dependencies.

## Global Constraints

- Public site only (`src/app/[locale]/layout.tsx`). The admin panel (`src/app/admin/layout.tsx`) and the root not-found page (`src/app/not-found.tsx`) are separate `<body>` owners and must not be touched — the admin panel is deliberately plain (no dark mode, no animation) per existing project convention.
- No new dependencies, no new files beyond editing `src/app/globals.css` and `src/app/[locale]/layout.tsx`.
- Must respect `prefers-reduced-motion: reduce` by freezing the gradient at its initial frame rather than removing the background treatment entirely — matching the existing pattern in `globals.css` for `scroll-behavior`.
- Colors, exact:
  - Light: `#fafafa → #eff4ff → #fafafa → #eff4ff`
  - Dark: `#171717 → #0d1220 → #171717 → #101a2e`
- Animation: 14s, `ease-in-out`, infinite, via `background-position` on an oversized (`300% 300%`) `background-size` — GPU-composited, no layout/paint cost per frame.
- No new unit tests — this is a pure CSS/visual change with no new logic, consistent with how other CSS-only changes (card hover states, dark-mode variants) have not been unit-tested in this project. Verification is a build check plus a manual visual check.

---

### Task 1: Add the animated background and wire it into the locale layout

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/[locale]/layout.tsx`

**Interfaces:**
- Produces: a `.site-bg` CSS class (light-mode default, `.dark .site-bg` override) and a `bg-drift` `@keyframes` animation. Nothing else in the codebase consumes these yet — this task both creates and wires them up.

- [ ] **Step 1: Add the CSS**

In `src/app/globals.css`, the file currently ends with this rule:

```css
.dark .prose-md pre.shiki, .dark .prose-md pre.shiki span { color: var(--shiki-dark) !important; background-color: var(--shiki-dark-bg) !important; }
```

Append the following after it:

```css

.site-bg {
  background: linear-gradient(120deg, #fafafa, #eff4ff, #fafafa, #eff4ff);
  background-size: 300% 300%;
  animation: bg-drift 14s ease-in-out infinite;
}

.dark .site-bg {
  background: linear-gradient(120deg, #171717, #0d1220, #171717, #101a2e);
  background-size: 300% 300%;
}

@keyframes bg-drift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

@media (prefers-reduced-motion: reduce) {
  .site-bg { animation: none; }
}
```

Note the `@media (prefers-reduced-motion: reduce)` block sets `animation: none` rather than removing the `background` property — this freezes the gradient at its `0% 50%` position (its initial, un-animated state) instead of falling back to a solid color. The softened color treatment stays; only the motion stops.

- [ ] **Step 2: Wire it into the locale layout's `<body>`**

In `src/app/[locale]/layout.tsx`, the `<body>` element currently reads:

```tsx
      <body className="bg-white text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-100">
```

Change it to:

```tsx
      <body className="site-bg text-neutral-900 antialiased dark:text-neutral-100">
```

`bg-white` and `dark:bg-neutral-950` are removed — `.site-bg` now supplies the background entirely (including the dark-mode variant, handled by its own `.dark .site-bg` CSS rule rather than a Tailwind `dark:` utility). `text-neutral-900`, `antialiased`, and `dark:text-neutral-100` are unchanged.

Do not touch `src/app/admin/layout.tsx` or `src/app/not-found.tsx` — they are separate `<body>` owners and are out of scope per this plan's Global Constraints.

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: succeeds, with `/en` and `/no` still prerendered. No new warnings.

- [ ] **Step 4: Manual visual verification**

Run: `npm run dev`

In a browser at `http://localhost:3000/en`:
1. Confirm the background is a soft off-white with a faint blue tint drifting slowly, not a flat white — watch for ~15 seconds to see the drift complete a cycle.
2. Toggle to dark mode via the theme toggle in the navbar. Confirm the background is a soft dark gray-blue drift, not a flat near-black.
3. Confirm text and cards (Hero, About, CV, Certifications, Projects) remain fully legible against the moving background in both themes — nothing should look washed out or low-contrast.
4. Open browser DevTools → Rendering tab → set "Emulate CSS media feature `prefers-reduced-motion`" to `reduce`. Reload the page. Confirm the background is now static (no visible drift) but still shows the softened color — not a plain white/near-black flat fill.
5. Navigate to `/en/blog` and `/admin` (you'll be redirected to `/admin/login` if unauthenticated, which is expected) — confirm the blog page has the same background treatment as the home page, and the admin login page does NOT have the animated background (it should look exactly as it did before this change: plain, no gradient).

Stop the dev server afterward.

Paste a short confirmation of each of the 5 checks above — this step has no automated test, so this manual transcript is the verification record.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css "src/app/[locale]/layout.tsx"
git commit -m "feat: soften background color and add animated gradient drift"
```
