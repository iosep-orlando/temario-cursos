import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";

// ---------------------------------------------------------------------------
// Almacenamiento S3: los archivos que el admin sube para los recursos
// (PDF e imágenes).
//
// En desarrollo, RustFS en Docker (compatible con S3); en la versión
// publicada, un bucket S3 en la nube (Backblaze B2 o Cloudflare R2). El
// código es el mismo: solo cambian las variables AWS_*.
//
// El bucket es privado: los archivos se sirven a través de la API, que
// comprueba que sean del usuario de la sesión.
// ---------------------------------------------------------------------------

type Env = Record<string, string | undefined>;

export function bucketName(env: Env = process.env): string {
  return env.AWS_BUCKET || "saas-cursos";
}

export function s3Config(env: Env = process.env): S3ClientConfig {
  return {
    endpoint: env.AWS_URL || "http://localhost:9001",
    region: env.AWS_REGION || "us-east-1",
    credentials: {
      accessKeyId: env.AWS_USERNAME || "rustfsadmin",
      secretAccessKey: env.AWS_PASSWORD || "rustfsadmin",
    },
    // RustFS, B2 y R2 aceptan la ruta /bucket/clave; así no hace falta un
    // subdominio por bucket (que en localhost no existe).
    forcePathStyle: true,
  };
}

declare global {
  var _s3: { client: S3Client; ready: Promise<void> | undefined } | undefined;
}

function s3(): S3Client {
  global._s3 ??= { client: new S3Client(s3Config()), ready: undefined };
  return global._s3.client;
}

const statusOf = (error: unknown) =>
  (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;

/**
 * El bucket se crea si no existe (lo pide el enunciado). Una vez por
 * proceso; si falla (RustFS apagado), se vuelve a intentar la próxima vez.
 */
export function ensureBucket(): Promise<void> {
  const state = (global._s3 ??= { client: new S3Client(s3Config()), ready: undefined });
  state.ready ??= (async () => {
    const Bucket = bucketName();
    try {
      await s3().send(new HeadBucketCommand({ Bucket }));
    } catch (error) {
      if (statusOf(error) !== 404) throw error;
      try {
        await s3().send(new CreateBucketCommand({ Bucket }));
        console.log(`Bucket "${Bucket}" creado`);
      } catch (createError) {
        const name = (createError as { name?: string }).name;
        if (name !== "BucketAlreadyOwnedByYou" && name !== "BucketAlreadyExists") throw createError;
      }
    }
  })().catch((error) => {
    state.ready = undefined;
    throw error;
  });
  return state.ready;
}

export async function putObject(key: string, body: Uint8Array, contentType: string): Promise<void> {
  await ensureBucket();
  await s3().send(new PutObjectCommand({ Bucket: bucketName(), Key: key, Body: body, ContentType: contentType }));
}

/** El archivo, o null si no existe. */
export async function getObject(key: string): Promise<Uint8Array | null> {
  await ensureBucket();
  try {
    const result = await s3().send(new GetObjectCommand({ Bucket: bucketName(), Key: key }));
    return result.Body ? await result.Body.transformToByteArray() : null;
  } catch (error) {
    const name = (error as { name?: string }).name;
    if (name === "NoSuchKey" || statusOf(error) === 404) return null;
    throw error;
  }
}

export async function deleteObject(key: string): Promise<void> {
  await ensureBucket();
  await s3().send(new DeleteObjectCommand({ Bucket: bucketName(), Key: key }));
}

// --- Claves -------------------------------------------------------------------------

/** Cada archivo subido, por su id (el nombre original va en la base). */
export const fileKey = (id: string) => `files/${id}`;

/** Mensaje para el usuario cuando el almacenamiento no responde. */
export const STORAGE_DOWN = "No se pudo acceder al almacenamiento de archivos (S3). Probá de nuevo en un rato.";
