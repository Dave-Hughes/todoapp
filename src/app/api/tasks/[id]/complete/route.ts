import { getAuthedContext } from "@/lib/auth-context";
import {
  getTaskForHousehold,
  updateTaskForHousehold,
} from "@/lib/db/queries/tasks";
import { logTaskEvent } from "@/lib/db/queries/task-events";
import { handleRouteError, json, error } from "@/lib/api/responses";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { householdId, user } = await getAuthedContext();

    const existing = await getTaskForHousehold(householdId, id);
    if (!existing) return error("not_found", 404);
    if (existing.completedAt) return json({ task: existing });

    const updated = await updateTaskForHousehold(householdId, id, {
      completedAt: new Date(),
      completedByUserId: user.id,
    });
    if (!updated) return error("not_found", 404);

    await logTaskEvent({
      taskId: updated.id,
      householdId,
      actorUserId: user.id,
      eventType: "completed",
    });
    if (updated.points > 0) {
      await logTaskEvent({
        taskId: updated.id,
        householdId,
        actorUserId: user.id,
        eventType: "points_earned",
        metadata: { points: updated.points },
      });
    }

    return json({ task: updated });
  } catch (err) {
    return handleRouteError(err);
  }
}
