# Blog post rich editor and inline images — design

Date: 2026-10-18
Status: Approved

## Goal

Replace the admin blog post body editor (a plain markdown `<textarea>` with a
preview toggle) with a WYSIWYG editor, and let the site owner add images
inline in post bodies.

### Decisions from brainstorming

- Writing experience: WYSIWYG (Notion/Medium-style) with a formatting toolbar,
  a `/` slash menu, and keyboard shortcuts. A toggle switches to raw markdown.
- Storage: post bodies stay as markdown in `posts.body_md_en` and
  `posts.body_md_no`. No database migration. The public renderer
  (`src/lib/markdown.ts`) and sanitizer (`src/lib/sanitize.ts`) stay unchanged.
- Editor library: Tiptap (ProseMirror-based, headless, styled with Tailwind).
- Inline images: insert via toolbar button, drag-and-drop, and clipboard paste.
  Upload immediately to the Supabase Storage `media` bucket.
- Image options: alt text only. Images render at full content width. Output
  stays pure markdown: `![alt](url)`.
- Upload path: the browser downscales and compresses the image, then sends it
  to a new admin server action that reuses `requireUser()` and `uploadImage()`.
- Layout: EN and NO bodies move to language tabs with one full-width editor
  visible at a time. Both are still submitted together.

### Out of scope

- Cleanup of orphaned images in storage.
- Captions, size, or alignment controls for images.
- Changes to cover-image upload.
- Changes to public blog pages, the DB schema, or the sanitizer.
- Rich editing for other admin text fields.

## Current state

- `src/components/admin/MarkdownEditor.tsx`: controlled `<textarea>` plus a
  preview rendered with `Marked` and `sanitizeHtml()`.
- `src/app/admin/posts/[id]/page.tsx`: edit form with EN/NO columns side by
  side, each with a title field and a `MarkdownEditor`. Form posts to the
  `updatePost` server action in `src/app/admin/posts/actions.ts`.
- `src/lib/admin/action-utils.ts`: `requireUser()`, `uploadImage(supabase,
  file, folder)` (UUID-prefixed path in `media`, returns the public URL), and
  `withAdminAction()`.
- `next.config.ts`: no `serverActions.bodySizeLimit`, so the Next.js default
  of 1 MB applies. Vercel caps request bodies at about 4.5 MB.
- The sanitizer already allows `<img>` with `src`, `alt`, `title`, `width`,
  `height` and `http`/`https` schemes.

## Architecture

### `PostBodyEditor` (new client component)

Path: `src/components/admin/PostBodyEditor.tsx` (sub-parts may live in
`src/components/admin/post-editor/`).

- Props: `{ name: string; label: string; defaultValue?: string | null }` —
  same contract as `MarkdownEditor`.
- Renders a hidden `<input name={name}>` holding the current markdown. The
  `updatePost` action and `postSchema` do not change.
- Two modes:
  - **Rich** (default): Tiptap editor.
  - **Markdown**: `<textarea>` with the raw markdown.
- Markdown is the single source of truth. Switching Rich to Markdown
  serializes the document. Switching Markdown to Rich parses the text.
- Tiptap extensions: StarterKit (paragraph, headings, bold, italic, strike,
  inline code, code block, bullet and ordered lists, blockquote, horizontal
  rule, hard break), Link, Image, Placeholder, GFM tables, and a markdown
  parse/serialize extension.
- UI: toolbar (headings, marks, lists, quote, code block, link, image, table,
  undo/redo, mode toggle), `/` slash menu for block types and image, and a
  bubble menu on images to edit alt text or remove the image.
- `MarkdownEditor.tsx` is removed if it has no other users after the change.

### Post edit page

`src/app/admin/posts/[id]/page.tsx`:

- Replace the two side-by-side columns with EN | NO tabs.
- Each tab holds that language's title field and `PostBodyEditor`.
- Both tabs stay mounted (inactive tab hidden with CSS) so all fields submit.
- Slug, published flag, and cover image fields stay as they are.

### Image pipeline (client)

