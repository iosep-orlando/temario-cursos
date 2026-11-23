import { requireUser } from "@/lib/auth";
import { handle } from "@/lib/api";
import type { MeDTO } from "@/lib/types";

// Quién soy: lo lee el GlobalContext.
export const GET = handle(async () => {
  const c = await requireUser();
  const me: MeDTO = { id: c.userId.toString(), email: c.email, name: c.name, role: c.role };
  return Response.json(me);
});
