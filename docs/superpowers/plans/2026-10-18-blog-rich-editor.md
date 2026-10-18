# Blog Rich Editor and Inline Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the admin post-body textareas with bilingual Tiptap editors and secure inline image uploads while keeping Markdown as the stored and public-rendered format.

**Architecture:** Add a client-only `PostBodyEditor` backed by shared Tiptap Markdown codec helpers; keep the existing post action and database columns unchanged. Prepare images in the browser, upload through an authenticated server action to Supabase Storage, and compose the editors inside a mounted EN/NO tab form that tracks dirty and pending-upload state.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind 4, Supabase Storage, Tiptap 3.32.0, Marked, Vitest 3, jsdom 26.1.0.

**Spec:** `docs/superpowers/specs/2026-10-18-blog-rich-editor-design.md`

## Global Constraints

- `posts.body_md_en` and `posts.body_md_no` remain the storage format; Markdown stays storage format and no database migration is added.
- Keep public pages, `src/lib/markdown.ts`, `src/lib/sanitize.ts`, `postSchema`, and `updatePost` behavior unchanged; do not change cover-image upload.
- Accept only MIME types `image/jpeg`, `image/png`, `image/webp`, and `image/gif`.
- Reject raw client files over 20 MB; downscale non-GIF images so the longest side is at most 2000 px and encode them as WebP.
- Pass GIFs through unchanged and reject GIFs over 4 MB on the client.
- Retry once at lower WebP quality when the encoded result is over 4 MB; reject if the retry is still over 4 MB.
- The server enforces a 4 MB file cap and uploads inline images to the `media` bucket under `posts/inline`.
- Set Next.js `experimental.serverActions.bodySizeLimit` to the exact value `"4.5mb"` (spec said `"4mb"`; raised so a 4 MB file plus multipart overhead fits, still within the Vercel 4.5 MB body cap).
- The browser receives fixed error strings only; server error details are written to `console.error` and never returned.
- Inline images are pure Markdown `![alt](url)`, have alt text only, and render at full content width.
- Rich mode is the default except when the fidelity check fails; the notice text is exactly `Rich mode may reformat this post`.
- Both language editors stay mounted; the inactive tab is hidden with CSS, and both sets of fields submit together.
- Disable Save while any upload is pending and warn with `beforeunload` when form edits are unsaved.
- Do not add orphaned-image cleanup, captions, size/alignment controls, public-page rich editing, or other admin text-field changes.

## Review Focus

