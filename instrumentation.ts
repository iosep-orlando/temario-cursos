// Next.js llama a register() una vez, al arrancar el servidor. Acá se
// prepara el bucket S3 (se crea si no existe), solo en el runtime de Node.
// Si RustFS no está levantado no impide arrancar: se avisa y se vuelve a
// intentar al primer uso.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { bucketName, ensureBucket } = await import("./lib/storage");
  try {
    await ensureBucket();
    console.log(`Almacenamiento S3 listo (bucket "${bucketName()}")`);
  } catch (error) {
    console.warn(
      `No se pudo conectar con el almacenamiento S3 (${process.env.AWS_URL ?? "AWS_URL sin definir"}):`,
      error instanceof Error ? error.message : error,
    );
  }
}
