import ReactMarkdown from "react-markdown";
import { isExternal, rehypePlugins, remarkPlugins } from "@/lib/markdown";

/**
 * El contenido de un recurso, ya convertido. Sirve igual en el servidor
 * (la vista del alumno) y en el navegador (la vista previa del editor): el
 * alumno ve exactamente lo que el admin vio al escribir.
 */
export default function Markdown({ content }: { content: string }) {
  return (
    <div className="prose-temario">
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={{
          a: ({ href, children, node: _node, ...rest }) =>
            isExternal(href) ? (
              <a href={href} target="_blank" rel="noreferrer" {...rest}>
                {children}
              </a>
            ) : (
              <a href={href} {...rest}>
                {children}
              </a>
            ),
          // eslint-disable-next-line @next/next/no-img-element -- imágenes del contenido (de /api/files o externas)
          img: ({ node: _node, alt, ...rest }) => <img alt={alt ?? ""} loading="lazy" {...rest} />,
          table: ({ node: _node, ...rest }) => (
            <div className="table-wrap">
              <table {...rest} />
            </div>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
