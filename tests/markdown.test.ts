import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Markdown from "@/components/Markdown";
import { isExternal, youtubeId } from "@/lib/markdown";

const render = (content: string) => renderToStaticMarkup(createElement(Markdown, { content }));

describe("youtubeId: cualquier enlace de YouTube", () => {
  it.each([
    ["https://www.youtube.com/watch?v=hwP7WQkmECE", "hwP7WQkmECE"],
    ["https://youtube.com/watch?v=hwP7WQkmECE&t=30s", "hwP7WQkmECE"],
    ["https://m.youtube.com/watch?v=hwP7WQkmECE", "hwP7WQkmECE"],
    ["https://youtu.be/hwP7WQkmECE", "hwP7WQkmECE"],
    ["https://www.youtube.com/embed/hwP7WQkmECE", "hwP7WQkmECE"],
    ["https://www.youtube-nocookie.com/embed/hwP7WQkmECE?start=10", "hwP7WQkmECE"],
    ["https://www.youtube.com/shorts/hwP7WQkmECE", "hwP7WQkmECE"],
    ["http://www.youtube.com/watch?v=-bt_y4Loofg", "-bt_y4Loofg"],
  ])("%s", (url, id) => {
    expect(youtubeId(url)).toBe(id);
  });
  it.each([
    "https://vimeo.com/123456",
    "https://www.youtube.com/watch?v=corto",
    "https://www.youtube.com/@fireship",
    "https://evil.test/embed/hwP7WQkmECE",
    "javascript:alert(1)",
    "no es una url",
    "https://www.youtube.com/watch",
  ])("rechaza %s", (url) => {
    expect(youtubeId(url)).toBeNull();
  });
});

describe("Markdown renderizado", () => {
  it("GFM: tablas, listas de tareas, tachado y código", () => {
    const html = render("| a | b |\n|---|---|\n| 1 | 2 |\n\n- [x] hecho\n- [ ] falta\n\n~~viejo~~\n\n```js\nconst a = 1;\n```");
    expect(html).toContain('<div class="table-wrap"><table>');
    expect(html).toContain('<input type="checkbox" disabled="" checked=""/>');
    expect(html).toContain("<del>viejo</del>");
    expect(html).toContain('<code class="language-js">');
  });

  it("un enlace de YouTube solo en su renglón se convierte en el video (sin cookies)", () => {
    const html = render("Mirá esto:\n\nhttps://www.youtube.com/watch?v=hwP7WQkmECE\n\nY seguí.");
    expect(html).toContain('<iframe src="https://www.youtube-nocookie.com/embed/hwP7WQkmECE"');
    expect(html).toContain('class="video"');
  });

  it("un enlace de YouTube dentro de un texto queda como enlace", () => {
    const html = render("Mirá [el video](https://www.youtube.com/watch?v=hwP7WQkmECE) antes.");
    expect(html).not.toContain("<iframe");
    expect(html).toContain('target="_blank"');
  });

  it("un iframe de YouTube escrito a mano se respeta (pasado a nocookie)", () => {
    const html = render('<iframe src="https://www.youtube.com/embed/Sklc_fQBmcs" title="Next.js" onload="alert(1)"></iframe>');
    expect(html).toContain('src="https://www.youtube-nocookie.com/embed/Sklc_fQBmcs"');
    expect(html).toContain('title="Next.js"');
    expect(html).not.toContain("onload");
  });

  it("un iframe de otro sitio se quita y se avisa", () => {
    const html = render('<iframe src="https://evil.test/robar"></iframe>');
    expect(html).not.toContain("evil.test");
    expect(html).toContain('class="aviso"');
  });

  it("limpia el HTML peligroso: scripts, on…=, javascript: y estilos", () => {
    const html = render(
      '<script>alert(1)</script>\n\n<img src="x.png" onerror="alert(1)">\n\n[malo](javascript:alert(1))\n\n<a href="javascript:alert(1)">otro</a>\n\n<p style="position:fixed">x</p>',
    );
    expect(html).not.toContain("<script");
    expect(html).not.toContain("onerror");
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("position:fixed");
    expect(html).toContain('src="x.png"');
  });

  it("los enlaces de la app (archivos) se abren en la misma pestaña; los externos, en otra", () => {
    const html = render("[pdf](/api/files/abc/chuleta.pdf) y [git](https://git-scm.com)");
    expect(html).toContain('<a href="/api/files/abc/chuleta.pdf">pdf</a>');
    expect(html).toContain('<a href="https://git-scm.com" target="_blank" rel="noreferrer">git</a>');
    expect(isExternal(undefined)).toBe(false);
  });

  it("las imágenes cargan perezosas y siempre tienen alt", () => {
    expect(render("![diagrama](/api/files/abc/d.png)")).toContain('<img alt="diagrama" loading="lazy" src="/api/files/abc/d.png"/>');
  });
});
