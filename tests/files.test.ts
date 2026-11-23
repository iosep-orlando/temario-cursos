import { describe, expect, it } from "vitest";
import { MAX_FILE_BYTES, cleanFilename, detectFileType, isImage, markdownFor, validateUpload } from "@/lib/files";

const bytes = (...parts: (number[] | string)[]) =>
  new Uint8Array(parts.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p)));

describe("tipo de archivo por sus bytes", () => {
  it.each([
    [bytes("%PDF-1.4\n"), "application/pdf"],
    [bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]), "image/png"],
    [bytes([0xff, 0xd8, 0xff, 0xe0]), "image/jpeg"],
    [bytes("GIF89a.."), "image/gif"],
    [bytes("GIF87a.."), "image/gif"],
    [bytes("RIFF", [0, 0, 0, 0], "WEBPVP8 "), "image/webp"],
  ])("%#", (data, type) => {
    expect(detectFileType(data)).toBe(type);
  });
  it("no acepta lo que no es PDF ni imagen, aunque se llame .pdf", () => {
    expect(detectFileType(bytes("<html><script>"))).toBeNull();
    expect(detectFileType(bytes("<svg onload=alert(1)>"))).toBeNull();
    expect(detectFileType(bytes("RIFF", [0, 0, 0, 0], "WAVEfmt "))).toBeNull();
  });
  it("validación", () => {
    expect(validateUpload(bytes("%PDF-"))).toEqual({ ok: true, type: "application/pdf" });
    expect(validateUpload(new Uint8Array())).toEqual({ ok: false, error: "El archivo está vacío." });
    expect(validateUpload(new Uint8Array(MAX_FILE_BYTES + 1))).toEqual({ ok: false, error: "El archivo puede pesar hasta 10 MB." });
    expect(validateUpload(bytes("hola")).ok).toBe(false);
  });
});

describe("nombre del archivo", () => {
  it.each([
    ["Chuleta de Git.pdf", "application/pdf", "Chuleta-de-Git.pdf"],
    ["C:\\fotos\\Diagrama ñandú.PNG", "image/png", "Diagrama-nandu.png"],
    ["../../etc/passwd", "application/pdf", "passwd.pdf"],
    ["foto.jpeg", "image/jpeg", "foto.jpg"],
    ["mentira.pdf", "image/png", "mentira.png"],
    ["", "image/gif", "archivo.gif"],
    ["...", "image/webp", "archivo.webp"],
  ] as const)("%j", (name, type, clean) => {
    expect(cleanFilename(name, type)).toBe(clean);
  });
});

describe("lo que se inserta en el Markdown", () => {
  it("una imagen se ve; un PDF es un enlace", () => {
    expect(markdownFor({ filename: "d.png", contentType: "image/png", url: "/api/files/1/d.png" })).toBe("![d.png](/api/files/1/d.png)");
    expect(markdownFor({ filename: "c.pdf", contentType: "application/pdf", url: "/api/files/2/c.pdf" })).toBe("[📄 c.pdf](/api/files/2/c.pdf)");
    expect(isImage("image/webp")).toBe(true);
    expect(isImage("application/pdf")).toBe(false);
  });
});
