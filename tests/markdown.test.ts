import { describe, it, expect } from "vitest";
import { renderMarkdown } from "@/lib/markdown";

describe("renderMarkdown", () => {
  it("renders basic markdown", async () => {
    const html = await renderMarkdown("# Hi\n\nsome **bold** text");
    expect(html).toContain("<h1");
    expect(html).toContain("<strong>bold</strong>");
  });
  it("highlights fenced code with shiki", async () => {
    const html = await renderMarkdown("```ts\nconst x = 1;\n```");
    expect(html).toContain("shiki");
  });
  it("survives unknown code language", async () => {
    const html = await renderMarkdown("```nosuchlang\nfoo\n```");
    expect(html).toContain("foo");
  });

  describe("sanitization", () => {
    it("strips <script> tags from the source", async () => {
      const html = await renderMarkdown("<script>alert('xss')</script>\n\nHello");
      expect(html).not.toContain("<script");
      expect(html).not.toContain("alert(");
    });

    it("strips onerror handlers from raw HTML images", async () => {
      const html = await renderMarkdown('<img src="x" onerror="alert(1)">');
      expect(html).not.toContain("onerror");
    });

    it("neutralizes javascript: URLs in links", async () => {
      const html = await renderMarkdown("[click me](javascript:alert(1))");
      expect(html).not.toContain("javascript:");
    });

    it("preserves ordinary links", async () => {
      const html = await renderMarkdown("[a link](https://example.com)");
      expect(html).toContain('href="https://example.com"');
      expect(html).toContain("a link");
    });

    it("preserves ordinary images", async () => {
      const html = await renderMarkdown("![alt text](https://example.com/img.png)");
      expect(html).toContain("<img");
      expect(html).toContain('src="https://example.com/img.png"');
      expect(html).toContain('alt="alt text"');
    });

    it("preserves gfm tables", async () => {
      const html = await renderMarkdown("| a | b |\n| - | - |\n| 1 | 2 |");
      expect(html).toContain("<table");
      expect(html).toContain("<td>1</td>");
      expect(html).toContain("<td>2</td>");
    });

    it("preserves shiki highlighting markup after sanitization", async () => {
      const html = await renderMarkdown("```ts\nconst x = 1;\n```");
      expect(html).toContain("shiki");
      expect(html).toContain("<span");
      // shiki's dual-theme output relies on inline style custom properties
      // surviving sanitization on nested spans, not just the outer <pre>.
      expect(html).toContain("--shiki-dark");
    });
  });
});
