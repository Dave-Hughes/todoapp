/**
 * Sentinel UUID used as `assignee_user_id` before the partner has joined
 * the household. On partner accept, all rows with this value are swapped
 * to the real partner user ID. See specs/multiplayer.md.
 */
export const SHARED_ASSIGNEE_SENTINEL = "00000000-0000-0000-0000-000000000000";

/** Polling interval for cross-partner sync. */
export const POLL_INTERVAL_MS = 5_000;
