# NotificationList

Presentational list of notification rows. Pure — no data fetching, no open/close state.

## Props
| Prop | Type | Notes |
|---|---|---|
| `notifications` | `Notification[]` | Already sorted desc by createdAt. |
| `members` | `{ id; displayName }[]` | Household roster for actor-name lookup. |
| `taskTitles` | `Record<string,string>` | `taskId -> title` map, provided by caller. |
| `onRowClick` | `(n) => void` | Optional; parent handles navigation. |

Unread = `readAt === null` → accent-tinted background + dot glyph. Read → icon glyph.

Empty state renders a quiet "Nothing yet." message.

## Tokens used
- `--color-accent`, `--color-accent-subtle` (unread dot + background tint)
- `--color-surface-dim` (hover background; token for between-canvas and surface)
- `--color-border-subtle` (row divider)
- `--color-text-primary`, `--color-text-tertiary` (typography)
- `--space-*`, `--text-sm`, `--text-xs`, `--leading-tight` (spacing + typography)

## Note on hover token
The spec referenced `--color-surface-hover` which does not exist in `tokens.css`. The closest
existing token is `--color-surface-dim` (described as "subtle hover/highlight, between canvas
and surface") — used here instead.

## Changelog
- **2026-04-16** — Created. Presentational notification row list for the invite UX follow-ups plan.
- **2026-04-16** (code review) — Fixed token reference: `--leading-snug` does not exist in `tokens.css`; replaced with `--leading-tight` (1.2 line height, semantic match for two-line text). Added `role="list"` and `aria-label="Notifications"` to `<ul>` for accessibility.
