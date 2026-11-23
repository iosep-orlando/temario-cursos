import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/jwt";
import { homeFor } from "@/lib/next-url";

// proxy.ts (el sustituto de middleware.ts en Next.js 16): antes de cada
// página privada mira la sesión, sin base de datos, para que sea rápido.
// Las páginas y la API vuelven a comprobar el rol contra la base.
//
//   /cursos/…  con sesión (alumno o admin)
//   /admin/…   con sesión y rol admin (un alumno va a /cursos)
//   /login     sin sesión (con sesión, al inicio de su rol)
//   /          la landing: pública, no pasa por acá
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const jwt = request.cookies.get(SESSION_COOKIE)?.value;
  const session = jwt ? await verifySession(jwt) : null;

  const redirect = (to: string) => {
    const response = NextResponse.redirect(new URL(to, request.url));
    if (jwt && !session) response.cookies.delete(SESSION_COOKIE); // vencida o alterada
    return response;
  };

  if (pathname === "/login") return session ? redirect(homeFor(session.role)) : NextResponse.next();
  if (!session) return redirect(`/login?next=${encodeURIComponent(pathname + search)}`);
  if (pathname.startsWith("/admin") && session.role !== "admin") return redirect("/cursos");
  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/cursos", "/cursos/:path*", "/admin", "/admin/:path*"],
};
