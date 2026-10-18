# Task 3 report: Authenticated Inline-Image Server Action

## Implementation

- Added `uploadPostImage(formData)` as a server action. It creates the Supabase server client, authorizes with `requireUser` before validating the `"file"` field, checks the shared MIME allowlist and 4 MB limit, and uploads to `posts/inline`.
- Missing/non-File and unsupported MIME fields return `Unsupported image type.`; oversized files return `Image must be 4 MB or smaller.`; auth, client-creation, and Storage failures return only `Image upload failed. Please try again.` while logging server-side details.
- Set `experimental.serverActions.bodySizeLimit` to `"4.5mb"`.
- Added coverage for authorization-before-validation, MIME and exact size boundary, public URL/folder, missing/non-File inputs, and generic error handling.

## TDD evidence

- **RED:** `npx vitest run tests/post-image-action.test.ts` — failed before tests ran because `@/app/admin/posts/image-actions` did not exist. This was the expected failure for the new action.
- **GREEN:** `npx vitest run tests/post-image-action.test.ts` — 1 test file passed, 4 tests passed.

## Validation

- `npm test` — passed: 16 files, 199 tests.
- `npx eslint src/app/admin/posts/image-actions.ts tests/post-image-action.test.ts next.config.ts` — passed.
- `npx tsc --noEmit` — passed.
- `git diff --check` — passed.

## Files changed

- `src/app/admin/posts/image-actions.ts`
- `next.config.ts`
- `tests/post-image-action.test.ts`
- `.superpowers/sdd/2026-10-18-blog-rich-editor/task-3-report.md`

## Self-review

- The action uses the shared MIME and size constants and existing auth/upload helpers; no client-controlled error details are returned.
- No unrelated behavior or configuration was changed.
- No outstanding concerns.
