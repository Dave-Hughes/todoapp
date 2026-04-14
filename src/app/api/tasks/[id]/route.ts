import { getAuthedContext } from "@/lib/auth-context";
import {
  updateTaskForHousehold,
  softDeleteTaskForHousehold,
  getTaskForHousehold,
} from "@/lib/db/queries/tasks";
import { logTaskEvent } from "@/lib/db/queries/task-events";
import { updateTaskSchema } from "@/lib/api/validators";
import { handleRouteError, json, error } from "@/lib/api/responses";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { householdId, user } = await getAuthedContext();
    const body = await req.json();
    const patch = updateTaskSchema.parse(body);

    const existing = await getTaskForHousehold(householdId, id);
    if (!existing) return error("not_found", 404);

    const wasReassigned =
      "assigneeUserId" in patch && patch.assigneeUserId !== existing.assigneeUserId;
    const dueDateChanged =
      "dueDate" in patch && patch.dueDate !== existing.dueDate;

    const updated = await updateTaskForHousehold(householdId, id, {
      title: patch.title,
      notes: patch.notes,
      dueDate: patch.dueDate,
      dueTime: patch.dueTime,
      flexible: patch.flexible,
      categoryId: patch.categoryId,
      assigneeUserId: patch.assigneeUserId,
      points: patch.points,
      repeatRule: patch.repeatRule,
    });
    if (!updated) return error("not_found", 404);

    await logTaskEvent({
      taskId: updated.id,
      householdId,
      actorUserId: user.id,
      eventType: wasReassigned
        ? "reassigned"
        : dueDateChanged
          ? "postponed"
          : "edited",
      metadata: wasReassigned
        ? { from_user_id: existing.assigneeUserId, to_user_id: updated.assigneeUserId }
        : dueDateChanged
          ? { old_date: existing.dueDate, new_date: updated.dueDate }
          : undefined,
    });

    return json({ task: updated });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { householdId, user } = await getAuthedContext();

    const existing = await getTaskForHousehold(householdId, id);
    if (!existing) return error("not_found", 404);

    const wasCompleted = !!existing.completedAt;
    const deleted = await softDeleteTaskForHousehold(householdId, id);
    if (!deleted) return error("not_found", 404);

    await logTaskEvent({
      taskId: deleted.id,
      householdId,
      actorUserId: user.id,
      eventType: "deleted",
    });

    // If the task was completed, losing it means losing its points.
    if (wasCompleted && existing.points > 0) {
      await logTaskEvent({
        taskId: deleted.id,
        householdId,
        actorUserId: user.id,
        eventType: "points_lost",
        metadata: { points: existing.points },
      });
    }

    return json({ task: deleted });
  } catch (err) {
    return handleRouteError(err);
  }
}