- **Near-cap request bodies:** A WebP close to 4 MB plus multipart framing must still fit under the `"4.5mb"` Server Action body limit; the final Playwright task pins near-cap upload behavior.
- **Authorization boundary:** An authenticated account whose email is not `ADMIN_EMAIL` must receive only the fixed generic upload error and must not reach Storage; pin this in the action test.
- **Undecodable allowed MIME:** A zero-byte or corrupt file labeled with an allowed MIME type must fail inline before the server action is called; pin this in image-prep tests.
- **Concurrent upload failure:** If two uploads are pending and one fails first, its placeholder is removed while Save stays disabled for the other; pin the pending-state transition in upload-state tests and the placeholder removal in the Task 5 manual check.
- **Markdown-special alt text:** An image alt string containing `]` and `\` must survive Markdown parse/serialize/parse; pin this in the codec test.

---

## File Structure

- Modify `package.json` and `package-lock.json`: add the aligned Tiptap v3 packages and jsdom test environment.
- Create `src/lib/admin/post-editor/markdown.ts`: define shared Markdown parse/serialize and initial-fidelity helpers.
- Create `src/lib/admin/image-prep.ts`: define client-safe image limits, pure resize decisions, and browser WebP preparation.
- Create `src/app/admin/posts/image-actions.ts`: authorize and upload a prepared inline image, returning a fixed error result rather than redirecting.
- Modify `next.config.ts`: raise Server Action request parsing limit to the approved 4 MB.
- Create `src/lib/admin/post-editor/slash-commands.ts`: define and filter the pure slash-command list used by Tiptap Suggestion.
- Create `src/components/admin/PostBodyEditor.tsx`: own editor mode, hidden Markdown form value, toolbar, and editor composition.
- Create `src/components/admin/post-editor/EditorToolbar.tsx`: render rich-format commands and the mode toggle.
- Create `src/components/admin/post-editor/SlashMenu.tsx`: bind `/` suggestions to the pure slash-command list.
- Create `src/components/admin/post-editor/form-context.tsx`: expose dirty and pending-upload reporting to each editor.
- Create `src/components/admin/post-editor/UploadPlaceholder.tsx`: define the temporary image node and spinner view.
- Create `src/components/admin/post-editor/image-upload.ts`: unify toolbar, slash, drop, and paste uploads and resolve/remove placeholders.
- Create `src/lib/admin/post-editor/upload-state.ts`: track pending placeholder IDs with a pure reducer.
- Create `src/lib/admin/post-editor/form-state.ts`: track dirty state and pending counts with pure form-state helpers.
- Create `src/components/admin/PostLanguageTabs.tsx`: render mounted English and Norwegian title/body panels.
- Create `src/components/admin/PostEditForm.tsx`: provide form status, beforeunload warning, and pending-aware Save button.
- Modify `src/app/admin/posts/[id]/page.tsx`: use the form and language tabs while retaining slug, publish, and cover fields.
- Delete `src/components/admin/MarkdownEditor.tsx` after replacing its only component use.
- Create `tests/post-editor-markdown.test.ts`, `tests/image-prep.test.ts`, `tests/post-image-action.test.ts`, `tests/post-editor-commands.test.ts`, `tests/post-editor-upload-state.test.ts`, and `tests/post-editor-form-state.test.ts`: pin helper and action behavior.
- Modify `tests/markdown.test.ts` and `tests/posts-actions.test.ts`: pin public inline-image rendering and unchanged Markdown persistence.

### Task 1: Markdown Codec and Tiptap Dependencies

**Files:**
- Create: `src/lib/admin/post-editor/markdown.ts`
- Modify: `package.json:11-34`, `package-lock.json`
- Test: `tests/post-editor-markdown.test.ts`, `tests/markdown.test.ts:46-80`

**Interfaces:**
- Consumes: the stored body strings `body_md_en` and `body_md_no`.
- Produces: `createPostEditorExtensions(): Extensions`, `parsePostMarkdown(markdown: string): JSONContent`, `serializePostMarkdown(document: JSONContent): string`, and `getInitialPostEditorState(markdown: string): { mode: "rich" | "markdown"; notice: string | null }`.

- [ ] **Step 1: Write the failing Markdown codec tests**

Create `tests/post-editor-markdown.test.ts` with `// @vitest-environment jsdom` and add:

```ts
it("round-trips supported Markdown blocks and marks", () => {
  const markdown = "# Heading\n\n**bold** *italic* ~~strike~~ `code`\n\n- item\n\n[link](https://example.com)\n\n```ts\nconst n = 1;\n```\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\n![alt](https://example.com/image.webp)";
  const output = serializePostMarkdown(parsePostMarkdown(markdown));
  for (const part of ["# Heading", "**bold**", "*italic*", "~~strike~~", "`code`", "- item", "[link](https://example.com)", "```ts", "| a | b |", "![alt](https://example.com/image.webp)"]) {
    expect(output).toContain(part);
  }
});

it("opens content in Markdown mode when raw HTML cannot round-trip", () => {
  expect(getInitialPostEditorState("<div>legacy</div>")).toEqual({
    mode: "markdown",
    notice: "Rich mode may reformat this post",
  });
});

it("normalizes line endings and terminal blank lines for the fidelity check", () => {
  expect(getInitialPostEditorState("# Heading\r\n\r\n").mode).toBe("rich");
});

it("preserves Markdown-special characters in image alt text", () => {
  const markdown = String.raw`![left \] and \\ right](https://example.com/image.webp)`;
  const reparsed = parsePostMarkdown(serializePostMarkdown(parsePostMarkdown(markdown)));
  expect(reparsed.content?.[0]).toMatchObject({
    type: "image",
    attrs: { alt: "left ] and \\ right" },
  });
});
```

In `tests/markdown.test.ts`, add `it("preserves uploaded inline images", ...)` and assert the output of `renderMarkdown("![Inline](https://project.supabase.co/storage/v1/object/public/media/posts/inline/image.webp)")` contains `<img`, that Supabase URL, and `alt="Inline"`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/post-editor-markdown.test.ts tests/markdown.test.ts`

Expected: the new codec test fails because the codec exports and Tiptap dependencies do not exist yet; the existing Markdown suite still runs.

- [ ] **Step 3: Add the aligned editor and jsdom dependencies**

Run:

