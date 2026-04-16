"use client";

import { useQuery } from "@tanstack/react-query";
import type { User } from "@/db/schema";

export interface PointsTotals {
  lifetime: number;
  today: number;
}

export type MeResponse = {
  me: User;
  partner: User | null;
  mePoints: PointsTotals;
  partnerPoints: PointsTotals | null;
};

async function fetchMe(): Promise<MeResponse> {
  const res = await fetch("/api/me", { cache: "no-store" });
  if (!res.ok) throw new Error(`me ${res.status}`);
  return res.json();
}

export function useMe() {
  return useQuery({ queryKey: ["me"], queryFn: fetchMe, staleTime: 60_000 });
}
