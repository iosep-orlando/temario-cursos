import { hashToken, startSession } from "@/lib/auth";
import { ApiError, handle, readJson } from "@/lib/api";
import { collections } from "@/lib/db";
import { safeNext } from "@/lib/next-url";
import { roleFor } from "@/lib/roles";

// Canjear el enlace por una sesión. Es un POST que dispara el botón
// "Entrar" de /auth/verify, no el simple hecho de abrir el enlace: los
// antivirus de correo abren los enlaces de los mails para revisarlos, y si
// eso bastara, gastarían el enlace antes que la persona.
export const POST = handle(async (request: Request) => {
  const body = await readJson(request);
  const token = typeof body.token === "string" ? body.token : "";
  if (!token) throw new ApiError(400, "Falta el enlace.");

  const { loginTokens, users } = await collections();
  const now = new Date();
  // Atómico: un enlace sirve una sola vez, aunque se use en dos pestañas a la vez.
  const login = await loginTokens.findOneAndUpdate(
    { tokenHash: hashToken(token), usedAt: null, expiresAt: { $gt: now } },
    { $set: { usedAt: now } },
  );
  if (!login) throw new ApiError(400, "Este enlace ya no vale: se usó o pasaron más de 15 minutos. Pedí otro.");

  // El primer ingreso crea la cuenta. El rol se recalcula en cada ingreso
  // con ADMIN_EMAILS: sumar o sacar un admin es cambiar la variable.
  const role = roleFor(login.email);
  const user = await users.findOneAndUpdate(
    { email: login.email },
    {
      $set: { role },
      $setOnInsert: { email: login.email, name: login.email.split("@")[0], createdAt: now },
    },
    { upsert: true, returnDocument: "after" },
  );
  await startSession({ sub: user!._id.toString(), email: login.email, role });
  return Response.json({ next: safeNext(body.next, role) });
});
