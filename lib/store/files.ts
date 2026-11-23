import type { ObjectId } from "mongodb";
import { ObjectId as Id } from "mongodb";
import { ApiError } from "../api";
import { collections, fileToDTO, toObjectId, type FileDoc } from "../db";
import { cleanFilename, type FileType } from "../files";
import { STORAGE_DOWN, deleteObject, fileKey, getObject, putObject } from "../storage";
import type { FileDTO } from "../types";

// Los archivos de los recursos: el contenido en el bucket S3, los datos en MongoDB.

export async function uploadFile(userId: ObjectId, originalName: string, type: FileType, bytes: Uint8Array): Promise<FileDTO> {
  const _id = new Id();
  const key = fileKey(_id.toString());
  try {
    await putObject(key, bytes, type);
  } catch (error) {
    console.error("Subida", error);
    throw new ApiError(503, STORAGE_DOWN);
  }
  const doc: FileDoc = {
    filename: cleanFilename(originalName, type),
    contentType: type,
    size: bytes.length,
    key,
    uploadedBy: userId,
    createdAt: new Date(),
  };
  const { files } = await collections();
  await files.insertOne({ _id, ...doc });
  return fileToDTO({ _id, ...doc });
}

export async function listFiles(limit = 50): Promise<FileDTO[]> {
  const { files } = await collections();
  return (await files.find().sort({ createdAt: -1 }).limit(limit).toArray()).map(fileToDTO);
}

export async function readFile(id: string): Promise<{ doc: FileDoc; bytes: Uint8Array }> {
  const _id = toObjectId(id);
  const { files } = await collections();
  const doc = _id ? await files.findOne({ _id }) : null;
  if (!doc) throw new ApiError(404, "No existe ese archivo.");
  let bytes: Uint8Array | null;
  try {
    bytes = await getObject(doc.key);
  } catch (error) {
    console.error("Archivo", error);
    throw new ApiError(503, STORAGE_DOWN);
  }
  if (!bytes) throw new ApiError(404, "El archivo ya no está en el almacenamiento.");
  return { doc, bytes };
}

/** Borra el archivo. Los recursos que lo enlazaban muestran un enlace roto: el editor lo avisa antes. */
export async function removeFile(id: string): Promise<void> {
  const _id = toObjectId(id);
  const { files } = await collections();
  const doc = _id ? await files.findOne({ _id }) : null;
  if (!doc) throw new ApiError(404, "No existe ese archivo.");
  try {
    await deleteObject(doc.key);
  } catch (error) {
    console.error("Borrar archivo", error); // queda huérfano en el bucket; no impide quitarlo
  }
  await files.deleteOne({ _id: doc._id });
}
