import { db } from "@/db";
import {
  notifications,
  type Notification,
  notificationTypeEnum,
} from "@/db/schema";

type NotificationType = (typeof notificationTypeEnum.enumValues)[number];

export async function createNotification(args: {
  householdId: string;
  recipientUserId: string;
  actorUserId: string;
  type: NotificationType;
  taskId?: string | null;
}): Promise<Notification> {
  const [row] = await db
    .insert(notifications)
    .values({ ...args, taskId: args.taskId ?? null })
    .returning();
  return row;
}
