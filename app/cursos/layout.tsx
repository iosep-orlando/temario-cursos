import { Suspense } from "react";
import { AppShell, ShellFallback } from "@/components/AppShell";
import { pageUser } from "@/lib/page-auth";

// La zona del alumno (el admin también entra, para ver los cursos como alumno).
export default function CoursesLayout({ children }: LayoutProps<"/cursos">) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}

async function Shell({ children }: { children: React.ReactNode }) {
  const caller = await pageUser();
  return <AppShell caller={caller}>{children}</AppShell>;
}
