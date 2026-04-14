import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, type Category } from "@/db/schema";
import { DEFAULT_CATEGORIES } from "@/db/seed/default-categories";

export async function listCategoriesForHousehold(
  householdId: string,
): Promise<Category[]> {
  return db
    .select()
    .from(categories)
    .where(eq(categories.householdId, householdId))
    .orderBy(asc(categories.position));
}

export async function getDefaultCategoryForHousehold(
  householdId: string,
): Promise<Category | null> {
  const [row] = await db
    .select()
    .from(categories)
    .where(
      and(eq(categories.householdId, householdId), eq(categories.isDefault, true)),
    )
    .limit(1);
  return row ?? null;
}

export async function seedCategoriesForHousehold(
  householdId: string,
): Promise<void> {
  await db.insert(categories).values(
    DEFAULT_CATEGORIES.map((c) => ({
      householdId,
      name: c.name,
      position: c.position,
      isDefault: c.isDefault,
    })),
  );
}
