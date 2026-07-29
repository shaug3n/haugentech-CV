import { Marked } from "marked";
import { codeToHtml } from "shiki";
import sanitizeHtml from "sanitize-html";

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

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
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

export async function renderMarkdown(md: string): Promise<string> {
  const marked = new Marked({ async: true, gfm: true });
  marked.use({
    async: true,
    walkTokens: async (token) => {
      if (token.type !== "code") return;
      let html: string;
      try {
        html = await codeToHtml(token.text, {
          lang: token.lang || "text",
          themes: { light: "github-light", dark: "github-dark" },
        });
      } catch {
        html = await codeToHtml(token.text, {
          lang: "text",
          themes: { light: "github-light", dark: "github-dark" },
        });
      }
      const t = token as unknown as { type: string; text: string };
      t.type = "html";
      t.text = html;
    },
  });
  const rendered = (await marked.parse(md)) as string;
  return sanitizeHtml(rendered, SANITIZE_OPTIONS);
}
