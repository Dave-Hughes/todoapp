import { and, desc, eq, isNull } from "drizzle-orm";
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

export async function listNotificationsForUser(
  userId: string,
  limit: number,
): Promise<Notification[]> {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.recipientUserId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  const rows = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.recipientUserId, userId),
        isNull(notifications.readAt),
      ),
    )
    .returning({ id: notifications.id });
  return rows.length;
}

export async function markNotificationRead(
  id: string,
  userId: string,
): Promise<boolean> {
  const rows = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.id, id),
        eq(notifications.recipientUserId, userId),
      ),
    )
    .returning({ id: notifications.id });
  return rows.length === 1;
}
