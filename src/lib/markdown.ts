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
  // Shiki emits CSS custom properties (e.g. --shiki-dark) as inline style
  // values to drive the dark-theme override in globals.css. sanitize-html's
  // style-value parser doesn't understand custom properties, so we disable
  // per-declaration filtering and rely on the strict tag/attribute allowlist
  // above (script/iframe/object/embed and event handlers are never allowed
  // attributes/tags in the first place) to keep this safe.
  parseStyleAttributes: false,
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
      const t = token as unknown as { type: string; text: string; escaped?: boolean };
      t.type = "html";
      t.text = html;
      t.escaped = true;
    },
  });
  const rendered = (await marked.parse(md)) as string;
  return sanitizeHtml(rendered, SANITIZE_OPTIONS);
}
