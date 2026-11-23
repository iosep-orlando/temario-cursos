import { Suspense } from "react";
import { AppShell, ShellFallback } from "@/components/AppShell";
import { pageAdmin } from "@/lib/page-auth";

// La zona del admin. proxy.ts ya frena a los alumnos; acá se confirma el rol con la base.
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}

async function Shell({ children }: { children: React.ReactNode }) {
  const caller = await pageAdmin();
  return <AppShell caller={caller}>{children}</AppShell>;
}
