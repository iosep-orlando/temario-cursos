import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { formatBytes, formatDateTime, plural } from "@/lib/format";
import { escapeHtml } from "@/lib/html";
import { SESSION_COOKIE, getSecret, signSession, verifySession } from "@/lib/jwt";
import { homeFor, safeNext } from "@/lib/next-url";
import { adminEmails, roleFor } from "@/lib/roles";
import { proxy } from "@/proxy";

describe("roles por ADMIN_EMAILS", () => {
  const env = { ADMIN_EMAILS: " Admin@Temario.test, otra@x.co ,," };
  it("lista normalizada", () => {
    expect(adminEmails(env)).toEqual(["admin@temario.test", "otra@x.co"]);
    expect(adminEmails({})).toEqual([]);
  });
  it("admin si está en la lista; si no, alumno", () => {
    expect(roleFor("ADMIN@temario.test", env)).toBe("admin");
    expect(roleFor("ana@temario.test", env)).toBe("student");
    expect(roleFor("admin@temario.test", {})).toBe("student");
  });
});

describe("sesión con rol", () => {
  it("firma y verifica", async () => {
    const jwt = await signSession({ sub: "u1", email: "a@b.co", role: "admin" });
    expect(await verifySession(jwt)).toEqual({ sub: "u1", email: "a@b.co", role: "admin" });
  });
  it("rechaza un JWT alterado, basura, o con un rol inventado", async () => {
    const jwt = await signSession({ sub: "u1", email: "a@b.co", role: "student" });
    expect(await verifySession(jwt.slice(0, -2) + "xx")).toBeNull();
    expect(await verifySession("basura")).toBeNull();
    const fake = await signSession({ sub: "u1", email: "a@b.co", role: "superadmin" as "admin" });
    expect(await verifySession(fake)).toBeNull();
  });
  it("secreto: fijo en desarrollo, obligatorio en producción", () => {
    expect(getSecret({ NODE_ENV: "development" }).length).toBeGreaterThan(20);
    expect(() => getSecret({ NODE_ENV: "production" })).toThrow("JWT_SECRET");
  });
});

describe("adónde ir después de entrar", () => {
  it("el inicio de cada rol", () => {
    expect(homeFor("admin")).toBe("/admin");
    expect(homeFor("student")).toBe("/cursos");
  });
  it("vuelve a la página que se pidió, si es de la app y le corresponde", () => {
    expect(safeNext("/cursos/git-desde-cero", "student")).toBe("/cursos/git-desde-cero");
    expect(safeNext("/admin/comentarios", "admin")).toBe("/admin/comentarios");
    expect(safeNext("/admin", "student")).toBe("/cursos");
    expect(safeNext("https://malo.test", "admin")).toBe("/admin");
    expect(safeNext("//malo.test/cursos", "student")).toBe("/cursos");
    expect(safeNext("/cursosx", "student")).toBe("/cursos");
    expect(safeNext(undefined, "student")).toBe("/cursos");
  });
});

describe("proxy.ts", () => {
  const request = (path: string, cookie?: string) =>
    new NextRequest(new URL(path, "http://localhost:3000"), { headers: cookie ? { cookie: `${SESSION_COOKIE}=${cookie}` } : {} });
  const location = (r: Response) => r.headers.get("location");

  it("sin sesión, al login recordando adónde iba", async () => {
    expect(location(await proxy(request("/cursos/git-desde-cero")))).toBe("http://localhost:3000/login?next=%2Fcursos%2Fgit-desde-cero");
    expect(location(await proxy(request("/admin")))).toContain("/login?next=%2Fadmin");
  });
  it("un alumno no entra a /admin", async () => {
    const jwt = await signSession({ sub: "u1", email: "a@b.co", role: "student" });
    expect(location(await proxy(request("/admin/cursos/nuevo", jwt)))).toBe("http://localhost:3000/cursos");
    expect(location(await proxy(request("/cursos", jwt)))).toBeNull();
  });
  it("un admin entra a todo", async () => {
    const jwt = await signSession({ sub: "u1", email: "a@b.co", role: "admin" });
    expect(location(await proxy(request("/admin", jwt)))).toBeNull();
    expect(location(await proxy(request("/cursos", jwt)))).toBeNull();
  });
  it("con sesión, el login lleva al inicio del rol", async () => {
    const admin = await signSession({ sub: "u1", email: "a@b.co", role: "admin" });
    const student = await signSession({ sub: "u2", email: "c@d.co", role: "student" });
    expect(location(await proxy(request("/login", admin)))).toBe("http://localhost:3000/admin");
    expect(location(await proxy(request("/login", student)))).toBe("http://localhost:3000/cursos");
    expect(location(await proxy(request("/login")))).toBeNull();
  });
  it("una sesión alterada se borra", async () => {
    const r = await proxy(request("/cursos", "basura"));
    expect(location(r)).toContain("/login");
    expect(r.headers.get("set-cookie")).toContain(`${SESSION_COOKIE}=;`);
  });
});

describe("formatos", () => {
  it("varios", () => {
    expect(plural(1, "recurso", "recursos")).toBe("1 recurso");
    expect(plural(1500, "recurso", "recursos")).toBe("1.500 recursos");
    expect(formatBytes(500)).toBe("500 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(3.5 * 1024 * 1024)).toBe("3,5 MB");
    expect(formatDateTime(null)).toBe("—");
    expect(formatDateTime("2026-11-23T00:05:00Z")).toMatch(/22 nov.*21:05/);
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
  });
});