```bash
npm install '@tiptap/core@^3.32.0' '@tiptap/pm@^3.32.0' '@tiptap/react@^3.32.0' '@tiptap/starter-kit@^3.32.0' '@tiptap/markdown@^3.32.0' '@tiptap/extension-image@^3.32.0' '@tiptap/extensions@^3.32.0' '@tiptap/extension-table@^3.32.0' '@tiptap/suggestion@^3.32.0' && npm install -D 'jsdom@^26.1.0'
```

Use official `@tiptap/markdown`: its v3 documentation explicitly supports Markdown tables, and the v3 Image extension provides Markdown parse/render handlers. `@tiptap/react@3.32.0` declares React 19 in its peer range. Do not add `tiptap-markdown`: although its `0.9.0` peer range accepts Tiptap v3, its README says the maintainer does not plan further releases or issue/PR fixes. StarterKit v3 already includes Link, so do not add a duplicate Link extension. Import `Placeholder` from `@tiptap/extensions`, `TableKit` from `@tiptap/extension-table`, and React `BubbleMenu` later from `@tiptap/react/menus`; do not add standalone placeholder or bubble-menu packages. Use jsdom `26.1.0` (Node `>=18`) rather than the newest jsdom line to avoid raising the repo's runtime floor.

- [ ] **Step 4: Implement the Markdown helpers in `src/lib/admin/post-editor/markdown.ts`**

Return `[StarterKit.configure({ link: { openOnClick: false } }), Image.configure({ inline: false, allowBase64: false }), Placeholder.configure({ placeholder: "Write something…" }), TableKit, Markdown]` from `createPostEditorExtensions()`. Use `new Editor({ element: document.createElement("div"), extensions: createPostEditorExtensions(), content: markdown, contentType: "markdown" })` for headless parsing in jsdom (no React `useEditor`); destroy each temporary editor in `finally`. Serialize JSON through `editor.getMarkdown()`. Normalize only CRLF/CR line endings and trailing blank lines for the fidelity comparison; preserve the original string when opening in Markdown mode.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run tests/post-editor-markdown.test.ts tests/markdown.test.ts`

Expected: codec round-trips pass, raw HTML selects Markdown mode with the exact notice, and public `renderMarkdown()` retains the uploaded inline image.

- [ ] **Step 6: Commit the codec and dependency setup**

```bash
git add package.json package-lock.json src/lib/admin/post-editor/markdown.ts tests/post-editor-markdown.test.ts tests/markdown.test.ts
git commit -m "feat: add post markdown codec" -m "Co-authored-by: Copilot App <223556219+Copilot@users.noreply.github.com>"
```

### Task 2: Client Image Preparation

**Files:**
- Create: `src/lib/admin/image-prep.ts`
- Test: `tests/image-prep.test.ts`

**Interfaces:**
- Consumes: `File` inputs selected, dropped, or pasted by the editor.
- Produces: `type ImagePrepDecision = { kind: "reject"; error: string } | { kind: "passthrough" } | { kind: "webp"; width: number; height: number }`, `decideImagePrep(input: { mimeType: string; rawBytes: number; width?: number; height?: number }): ImagePrepDecision`, `encodeWebpWithRetry(encode: (quality: number) => Promise<Blob>): Promise<{ blob: Blob } | { error: string }>`, and `preparePostImage(file: File): Promise<{ file: File } | { error: string }>`.

- [ ] **Step 1: Write failing tests for format, dimensions, caps, and retry**

Create `tests/image-prep.test.ts` with `// @vitest-environment jsdom` for the `File`/decoder test and add tests with these assertions:

```ts
it("allows only the four approved image MIME types", () => {
  for (const mimeType of ["image/jpeg", "image/png", "image/webp", "image/gif"]) {
    expect(decideImagePrep({ mimeType, rawBytes: 100, width: 100, height: 100 }).kind)
      .not.toBe("reject");
  }
});

it("resizes to 2000 px without upscaling and enforces inclusive input caps", () => {
  expect(decideImagePrep({ mimeType: "image/png", rawBytes: 20 * 1024 * 1024, width: 4000, height: 2000 }))
    .toMatchObject({ kind: "webp", width: 2000, height: 1000 });
  expect(decideImagePrep({ mimeType: "image/png", rawBytes: 20 * 1024 * 1024 + 1, width: 4000, height: 2000 }).kind)
    .toBe("reject");
  expect(decideImagePrep({ mimeType: "image/png", rawBytes: 0 }).kind).toBe("reject");
  expect(decideImagePrep({ mimeType: "image/png", rawBytes: 100, width: 500, height: 300 }))
    .toMatchObject({ kind: "webp", width: 500, height: 300 });
  expect(decideImagePrep({ mimeType: "image/svg+xml", rawBytes: 100 }).kind).toBe("reject");
  expect(decideImagePrep({ mimeType: "image/gif", rawBytes: 4 * 1024 * 1024 }).kind).toBe("passthrough");
  expect(decideImagePrep({ mimeType: "image/gif", rawBytes: 4 * 1024 * 1024 + 1 }).kind).toBe("reject");
});
```

