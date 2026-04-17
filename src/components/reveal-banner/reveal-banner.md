# RevealBanner

Fires once for the invited partner after accept → `/today?welcomed=1`.
- Shows only when `?welcomed=1` AND localStorage `reveal-dismissed` != "1".
- On mount strips `?welcomed=1` via `router.replace("/today")`.
- Adaptive body copy based on `preAssignedCount`.
- CTA scrolls to + highlights `firstAssignedTaskId` (only when count > 0).

## Props
| Prop | Type | Notes |
|---|---|---|
| `organizerName` | `string` | Partner/organizer display name |
| `firstAssignedTaskId` | `string \| null` | ID of first task assigned to the invitee |
| `preAssignedCount` | `number` | How many tasks the organizer pre-assigned to the invitee |

## Tokens
- `--color-accent`, `--color-accent-subtle`, `--color-surface`, `--color-surface-dim`
- `--color-text-primary`, `--color-text-tertiary`, `--color-text-secondary`
- `--font-display`, `--weight-semibold`, `--text-lg/sm/xs`, `--leading-tight/normal`
- `--space-*`, `--radius-lg/md`, `--shadow-sm`
