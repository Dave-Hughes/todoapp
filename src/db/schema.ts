import type { AnyPgColumn } from "drizzle-orm/pg-core";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
  jsonb,
  date,
  time,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// -------- Enums ----------------------------------------------------------

export const swipeModeEnum = pgEnum("swipe_mode", ["direct", "reveal"]);
export const inviteStatusEnum = pgEnum("invite_status", [
  "pending",
  "accepted",
  "cancelled",
]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "task_assigned",
  "task_completed_by_partner",
  "partner_joined",
]);
export const taskEventTypeEnum = pgEnum("task_event_type", [
  "created",
  "completed",
  "uncompleted",
  "reassigned",
  "postponed",
  "edited",
  "deleted",
  "restored",
  "points_earned",
  "points_lost",
]);

// -------- Households -----------------------------------------------------

export const households = pgTable("households", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// -------- Users ----------------------------------------------------------

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkUserId: text("clerk_user_id").notNull(),
    householdId: uuid("household_id").references(() => households.id, {
      onDelete: "set null",
    }),
    displayName: text("display_name").notNull(),
    timezone: text("timezone").notNull().default("America/New_York"),
    theme: text("theme").notNull().default("cozy"),
    swipeMode: swipeModeEnum("swipe_mode").notNull().default("direct"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    clerkUserIdIdx: uniqueIndex("users_clerk_user_id_idx").on(t.clerkUserId),
    householdIdIdx: index("users_household_id_idx").on(t.householdId),
  }),
);

// -------- Categories -----------------------------------------------------

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").notNull().default(0),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    householdIdx: index("categories_household_idx").on(t.householdId),
  }),
);

// -------- SeededTasks (global) ------------------------------------------

export const seededTasks = pgTable("seeded_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  defaultPoints: integer("default_points").notNull(),
  suggestedCategory: text("suggested_category"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// -------- Tasks ----------------------------------------------------------

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    notes: text("notes"),
    dueDate: date("due_date").notNull(),
    dueTime: time("due_time"),
    flexible: boolean("flexible").notNull().default(false),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    // No FK: holds SHARED_ASSIGNEE_SENTINEL before partner joins (see specs/multiplayer.md).
    assigneeUserId: uuid("assignee_user_id"),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    completedByUserId: uuid("completed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    points: integer("points").notNull().default(0),
    bountyReward: text("bounty_reward"),
    repeatRule: jsonb("repeat_rule"),
    parentTaskId: uuid("parent_task_id").references((): AnyPgColumn => tasks.id, {
      onDelete: "set null",
    }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    householdDueIdx: index("tasks_household_due_idx").on(t.householdId, t.dueDate),
    householdActiveIdx: index("tasks_household_active_idx")
      .on(t.householdId, t.dueDate)
      .where(sql`${t.deletedAt} IS NULL`),
    parentIdx: index("tasks_parent_idx").on(t.parentTaskId),
  }),
);

// -------- TaskEvents -----------------------------------------------------

export const taskEvents = pgTable(
  "task_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    eventType: taskEventTypeEnum("event_type").notNull(),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    taskIdx: index("task_events_task_idx").on(t.taskId),
    householdIdx: index("task_events_household_idx").on(t.householdId, t.createdAt),
  }),
);

// -------- Invites --------------------------------------------------------

export const invites = pgTable("invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  invitedByUserId: uuid("invited_by_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  email: text("email"),
  token: text("token").notNull().unique(),
  status: inviteStatusEnum("status").notNull().default("pending"),
  acceptedByUserId: uuid("accepted_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// -------- Notifications --------------------------------------------------

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    recipientUserId: uuid("recipient_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    taskId: uuid("task_id").references(() => tasks.id, { onDelete: "cascade" }),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    recipientIdx: index("notifications_recipient_idx").on(t.recipientUserId, t.readAt),
  }),
);

// -------- Relations ------------------------------------------------------

export const householdRelations = relations(households, ({ many }) => ({
  users: many(users),
  categories: many(categories),
  tasks: many(tasks),
}));

export const userRelations = relations(users, ({ one, many }) => ({
  household: one(households, {
    fields: [users.householdId],
    references: [households.id],
  }),
  createdTasks: many(tasks, { relationName: "createdBy" }),
}));

export const categoryRelations = relations(categories, ({ one, many }) => ({
  household: one(households, {
    fields: [categories.householdId],
    references: [households.id],
  }),
  tasks: many(tasks),
}));

export const taskRelations = relations(tasks, ({ one, many }) => ({
  household: one(households, {
    fields: [tasks.householdId],
    references: [households.id],
  }),
  category: one(categories, {
    fields: [tasks.categoryId],
    references: [categories.id],
  }),
  createdBy: one(users, {
    fields: [tasks.createdByUserId],
    references: [users.id],
    relationName: "createdBy",
  }),
  events: many(taskEvents),
}));

// -------- Inferred types -------------------------------------------------

export type Household = typeof households.$inferSelect;
export type User = typeof users.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type TaskEvent = typeof taskEvents.$inferSelect;
export type SeededTask = typeof seededTasks.$inferSelect;
export type Invite = typeof invites.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
