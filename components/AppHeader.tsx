"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMe } from "@/lib/context/GlobalContext";
import { api } from "@/lib/fetcher";
import { ROLE_LABEL } from "@/lib/roles";
import Logo from "./Logo";

const ADMIN_LINKS = [
  { href: "/admin", label: "Panel" },
  { href: "/admin/comentarios", label: "Comentarios" },
  { href: "/cursos", label: "Ver como alumno" },
];
const STUDENT_LINKS = [{ href: "/cursos", label: "Mis cursos" }];

/** La cabecera cambia según el rol: el admin tiene su panel; el alumno, sus cursos. */
export default function AppHeader() {
  const me = useMe();
  const router = useRouter();
  const pathname = usePathname();
  const links = me.role === "admin" ? ADMIN_LINKS : STUDENT_LINKS;

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2">
        <Logo href={me.role === "admin" ? "/admin" : "/cursos"} />
        <nav aria-label="Principal" className="flex gap-1 overflow-x-auto">
          {links.map(({ href, label }) => {
            const active = href === "/admin" ? pathname === "/admin" || pathname.startsWith("/admin/cursos") || pathname.startsWith("/admin/recursos") : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-semibold ${active ? "bg-tinta text-white" : "hover:bg-hoja"}`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="hidden text-muted sm:inline">{me.email}</span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${me.role === "admin" ? "bg-margen/10 text-margen" : "bg-birome/10 text-birome"}`}>
            {ROLE_LABEL[me.role]}
          </span>
          <button type="button" onClick={logout} className="rounded-md px-2 py-1 font-semibold text-muted hover:bg-hoja hover:text-tinta">
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
