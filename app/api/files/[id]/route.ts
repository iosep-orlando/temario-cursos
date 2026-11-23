import { requireAdmin } from "@/lib/auth";
import { handle } from "@/lib/api";
import { removeFile } from "@/lib/store/files";

export const DELETE = handle(async (_request: Request, ctx: RouteContext<"/api/files/[id]">) => {
  await requireAdmin();
  await removeFile((await ctx.params).id);
  return new Response(null, { status: 204 });
});