Define `blobOfSize(size: number): Blob` as a test helper and add:

```ts
it("re-encodes an oversized WebP once at lower quality", async () => {
  const exact = blobOfSize(4 * 1024 * 1024);
  const encodeExact = vi.fn().mockResolvedValue(exact);
  expect(await encodeWebpWithRetry(encodeExact)).toEqual({ blob: exact });
  expect(encodeExact).toHaveBeenCalledOnce();
  expect(encodeExact).toHaveBeenCalledWith(0.82);

  const small = blobOfSize(100);
  const encodeRetry = vi.fn()
    .mockResolvedValueOnce(blobOfSize(4 * 1024 * 1024 + 1))
    .mockResolvedValueOnce(small);
  expect(await encodeWebpWithRetry(encodeRetry)).toEqual({ blob: small });
  expect(encodeRetry).toHaveBeenNthCalledWith(1, 0.82);
  expect(encodeRetry).toHaveBeenNthCalledWith(2, 0.65);

  const encodeTooLarge = vi.fn()
    .mockResolvedValueOnce(blobOfSize(4 * 1024 * 1024 + 1))
    .mockResolvedValueOnce(blobOfSize(4 * 1024 * 1024 + 1));
  expect(await encodeWebpWithRetry(encodeTooLarge))
    .toEqual({ error: "Image could not be compressed below 4 MB." });
});

it("rejects an undecodable allowed-MIME image", async () => {
  vi.stubGlobal("createImageBitmap", vi.fn().mockRejectedValue(new Error("decode failed")));
  const file = new File(["corrupt"], "photo.png", { type: "image/png" });
  await expect(preparePostImage(file)).resolves.toEqual({ error: "Unable to read this image." });
  vi.unstubAllGlobals();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/image-prep.test.ts`

Expected: FAIL because the image preparation module does not exist.

- [ ] **Step 3: Implement `decideImagePrep`, `encodeWebpWithRetry`, and `preparePostImage` in `src/lib/admin/image-prep.ts`**

Export the exact MIME tuple `["image/jpeg", "image/png", "image/webp", "image/gif"]`, `MAX_RAW_IMAGE_BYTES = 20 * 1024 * 1024`, `MAX_UPLOAD_IMAGE_BYTES = 4 * 1024 * 1024`, and `MAX_IMAGE_SIDE = 2000`. Reject empty files and invalid decoded dimensions; return GIFs unchanged; resize other types with `Math.min(1, 2000 / Math.max(width, height))`; use `canvas.toBlob(..., "image/webp", 0.82)` and retry once at `0.65`. Use fixed client messages: `Only JPEG, PNG, WebP, or GIF images are supported.`, `Images must be 20 MB or smaller.`, `GIFs must be 4 MB or smaller.`, `Image could not be compressed below 4 MB.`, and `Unable to read this image.`. Keep this module browser-safe with no server imports.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/image-prep.test.ts`

Expected: all MIME, exact-size boundary, resize/no-upscale, GIF, retry, and corrupt-input assertions pass.

- [ ] **Step 5: Commit image preparation**

```bash
git add src/lib/admin/image-prep.ts tests/image-prep.test.ts
git commit -m "feat: prepare inline post images" -m "Co-authored-by: Copilot App <223556219+Copilot@users.noreply.github.com>"
```

### Task 3: Authenticated Inline-Image Server Action

**Files:**
- Create: `src/app/admin/posts/image-actions.ts`
- Modify: `next.config.ts:1-12`
- Test: `tests/post-image-action.test.ts`

**Interfaces:**
- Consumes: `POST_IMAGE_MIME_TYPES`, `MAX_UPLOAD_IMAGE_BYTES`, `requireUser()`, `createSupabaseServer()`, and `uploadImage(supabase, file, folder)`.
- Produces: `uploadPostImage(formData: FormData): Promise<{ url: string } | { error: string }>`; the `FormData` file field is exactly `"file"`.

- [ ] **Step 1: Write failing action tests**

Follow the fake Supabase/auth/storage pattern in `tests/posts-actions.test.ts`. Define `formWithFile(file: File): FormData`, `fileOfType(type: string): File`, `fileOfSize(size: number): File`, fake auth state `fakeAuth.user`, owner/other-user fixtures, a `storageUpload: ReturnType<typeof vi.fn>` spy, a `storageFailure: Error`, and a `consoleError` spy. Add these named cases and assertions:

```ts
it("returns a fixed generic error for a non-admin user", async () => {
  fakeAuth.user = otherUser;
  expect(await uploadPostImage(formWithFile(validImage)))
    .toEqual({ error: "Image upload failed. Please try again." });
  expect(storageUpload).not.toHaveBeenCalled();
});

