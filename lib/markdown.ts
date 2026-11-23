import type { Element, ElementContent, Root, RootContent } from "hast";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema, type Options as SanitizeSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import type { PluggableList } from "unified";

// ---------------------------------------------------------------------------
// Cómo se convierte el Markdown de un recurso en HTML, de forma segura.
//
//   remark-gfm      tablas, listas de tareas, tachado y enlaces automáticos
//   rehype-raw      permite HTML dentro del Markdown (para los iframes de YouTube)
//   rehype-sanitize y acá se limpia ese HTML: fuera <script>, on…=, javascript:,
//                   estilos y cualquier etiqueta que no esté en la lista
//   rehypeYoutube   solo quedan los iframes de YouTube (los demás se cambian
//                   por un aviso), y un enlace a YouTube solo en su renglón
//                   se convierte en el video
//
// El contenido lo escribe un admin, pero se limpia igual: una cuenta de
// admin robada no debería poder meter código en el navegador de todos los
// alumnos.
// ---------------------------------------------------------------------------

/** El id de un video a partir de cualquier URL de YouTube conocida, o null. */
export function youtubeId(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  const host = parsed.hostname.replace(/^www\.|^m\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = parsed.pathname.slice(1);
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (parsed.pathname === "/watch") id = parsed.searchParams.get("v");
    else {
      const match = parsed.pathname.match(/^\/(embed|shorts|live)\/([^/]+)/);
      id = match?.[2] ?? null;
    }
  }
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}

/** El iframe que se inserta: youtube-nocookie (no deja cookies hasta darle play). */
export function youtubeEmbed(id: string, title = "Video de YouTube"): Element {
  return {
    type: "element",
    tagName: "iframe",
    properties: {
      src: `https://www.youtube-nocookie.com/embed/${id}`,
      title,
      allow: "accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
      allowFullScreen: true,
      loading: "lazy",
      referrerPolicy: "strict-origin-when-cross-origin",
      className: ["video"],
    },
    children: [],
  };
}

const notice = (text: string): Element => ({
  type: "element",
  tagName: "p",
  properties: { className: ["aviso"] },
  children: [{ type: "text", value: text }],
});

const isElement = (node: RootContent | ElementContent): node is Element => node.type === "element";
const textOf = (node: ElementContent): string =>
  node.type === "text" ? node.value : isElement(node) ? node.children.map(textOf).join("") : "";

/** Recorre el árbol y reemplaza cada nodo por lo que devuelva `fn` (o lo deja). */
function transform(parent: Root | Element, fn: (node: Element) => Element | null) {
  parent.children = parent.children.map((child) => {
    if (!isElement(child)) return child;
    const replaced = fn(child);
    if (replaced) return replaced;
    transform(child, fn);
    return child;
  }) as typeof parent.children;
}

export function rehypeYoutube() {
  return (tree: Root) => {
    transform(tree, (node) => {
      if (node.tagName === "iframe") {
        const id = youtubeId(String(node.properties.src ?? ""));
        return id ? youtubeEmbed(id, String(node.properties.title ?? "Video de YouTube")) : notice("(Acá había un contenido incrustado que no es de YouTube: se quitó.)");
      }
      // Un párrafo que solo tiene un enlace a YouTube: el video en su lugar.
      if (node.tagName === "p") {
        const children = node.children.filter((c) => !(c.type === "text" && !c.value.trim()));
        const only = children.length === 1 ? children[0] : null;
        if (only && isElement(only) && only.tagName === "a") {
          const href = String(only.properties.href ?? "");
          const id = youtubeId(href);
          if (id && textOf(only).trim() === href) return youtubeEmbed(id);
        }
      }
      return null;
    });
  };
}

/** Lo permitido: lo de GitHub (defaultSchema) más los iframes, que después filtra rehypeYoutube. */
export const sanitizeSchema: SanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), "iframe"],
  attributes: {
    ...defaultSchema.attributes,
    iframe: ["src", "title", "width", "height"],
  },
};

export const remarkPlugins: PluggableList = [remarkGfm];
export const rehypePlugins: PluggableList = [rehypeRaw, [rehypeSanitize, sanitizeSchema], rehypeYoutube];

/** Los enlaces externos se abren en otra pestaña; los de la app (/api/files…), en la misma. */
export function isExternal(href: string | undefined): boolean {
  return Boolean(href && /^https?:\/\//i.test(href));
}
