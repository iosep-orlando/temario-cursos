"use client";

import { createContext, useContext } from "react";
import type { MeDTO } from "../types";

// ---------------------------------------------------------------------------
// Estado global de la app: quién está conectado y con qué rol. Lo carga el
// servidor una vez (en el layout de /cursos y de /admin) y lo leen la
// cabecera y las pantallas que cambian según el rol, sin pedirlo cada una.
// ---------------------------------------------------------------------------

const GlobalContext = createContext<MeDTO | null>(null);

export function GlobalProvider({ me, children }: { me: MeDTO; children: React.ReactNode }) {
  return <GlobalContext.Provider value={me}>{children}</GlobalContext.Provider>;
}

export function useMe(): MeDTO {
  const me = useContext(GlobalContext);
  if (!me) throw new Error("useMe fuera de <GlobalProvider>");
  return me;
}
