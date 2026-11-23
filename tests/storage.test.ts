import { afterEach, describe, expect, it, vi } from "vitest";
import { bucketName, deleteObject, ensureBucket, fileKey, getObject, putObject, s3Config } from "@/lib/storage";

// Un S3 de mentira: se reemplaza el cliente que guarda lib/storage.ts en globalThis.
function fakeS3(handler: (command: { constructor: { name: string }; input: Record<string, unknown> }) => unknown) {
  const send = vi.fn(async (command) => handler(command));
  global._s3 = { client: { send } as never, ready: undefined };
  return send;
}

const http = (status: number, name = "Error") => Object.assign(new Error(name), { name, $metadata: { httpStatusCode: status } });

afterEach(() => {
  global._s3 = undefined;
});

describe("configuración S3", () => {
  it("las variables del enunciado", () => {
    const config = s3Config({ AWS_URL: "http://localhost:9001", AWS_REGION: "us-east-1", AWS_USERNAME: "u", AWS_PASSWORD: "p" });
    expect(config).toMatchObject({
      endpoint: "http://localhost:9001",
      region: "us-east-1",
      credentials: { accessKeyId: "u", secretAccessKey: "p" },
      forcePathStyle: true,
    });
  });
  it("valores por defecto: RustFS local", () => {
    expect(s3Config({})).toMatchObject({ endpoint: "http://localhost:9001", credentials: { accessKeyId: "rustfsadmin" } });
    expect(bucketName({})).toBe("saas-cursos");
    expect(bucketName({ AWS_BUCKET: "otro" })).toBe("otro");
  });
  it("cada archivo por su id", () => {
    expect(fileKey("f9")).toBe("files/f9");
  });
});

describe("el bucket se crea si no existe", () => {
  it("existe: no lo crea", async () => {
    const send = fakeS3(() => ({}));
    await ensureBucket();
    await ensureBucket(); // una sola vez por proceso
    expect(send.mock.calls.map(([c]) => c.constructor.name)).toEqual(["HeadBucketCommand"]);
  });

  it("no existe (404): lo crea", async () => {
    const send = fakeS3((c) => {
      if (c.constructor.name === "HeadBucketCommand") throw http(404, "NotFound");
      return {};
    });
    await ensureBucket();
    expect(send.mock.calls.map(([c]) => c.constructor.name)).toEqual(["HeadBucketCommand", "CreateBucketCommand"]);
  });

  it("otro proceso lo creó en el medio: está bien", async () => {
    fakeS3((c) => {
      if (c.constructor.name === "HeadBucketCommand") throw http(404);
      throw Object.assign(new Error("x"), { name: "BucketAlreadyOwnedByYou" });
    });
    await expect(ensureBucket()).resolves.toBeUndefined();
  });

  it("si no se pudo crear, falla", async () => {
    fakeS3((c) => {
      if (c.constructor.name === "HeadBucketCommand") throw http(404);
      throw Object.assign(new Error("Access Denied"), { name: "AccessDenied" });
    });
    await expect(ensureBucket()).rejects.toThrow("Access Denied");
  });

  it("si S3 no responde, falla y vuelve a intentar la próxima vez", async () => {
    let down = true;
    const send = fakeS3(() => {
      if (down) throw new Error("connect ECONNREFUSED");
      return {};
    });
    await expect(ensureBucket()).rejects.toThrow("ECONNREFUSED");
    down = false;
    await ensureBucket();
    expect(send).toHaveBeenCalledTimes(2);
  });
});

describe("archivos", () => {
  it("subir, bajar y borrar", async () => {
    const stored = new Map<string, Uint8Array>();
    fakeS3((c) => {
      const key = c.input.Key as string;
      switch (c.constructor.name) {
        case "PutObjectCommand":
          expect(c.input).toMatchObject({ Bucket: "saas-cursos", ContentType: "application/pdf" });
          stored.set(key, c.input.Body as Uint8Array);
          return {};
        case "GetObjectCommand":
          if (!stored.has(key)) throw Object.assign(new Error("x"), { name: "NoSuchKey" });
          return { Body: { transformToByteArray: async () => stored.get(key) } };
        case "DeleteObjectCommand":
          stored.delete(key);
          return {};
        default:
          return {};
      }
    });
    await putObject("a.pdf", new Uint8Array([1, 2, 3]), "application/pdf");
    expect(await getObject("a.pdf")).toEqual(new Uint8Array([1, 2, 3]));
    await deleteObject("a.pdf");
    expect(await getObject("a.pdf")).toBeNull();
  });

  it("un 404 es null; otro error se propaga; sin cuerpo es null", async () => {
    fakeS3((c) => {
      if (c.constructor.name !== "GetObjectCommand") return {};
      if (c.input.Key === "404") throw http(404);
      if (c.input.Key === "vacio") return {};
      throw http(500, "InternalError");
    });
    expect(await getObject("404")).toBeNull();
    expect(await getObject("vacio")).toBeNull();
    await expect(getObject("roto")).rejects.toThrow("InternalError");
  });
});
