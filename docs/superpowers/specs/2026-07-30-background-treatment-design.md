# Background Treatment — Design Spec

**Date:** 2026-07-30
**Status:** Approved by user
**Branch:** `feat/background-treatment`

## Goal

The public site's background is currently pure `bg-white` in light mode and `bg-neutral-950` in dark mode — too bright and too dark respectively. Soften the base color and add a lightweight, GPU-cheap animated background treatment, without hurting load time or Lighthouse scores.

## Decisions

Chosen via visual comparison of four live CSS-only mockups (static gradient mesh, noise/grain texture, cursor-follow glow, slow animated gradient drift):

| Question | Decision |
|---|---|
| Base background color | Light: `bg-white` → `bg-neutral-50`. Dark: `bg-neutral-950` → `bg-neutral-900`. One step softer each direction. |
| Animation style | Slow gradient drift — a `linear-gradient` with an oversized `background-size`, animated via `@keyframes` shifting `background-position` on a 14s `ease-in-out` loop. Rejected: static mesh (no motion, though cheapest), noise texture (adds visual grain, not what "too flat" needed), cursor glow (adds a `mousemove` listener — more moving parts than this warrants). |
| Scope | Public site only (`[locale]` pages). The admin panel is deliberately plain per the existing project convention (no dark mode, no animation) and stays untouched. |
| Colors | Light: `#fafafa → #eff4ff → #fafafa → #eff4ff` (neutral-50 drifting into a barely-visible blue tint). Dark: `#171717 → #0d1220 → #171717 → #101a2e` (neutral-800-ish drifting into a barely-visible blue-black). Approved directly against a mock hero + card, confirming text stays easy to read at these opacities. |

## Implementation

**Colors.** In `src/app/[locale]/layout.tsx`, the `<body>` element currently carries:

```
bg-white text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-100
```

The flat background utilities (`bg-white` / `dark:bg-neutral-950`) are replaced by a new class, `site-bg`, defined in `src/app/globals.css`. `site-bg` supplies the animated gradient background directly — it is not a color utility plus a separate animation layer, it *is* the background.

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

The reduced-motion rule freezes the gradient at its initial frame (0% 50%) rather than removing the gradient — the softened color treatment stays, only the motion stops. This follows the exact pattern already established in `globals.css` for `scroll-behavior`.

**Where it applies.** Only `src/app/[locale]/layout.tsx`'s `<body>`. The root `src/app/not-found.tsx` and `src/app/admin/layout.tsx` are separate `<body>` owners (per the existing architecture) and are not touched — the 404 page keeps its current flat light background (it has no theme provider, so an animated dark-mode-aware background isn't meaningful there), and the admin panel stays plain.

**Performance.** No new dependencies, no new files, no JavaScript, no additional network request. `background-position` animation on a `linear-gradient` composites on the GPU and does not trigger layout or paint on every frame — the same cost class as the animations already in use elsewhere in the site (`FadeIn`, hover transitions). Expected to be unmeasurable in Lighthouse performance scoring.

## Testing

This is a pure CSS/visual change with no new logic, so no new unit tests are warranted — consistent with how the project has not unit-tested other CSS-only changes (card hover states, dark-mode variants). Verification is a build check (`npm run build` succeeds, no regressions) plus a manual visual check in the browser: light mode, dark mode, and `prefers-reduced-motion: reduce` (via browser dev tools emulation) all render correctly, and text on cards remains legible against the moving background in both themes.

## Out of scope

- Any change to the admin panel's background.
- The cursor-glow, static-mesh, and noise-texture options explored but not chosen — not implemented, not left as dead code or unused CSS.
- Per-section background variation (the gradient applies once, at the `<body>` level, behind everything).
