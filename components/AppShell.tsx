import { Suspense } from "react";
import { GlobalProvider } from "@/lib/context/GlobalContext";
import type { Caller } from "@/lib/auth";
import AppHeader from "./AppHeader";

/** La cabecera y el estado global, iguales para /cursos y /admin. */
export function AppShell({ caller, children }: { caller: Caller; children: React.ReactNode }) {
  const me = { id: caller.userId.toString(), email: caller.email, name: caller.name, role: caller.role };
  return (
    <GlobalProvider me={me}>
      {/* usePathname depende de la URL: va en Suspense. */}
      <Suspense fallback={<div className="h-16 border-b border-line bg-white" />}>
        <AppHeader />
      </Suspense>
      <div className="mx-auto w-full max-w-6xl px-4 py-6">{children}</div>
    </GlobalProvider>
  );
}

export function ShellFallback() {
  return <div className="h-16 border-b border-line bg-white" />;
}
