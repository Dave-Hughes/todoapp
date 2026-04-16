"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Invite } from "@/db/schema";
import { POLL_INTERVAL_MS } from "@/lib/constants";

type CurrentInviteResponse = { invite: Invite | null };

async function fetchCurrentInvite(): Promise<CurrentInviteResponse> {
  const res = await fetch("/api/invites", { cache: "no-store" });
  if (!res.ok) throw new Error(`invites ${res.status}`);
  return res.json();
}

export function useCurrentInvite() {
  return useQuery({
    queryKey: ["invite"],
    queryFn: fetchCurrentInvite,
    refetchInterval: POLL_INTERVAL_MS,
    staleTime: 0,
  });
}

export function useCreateInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (email: string | null): Promise<Invite> => {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `create invite ${res.status}`);
      }
      const { invite } = await res.json();
      return invite;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["invite"] });
    },
  });
}

export function useCancelInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (inviteId: string): Promise<void> => {
      const res = await fetch(`/api/invites/${inviteId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `cancel invite ${res.status}`);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["invite"] });
    },
  });
}
