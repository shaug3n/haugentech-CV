import sanitize from "sanitize-html";

// Rendered markdown is injected into pages with dangerouslySetInnerHTML, and
// `marked` performs no sanitization of its own — raw HTML in the markdown
// source (including <script> tags, event-handler attributes, and
// javascript: URLs) would otherwise pass straight through. We sanitize as
// the final step, after shiki highlighting, so the sanitizer allowlist has
// to accommodate the class/style attributes shiki puts on <pre>/<code>/<span>
// for its dual light/dark theme output.
//
// Shiki (with `themes: { light, dark }`) emits inline `style` attributes
// carrying only `color`, `background-color`, and the CSS custom properties
// `--shiki-dark` / `--shiki-dark-bg`, all with hex-color values (verified
// against the actual shiki output for the github-light/github-dark theme
// pair used below — neither theme emits fontStyle/fontWeight/textDecoration
// tokens). We allowlist exactly those properties with a hex-color-only value
// pattern via `allowedStyles`. sanitize-html's style parser does preserve
// custom properties (verified empirically) as long as the property name is
// present in the allowlist — it does not need special-casing beyond that.
// Anything else in a `style` attribute (background-image/url(), position,
// z-index, etc.) has no matching allowlist entry and is dropped entirely.
const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const SHIKI_STYLE_ALLOWLIST = {
  color: [HEX_COLOR],
  "background-color": [HEX_COLOR],
  "--shiki-dark": [HEX_COLOR],
  "--shiki-dark-bg": [HEX_COLOR],
};

const SANITIZE_OPTIONS: sanitize.IOptions = {
  allowedTags: sanitize.defaults.allowedTags.concat(["img"]),
  allowedAttributes: {
    ...sanitize.defaults.allowedAttributes,
    img: ["src", "alt", "title", "width", "height"],
    a: ["href", "name", "target", "rel"],
    pre: ["class", "style", "tabindex"],
    code: ["class", "style"],
    span: ["class", "style"],
  },
  // http(s)/mailto only — javascript: and other schemes are dropped.
  allowedSchemes: ["http", "https", "mailto"],
  allowedStyles: {
    pre: SHIKI_STYLE_ALLOWLIST,
    code: SHIKI_STYLE_ALLOWLIST,
    span: SHIKI_STYLE_ALLOWLIST,
  },
};

/**
 * The one sanitizer for rendered-markdown HTML. Used by `renderMarkdown()` on
 * the server and by the admin MarkdownEditor's live preview in the browser, so
 * the preview can't render something the real pipeline would have stripped.
 *
 * This lives in its own module rather than in src/lib/markdown.ts purely so the
 * client component can import it: markdown.ts pulls in `shiki`, and importing
 * that from a client component would drag the whole highlighter and its grammars
 * into the browser bundle. markdown.ts re-exports this for convenience.
 */
export function sanitizeHtml(html: string): string {
  return sanitize(html, SANITIZE_OPTIONS);
}
