import type { Task } from "@/db/schema";
import { createNotification } from "@/lib/db/queries/notifications";
import { householdIsPaired } from "@/lib/db/queries/households";
import { SHARED_ASSIGNEE_SENTINEL } from "@/lib/constants";

export async function dispatchTaskAssigned(args: {
  task: Task;
  actorUserId: string;
}): Promise<void> {
  const { task, actorUserId } = args;
  if (!task.assigneeUserId) return;
  if (task.assigneeUserId === SHARED_ASSIGNEE_SENTINEL) return;
  if (task.assigneeUserId === actorUserId) return;
  if (!(await householdIsPaired(task.householdId))) return;

  await createNotification({
    householdId: task.householdId,
    recipientUserId: task.assigneeUserId,
    actorUserId,
    type: "task_assigned",
    taskId: task.id,
  });
}

export async function dispatchTaskCompletedByPartner(args: {
  task: Task;
  completerUserId: string;
}): Promise<void> {
  const { task, completerUserId } = args;
  if (task.createdByUserId === completerUserId) return;
  if (!(await householdIsPaired(task.householdId))) return;

  await createNotification({
    householdId: task.householdId,
    recipientUserId: task.createdByUserId,
    actorUserId: completerUserId,
    type: "task_completed_by_partner",
    taskId: task.id,
  });
}
