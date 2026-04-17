# ReengageBanner

Solo-only banner on `/today` shown when there's a pending invite older than 7 days and the current invite's dismissed-flag is absent. Flag key = `reengage-dismissed-<inviteId>` so cancelling + re-creating an invite resets the prompt for the new ask.

## Props
| Prop | Type | Notes |
|---|---|---|
| `inviteId` | `string` | Current active invite id — used for the dismiss flag key |
| `hasEmail` | `boolean` | Controls button label + action (resend vs copy-link) |
| `inviteUrl` | `string` | Full URL to copy when hasEmail=false |
| `onResent` | `() => void` | Optional hook for parent to react |

## Behaviour
- Reads dismissed state via `useIsoLayoutEffect` (same SSR-safe pattern as `InviteBanner`) — starts `hidden=true` so SSR and first client render agree, then corrects from localStorage before paint.
- Dismiss flag is per-invite-id so a cancelled + re-created invite shows a fresh banner.
- `hasEmail=true` → calls `POST /api/invites/[id]/resend` then dismisses.
- `hasEmail=false` → copies `inviteUrl` to clipboard then dismisses.
- Hover background uses `--color-surface` (not `--color-surface-hover`, which doesn't exist in the token contract).