it("checks MIME type and the exact 4 MB file boundary", async () => {
  expect(await uploadPostImage(formWithFile(fileOfType("image/svg+xml"))))
    .toEqual({ error: "Unsupported image type." });
  expect(await uploadPostImage(formWithFile(fileOfSize(4 * 1024 * 1024 + 1))))
    .toEqual({ error: "Image must be 4 MB or smaller." });
  expect(await uploadPostImage(formWithFile(fileOfSize(4 * 1024 * 1024))))
    .toEqual({ url: "https://project.supabase.co/storage/v1/object/public/media/posts/inline/test.webp" });
});

it("does not expose auth or Storage details", async () => {
  fakeAuth.user = null;
  expect(await uploadPostImage(formWithFile(validImage)))
    .toEqual({ error: "Image upload failed. Please try again." });
  fakeAuth.user = ownerUser;
  storageUpload.mockRejectedValue(storageFailure);
  expect(await uploadPostImage(formWithFile(validImage)))
    .toEqual({ error: "Image upload failed. Please try again." });
  expect(consoleError).toHaveBeenCalledWith(expect.any(String), storageFailure);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/post-image-action.test.ts`

Expected: FAIL because `uploadPostImage` and its action module do not exist.

- [ ] **Step 3: Implement `uploadPostImage` and the Next.js body limit**

In `src/app/admin/posts/image-actions.ts`, use `"use server"`, create the server client with `await createSupabaseServer()`, call `requireUser(supabase)` before validating the file, re-check MIME and `file.size <= MAX_UPLOAD_IMAGE_BYTES`, then call `uploadImage(supabase, file, "posts/inline")`. Catch auth and Storage errors, log details only with `console.error`, and return the fixed generic error; never redirect, return exception messages, or wrap this action in `withAdminAction`. In `next.config.ts`, set `experimental.serverActions.bodySizeLimit` to `"4.5mb"` without changing other config.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/post-image-action.test.ts`

Expected: all authorization, MIME, exact 4 MB boundary, folder/public URL, and fixed-error assertions pass.

- [ ] **Step 5: Commit the server action**

```bash
git add src/app/admin/posts/image-actions.ts next.config.ts tests/post-image-action.test.ts
git commit -m "feat: add inline image upload action" -m "Co-authored-by: Copilot App <223556219+Copilot@users.noreply.github.com>"
```

### Task 4: Rich/Markdown Editor and Slash Menu

**Files:**
- Create: `src/components/admin/PostBodyEditor.tsx`
- Create: `src/components/admin/post-editor/EditorToolbar.tsx`
- Create: `src/components/admin/post-editor/SlashMenu.tsx`
- Create: `src/components/admin/post-editor/form-context.tsx`
- Create: `src/lib/admin/post-editor/slash-commands.ts`
- Test: `tests/post-editor-commands.test.ts`

**Interfaces:**
- Consumes: Task 1 `createPostEditorExtensions`, `parsePostMarkdown`, `serializePostMarkdown`, and `getInitialPostEditorState`.
- Produces: `PostBodyEditor({ name, label, defaultValue }: { name: string; label: string; defaultValue?: string | null }): JSX.Element`, `type SlashCommand = { id: string; label: string; keywords: readonly string[]; execute(editor: Editor): void }`, `getPostEditorSlashItems(query: string): readonly SlashCommand[]`, and `usePostEditFormContext(): { markDirty(): void; reportPendingUploads(name: string, count: number): void }`.

- [ ] **Step 1: Write failing slash-command helper tests**

Create `tests/post-editor-commands.test.ts` and add:

```ts
it("filters slash commands by label and keyword", () => {
  expect(getPostEditorSlashItems("h1").map(({ id }) => id)).toEqual(["heading-1"]);
  expect(getPostEditorSlashItems("quote").map(({ id }) => id)).toEqual(["blockquote"]);
  expect(getPostEditorSlashItems("no-match")).toEqual([]);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/post-editor-commands.test.ts`

Expected: FAIL because the slash-command helper does not exist.

- [ ] **Step 3: Implement the editor, toolbar, and slash menu**

Use `useEditor({ ..., immediatelyRender: false })`; render one hidden `<input name={name}>` as the sole submitted Markdown value and a nameless `<textarea>` in Markdown mode. Rich-mode updates and Rich-to-Markdown transitions call `editor.getMarkdown()`; Markdown-to-Rich parses with `parsePostMarkdown`. Initialize mode/notice through `getInitialPostEditorState`; keep the exact notice and allow an explicit switch to Rich. Call `markDirty()` on rich updates, Markdown text changes, and mode changes. Include headings, bold, italic, strike, inline code, lists, blockquote, code block, link, table, undo/redo, and mode toggle. Populate slash items `paragraph`, `heading-1`, `heading-2`, `heading-3`, `bullet-list`, `ordered-list`, `blockquote`, `code-block`, `horizontal-rule`, and `table`, each with a label, matching keywords, and an editor command. Use `Suggestion` from `@tiptap/suggestion` with `char: "/"` and the pure filtered block commands; render its popup from the suggestion lifecycle. Define the form context with no-op defaults so the editor can render before Task 6 provides its form owner.

- [ ] **Step 4: Run the helper tests and UI build checks**

Run: `npx vitest run tests/post-editor-commands.test.ts && npm run lint && npx tsc --noEmit && npm run build`

Expected: helper assertions pass and lint, type-check, and build succeed.

- [ ] **Step 5: Manually verify the rich editor in Playwright**

Against `npm run dev`, open an authenticated admin post and verify toolbar marks/headings/lists/code/table, keyboard bold and undo/redo, `/` filtering and selection, hidden Markdown form value, Markdown mode editing, and raw-HTML fallback with the exact notice.

- [ ] **Step 6: Commit the editor**

```bash
git add src/components/admin/PostBodyEditor.tsx src/components/admin/post-editor/EditorToolbar.tsx src/components/admin/post-editor/SlashMenu.tsx src/components/admin/post-editor/form-context.tsx src/lib/admin/post-editor/slash-commands.ts tests/post-editor-commands.test.ts
git commit -m "feat: add rich post body editor" -m "Co-authored-by: Copilot App <223556219+Copilot@users.noreply.github.com>"
```

### Task 5: Inline Image Insertion and Editing

**Files:**
- Create: `src/components/admin/post-editor/UploadPlaceholder.tsx`
- Create: `src/components/admin/post-editor/image-upload.ts`
- Create: `src/lib/admin/post-editor/upload-state.ts`
- Modify: `src/components/admin/PostBodyEditor.tsx`
- Modify: `src/components/admin/post-editor/EditorToolbar.tsx`
- Modify: `src/components/admin/post-editor/SlashMenu.tsx`
- Test: `tests/post-editor-upload-state.test.ts`
- Test: `tests/post-editor-commands.test.ts`

**Interfaces:**
- Consumes: Task 2 `preparePostImage(file)`, Task 3 `uploadPostImage(formData)`, Task 4 `PostBodyEditor` and slash-command APIs.
- Produces: `reduceUploadState(state: readonly string[], action: { type: "start" | "finish"; id: string }): string[]`, `findUploadPlaceholder(editor: Editor, id: string): number | null`, and `uploadImageAtPosition(editor: Editor, file: File, position: number): Promise<void>`.

- [ ] **Step 1: Write failing upload-state and image slash-command tests**

Create `tests/post-editor-upload-state.test.ts` and add:

```ts
it("keeps the second upload pending when the first settles", () => {
  const both = reduceUploadState(
    reduceUploadState([], { type: "start", id: "first" }),
    { type: "start", id: "second" },
  );
  expect(reduceUploadState(both, { type: "finish", id: "first" })).toEqual(["second"]);
});
```

In `tests/post-editor-commands.test.ts`, add:

```ts
it("offers image insertion for the image slash query", () => {
  expect(getPostEditorSlashItems("image").map(({ id }) => id)).toEqual(["image"]);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/post-editor-upload-state.test.ts tests/post-editor-commands.test.ts`

Expected: FAIL because upload-state tracking and the image slash command do not exist.

- [ ] **Step 3: Implement placeholder lifecycle and all image insertion paths**

Define an atomic `imageUploadPlaceholder` node rendered as a spinner and append it to the base extensions when initializing `PostBodyEditor`. For toolbar, `/image`, drop, and pasted files, save the insertion position, add a uniquely identified placeholder, call `preparePostImage`, submit the prepared file in `FormData("file")` to `uploadPostImage`, and locate the placeholder by ID when the async action resolves. Call `reportPendingUploads(name, pendingIds.length)` whenever the per-editor pending IDs change. Replace the placeholder with an Image node on success using only `src` and `alt`, then prompt with `window.prompt("Alt text for this image")`; treat cancel as empty alt text. On any prep/action failure, remove only that placeholder and show the fixed returned/client error inline. Add the image `BubbleMenu` imported from `@tiptap/react/menus`, shown only for an image selection, with edit-alt and remove controls. Keep images block-level and full editor width.

- [ ] **Step 4: Run the focused tests and UI build checks**

Run: `npx vitest run tests/post-editor-upload-state.test.ts tests/post-editor-commands.test.ts && npm run lint && npx tsc --noEmit && npm run build`

Expected: concurrent pending-state and slash image assertions pass; lint, type-check, and build succeed.

- [ ] **Step 5: Manually verify image upload paths in Playwright**

Against `npm run dev`, verify toolbar selection, `/image`, drag/drop, and clipboard paste each show a placeholder, upload, and insert an image; set alt text after insertion; edit alt and remove via the image bubble menu; verify a rejected type, corrupt image, raw file over 20 MB, GIF over 4 MB, and failed action each show an inline error and remove the placeholder.

- [ ] **Step 6: Commit inline image editing**

```bash
git add src/components/admin/post-editor/UploadPlaceholder.tsx src/components/admin/post-editor/image-upload.ts src/lib/admin/post-editor/upload-state.ts src/components/admin/PostBodyEditor.tsx src/components/admin/post-editor/EditorToolbar.tsx src/components/admin/post-editor/SlashMenu.tsx src/lib/admin/post-editor/slash-commands.ts tests/post-editor-upload-state.test.ts tests/post-editor-commands.test.ts
git commit -m "feat: add inline post image editing" -m "Co-authored-by: Copilot App <223556219+Copilot@users.noreply.github.com>"
```

### Task 6: Bilingual Tabs, Form Status, and Save Guard

**Files:**
- Create: `src/components/admin/PostLanguageTabs.tsx`
- Create: `src/components/admin/PostEditForm.tsx`
- Create: `src/lib/admin/post-editor/form-state.ts`
- Modify: `src/components/admin/post-editor/form-context.tsx`
- Modify: `src/components/admin/PostBodyEditor.tsx`
- Modify: `src/app/admin/posts/[id]/page.tsx:4-48`
- Modify: `tests/posts-actions.test.ts:100-170`
- Delete: `src/components/admin/MarkdownEditor.tsx`
- Test: `tests/post-editor-form-state.test.ts`

**Interfaces:**
- Consumes: Task 4 form context and `PostBodyEditor`; Task 5 pending-upload reports.
- Produces: `initialPostFormState: PostFormState`, `type PostFormState = { dirty: boolean; pendingUploads: Record<string, number> }`, `type PostFormAction = { type: "change" } | { type: "pending"; field: string; count: number } | { type: "submitted" }`, `reducePostFormState(state: PostFormState, action: PostFormAction): PostFormState`, `hasPendingUploads(state: PostFormState): boolean`, `PostLanguageTabs({ titleEn, bodyMdEn, titleNo, bodyMdNo }: { titleEn: string | null; bodyMdEn: string | null; titleNo: string | null; bodyMdNo: string | null }): JSX.Element`, and `PostEditForm({ children }: { children: React.ReactNode }): JSX.Element`.

- [ ] **Step 1: Write failing form-state tests**

Create `tests/post-editor-form-state.test.ts` and add:

```ts
it("keeps Save disabled until both language uploads finish", () => {
  const enPending = reducePostFormState(initialPostFormState, {
    type: "pending", field: "body_md_en", count: 1,
  });
  const bothPending = reducePostFormState(enPending, {
    type: "pending", field: "body_md_no", count: 1,
  });
  const noPending = reducePostFormState(bothPending, {
    type: "pending", field: "body_md_en", count: 0,
  });
  expect(hasPendingUploads(noPending)).toBe(true);
  expect(hasPendingUploads(reducePostFormState(noPending, {
    type: "pending", field: "body_md_no", count: 0,
  }))).toBe(false);
});

it("tracks unsaved edits and clears dirty state on submit", () => {
  const dirty = reducePostFormState(initialPostFormState, { type: "change" });
  expect(dirty.dirty).toBe(true);
  expect(reducePostFormState(dirty, { type: "submitted" }).dirty).toBe(false);
});
```

In `tests/posts-actions.test.ts`, add a persistence regression beside the existing `updatePost` success test:

```ts
it("persists rich-editor Markdown unchanged", async () => {
  const markdown = "![A photo](https://project.supabase.co/storage/v1/object/public/media/posts/inline/photo.webp)\n\n**Bold**";
  await destinationOf(() => updatePost(form({ ...complete, body_md_en: markdown })));
  expect(lastUpdate?.body_md_en).toBe(markdown);
});
```

- [ ] **Step 2: Run the tests to verify the new form-state test fails**

Run: `npx vitest run tests/post-editor-form-state.test.ts tests/posts-actions.test.ts`

Expected: FAIL because the form-state helpers do not exist; the unchanged `updatePost` regression passes.

- [ ] **Step 3: Implement bilingual tabs and form ownership**

Render EN and NO tabs with both title/body panels always mounted; hide only the inactive panel using Tailwind `hidden`, with exact field names `title_en`, `body_md_en`, `title_no`, and `body_md_no`. Keep slug, published, cover, and post ID fields on the existing page and use `<form action={updatePost}>` without changing the action. Provide the form context with pending counts keyed by body field, render the Save submit button inside `PostEditForm` and disable it when `hasPendingUploads` is true, prevent keyboard submission while uploads are pending, mark edits dirty, clear dirty on submit only after the pending check, and install/remove a `beforeunload` handler that warns only while dirty. Delete `MarkdownEditor.tsx` because the only component import is being replaced.

- [ ] **Step 4: Run the focused tests**

Run: `npx vitest run tests/post-editor-form-state.test.ts tests/posts-actions.test.ts`

Expected: form-state and unchanged Markdown persistence assertions pass.

- [ ] **Step 5: Run the complete verification suite**

Run: `npm test && npm run lint && npx tsc --noEmit && npm run build`

Expected: all tests, lint, type-check, and production build pass.

- [ ] **Step 6: Perform the final Playwright MCP visual check**

Start `npm run dev`, open `/admin/posts/<existing-id>` in Playwright MCP, and sign in with the Supabase account matching `ADMIN_EMAIL`. Verify both tabs and preserved values; toolbar/slash formatting; Markdown-mode fidelity notice; image button/drop/paste upload; pending spinner and Save disabled state; alt prompt and bubble edit/remove; over-20-MB and over-4-MB GIF rejection; a near-4-MB prepared WebP request; `beforeunload`; successful save; and the public post's inline `<img>` with `src`, `alt`, and rendered width equal to the content container. If `.env.local` or a usable Supabase admin login is unavailable, record this visual check as manual for the owner; do not create credentials or add an e2e suite.

- [ ] **Step 7: Commit bilingual editing and final verification**

```bash
git add src/components/admin/PostLanguageTabs.tsx src/components/admin/PostEditForm.tsx src/lib/admin/post-editor/form-state.ts src/components/admin/post-editor/form-context.tsx src/components/admin/PostBodyEditor.tsx src/app/admin/posts/[id]/page.tsx src/components/admin/MarkdownEditor.tsx tests/post-editor-form-state.test.ts tests/posts-actions.test.ts
git commit -m "feat: add bilingual post editor tabs" -m "Co-authored-by: Copilot App <223556219+Copilot@users.noreply.github.com>"
```

## Known Risks

- The official `@tiptap/markdown` extension is documented as an early release. Its documented table limitation is multiple child nodes per cell; the round-trip fidelity check must keep unsupported content in Markdown mode by default.
- "Full content width" is satisfied by Tailwind preflight (`img { max-width: 100%; height: auto; display: block }`): images up to 2000 px span the article width; smaller images are not upscaled. No public CSS change.
