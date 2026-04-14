import { z } from "zod";

// ISO date (YYYY-MM-DD)
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");
// HH:MM (24h)
const isoTime = z.string().regex(/^\d{2}:\d{2}$/, "expected HH:MM");

const repeatRule = z
  .discriminatedUnion("type", [
    z.object({
      type: z.literal("daily"),
      interval: z.number().int().positive(),
    }),
    z.object({
      type: z.literal("weekly"),
      interval: z.number().int().positive(),
      days: z.array(z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"])),
    }),
    z.object({
      type: z.literal("monthly"),
      interval: z.number().int().positive(),
      day_of_month: z.number().int().min(1).max(31),
    }),
  ])
  .nullable();

export const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  notes: z.string().max(10_000).nullable().optional(),
  dueDate: isoDate,
  dueTime: isoTime.nullable().optional(),
  flexible: z.boolean().default(false),
  categoryId: z.string().uuid().nullable().optional(),
  assigneeUserId: z.string().uuid().nullable().optional(),
  points: z.number().int().min(0).max(1000).default(0),
  repeatRule: repeatRule.optional(),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = createTaskSchema.partial();
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