Path: `src/lib/admin/image-prep.ts` (client-safe, no server imports).

- Accept `image/jpeg`, `image/png`, `image/webp`, `image/gif`. Reject other
  types and raw files over 20 MB with an inline error.
- Downscale so the longest side is at most 2000 px, then encode as WebP.
- GIFs are passed through unchanged to keep animation. GIFs over 4 MB are
  rejected on the client with an inline error, since they cannot be shrunk.
- If a WebP result still exceeds 4 MB, retry once at lower quality; if still
  too large, reject with an inline error.
- The dimension and format decision is a pure function so it can be unit
  tested without a canvas.

### `uploadPostImage` server action

Path: `src/app/admin/posts/actions.ts` (or a sibling `image-actions.ts`).

- Signature: `uploadPostImage(formData: FormData): Promise<{ url: string } |
  { error: string }>`.
- Calls `requireUser()`. Re-checks the MIME type against the allowed list and
  enforces a 4 MB maximum on the server.
- Calls `uploadImage(supabase, file, "posts/inline")` and returns the URL.
- Returns `{ error }` instead of redirecting, because the caller is the
  editor, not a form submit. It does not use `withAdminAction()`. Error
  messages sent to the browser are fixed strings; details go to
  `console.error` only.

### Config

`next.config.ts`: add `experimental.serverActions.bodySizeLimit: "4.5mb"` (a 4 MB file plus multipart overhead; within the Vercel 4.5 MB cap) (or
the stable equivalent for the installed Next.js 15 version).

## Data flow

1. **Load**: the page passes `body_md_*` to `PostBodyEditor`. The editor
   parses the markdown into a Tiptap document.
2. **Fidelity check**: on load, compare `serialize(parse(md))` with `md` after
   whitespace normalization. If they differ (for example raw HTML or
   footnotes), open that body in Markdown mode and show the notice "Rich mode
   may reformat this post". The user may still switch to Rich mode.
3. **Edit**: each change re-serializes the document into the hidden input.
4. **Image insert**: button, drop, or paste triggers the image pipeline. A
   placeholder node with a spinner appears at the insert position. On success
   the placeholder becomes an image node with the returned URL, and an alt
   text prompt opens. On failure the placeholder is removed and an inline
   error appears.
5. **Save**: the existing form submit to `updatePost`. The Save button is
   disabled while any upload is pending.
6. **Leave**: a `beforeunload` warning fires when there are unsaved changes.

## Error handling

| Case | Behavior |
|------|----------|
| Unsupported file type or raw file over 20 MB | Client rejects, inline error, no upload. |
| Not signed in or not the admin | Action returns `{ error }`; editor shows it and removes the placeholder. |
| Server MIME or 4 MB check fails | Same as above. |
| Storage upload fails | Same as above; details logged server-side only. |
| Markdown does not round-trip | Open in Markdown mode with a notice. |

## Testing

Vitest is configured with `environment: "node"`. There is no e2e suite.

- **Markdown round-trip** (add `jsdom` dev dependency; use
  `// @vitest-environment jsdom` per file): headings, marks, lists, links,
  code blocks, tables, and images with alt text survive
  markdown → Tiptap → markdown. Raw HTML is detected by the fidelity check.
- **`uploadPostImage`**: mocked Supabase, following
  `tests/posts-actions.test.ts`. Cases: unauthenticated, bad MIME, oversize,
  success returns URL, storage error returns a generic error.
- **Image prep**: pure dimension and format decision logic (resize ratio,
  no upscale, GIF pass-through).
- **Public pipeline**: `renderMarkdown()` keeps an inline `<img>` with `src`
  and `alt` for a Supabase public URL.
- **Manual visual check**: Playwright MCP against the dev server. Type text,
  use the slash menu, drag and paste an image, set alt text, toggle modes,
  save, then view the public post. Not added to the repo.

## Risks

- Markdown serialization may normalize formatting (for example `*` vs `-`
  bullets) on first save in Rich mode. Acceptable; content is preserved.
- New client dependencies (Tiptap packages) increase the admin bundle only.
  Public pages do not import the editor.
