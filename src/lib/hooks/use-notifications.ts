"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Notification } from "@/db/schema";
import { POLL_INTERVAL_MS } from "@/lib/constants";

async function fetchNotifications(): Promise<Notification[]> {
  const res = await fetch("/api/notifications", { cache: "no-store" });
  if (!res.ok) throw new Error(`notifications ${res.status}`);
  const { notifications } = (await res.json()) as { notifications: Notification[] };
  return notifications;
}

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    refetchInterval: POLL_INTERVAL_MS,
    staleTime: 1000,
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications/read-all", { method: "POST" });
      if (!res.ok) throw new Error(`notifications/read-all ${res.status}`);
      return res.json() as Promise<{ updated: number }>;
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["notifications"] });
      const prev = qc.getQueryData<Notification[]>(["notifications"]) ?? [];
      qc.setQueryData<Notification[]>(["notifications"], (old) =>
        (old ?? []).map((n) => (n.readAt ? n : { ...n, readAt: new Date() })),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["notifications"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}
