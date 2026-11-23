import { requireUser } from "@/lib/auth";
import { handle } from "@/lib/api";
import { readFile } from "@/lib/store/files";

/**
 * Un archivo de los recursos, desde el bucket. Solo con sesión: el bucket es
 * privado y los archivos son parte del contenido de los cursos. El nombre
 * de la URL es para que se lea bien (y se descargue con ese nombre); el que
 * vale es el id.
 */
export const GET = handle(async (_request: Request, ctx: RouteContext<"/api/files/[id]/[name]">) => {
  await requireUser();
  const { doc, bytes } = await readFile((await ctx.params).id);
  return new Response(Buffer.from(bytes), {
    headers: {
      "content-type": doc.contentType,
      "content-disposition": `inline; filename="${doc.filename}"`,
      "cache-control": "private, max-age=3600",
      // Se sirve con el tipo que se comprobó al subirlo (PDF o imagen), y el
      // navegador no puede adivinar otro: nunca se interpreta como página.
      // (Sin CSP "sandbox": Chrome no muestra PDFs en un documento aislado.)
      "x-content-type-options": "nosniff",
    },
  });
});
