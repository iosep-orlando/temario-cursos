import { requireAdmin } from "@/lib/auth";
import { ApiError, handle } from "@/lib/api";
import { MAX_FILE_BYTES, validateUpload } from "@/lib/files";
import { listFiles, uploadFile } from "@/lib/store/files";

export const GET = handle(async () => {
  await requireAdmin();
  return Response.json({ files: await listFiles() });
});

/**
 * Subir un PDF o una imagen: el archivo va como cuerpo de la petición y el
 * nombre original en ?nombre=. Se guarda en el bucket S3.
 */
export const POST = handle(async (request: Request) => {
  const caller = await requireAdmin();
  if (Number(request.headers.get("content-length") ?? 0) > MAX_FILE_BYTES) {
    throw new ApiError(413, "El archivo puede pesar hasta 10 MB.");
  }
  const bytes = new Uint8Array(await request.arrayBuffer());
  const valid = validateUpload(bytes);
  if (!valid.ok) throw new ApiError(400, valid.error);
  const name = new URL(request.url).searchParams.get("nombre") ?? "archivo";
  return Response.json(await uploadFile(caller.userId, name, valid.type, bytes), { status: 201 });
});
