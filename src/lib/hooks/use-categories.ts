"use client";

import { useQuery } from "@tanstack/react-query";
import type { Category } from "@/db/schema";

async function fetchCategories(): Promise<Category[]> {
  const res = await fetch("/api/categories", { cache: "no-store" });
  if (!res.ok) throw new Error(`categories ${res.status}`);
  const { categories } = (await res.json()) as { categories: Category[] };
  return categories;
}

export function useCategories() {
  return useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
}
