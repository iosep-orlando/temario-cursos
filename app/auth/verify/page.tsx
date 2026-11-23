import type { Metadata } from "next";
import { Suspense } from "react";
import Logo from "@/components/Logo";
import VerifyLogin from "@/components/VerifyLogin";

export const metadata: Metadata = { title: "Entrar" };

export default function VerifyPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <Logo href="/login" />
      <Suspense>
        <VerifyLogin />
      </Suspense>
    </main>
  );
}
