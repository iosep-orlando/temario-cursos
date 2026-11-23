import { requireAdmin } from "@/lib/auth";
import { handle } from "@/lib/api";
import { toObjectId } from "@/lib/db";
import { listFeedback, type FeedbackFilter } from "@/lib/store/feedback";

const FILTERS: FeedbackFilter[] = ["all", "unanswered", "unhelpful"];

/** Para el admin: ?filtro=unanswered|unhelpful y ?curso=<id>. */
export const GET = handle(async (request: Request) => {
  await requireAdmin();
  const params = new URL(request.url).searchParams;
  const raw = params.get("filtro") ?? "all";
  const filter = FILTERS.includes(raw as FeedbackFilter) ? (raw as FeedbackFilter) : "all";
  const courseId = toObjectId(params.get("curso")) ?? undefined;
  return Response.json({ feedback: await listFeedback({ filter, courseId }) });
});
