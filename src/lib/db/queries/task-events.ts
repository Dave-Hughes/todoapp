import { db } from "@/db";
import { taskEvents } from "@/db/schema";

type EventType =
  | "created"
  | "completed"
  | "uncompleted"
  | "reassigned"
  | "postponed"
  | "edited"
  | "deleted"
  | "restored"
  | "points_earned"
  | "points_lost";

export async function logTaskEvent(args: {
  taskId: string;
  householdId: string;
  actorUserId: string;
  eventType: EventType;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await db.insert(taskEvents).values({
    taskId: args.taskId,
    householdId: args.householdId,
    actorUserId: args.actorUserId,
    eventType: args.eventType,
    metadata: args.metadata ?? null,
  });
}
