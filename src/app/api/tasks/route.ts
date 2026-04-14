import { getAuthedContext } from "@/lib/auth-context";
import {
  listTasksForHousehold,
  createTask,
} from "@/lib/db/queries/tasks";
import { getDefaultCategoryForHousehold } from "@/lib/db/queries/categories";
import { logTaskEvent } from "@/lib/db/queries/task-events";
import { createTaskSchema } from "@/lib/api/validators";
import { handleRouteError, json } from "@/lib/api/responses";

export async function GET() {
  try {
    const { householdId } = await getAuthedContext();
    const rows = await listTasksForHousehold(householdId);
    return json({ tasks: rows });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: Request) {
  try {
    const { householdId, user } = await getAuthedContext();
    const body = await req.json();
    const data = createTaskSchema.parse(body);

    // If no category provided, fall back to the household's default.
    let categoryId = data.categoryId ?? null;
    if (!categoryId) {
      const defaultCat = await getDefaultCategoryForHousehold(householdId);
      categoryId = defaultCat?.id ?? null;
    }

    const task = await createTask({
      householdId,
      title: data.title,
      notes: data.notes ?? null,
      dueDate: data.dueDate,
      dueTime: data.dueTime ?? null,
      flexible: data.flexible,
      categoryId,
      assigneeUserId: data.assigneeUserId ?? null,
      createdByUserId: user.id,
      points: data.points,
      repeatRule: data.repeatRule ?? null,
    });

    await logTaskEvent({
      taskId: task.id,
      householdId,
      actorUserId: user.id,
      eventType: "created",
    });

    return json({ task }, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
