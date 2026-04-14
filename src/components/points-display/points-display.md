# Points Display

Shows both partners' earned points as a recognition surface — the place where invisible labor becomes visible.

## Variants

### SidebarPoints
Vertical layout for the desktop sidebar. Both partners stacked, names left-aligned, totals right-aligned. Today's earned delta (`+N`) appears on hover of the points area.

### MobilePoints
Compact inline layout for the mobile header. User points in accent color, partner points in tertiary, separated by a middot. Today deltas shown inline when non-zero.

## Props

### SidebarPoints
| Prop | Type | Default | Description |
|---|---|---|---|
| userName | string | required | Current user's display name |
| partnerName | string | undefined | Partner's display name (hidden if absent) |
| userPoints | number | required | Current user's total points |
| partnerPoints | number | undefined | Partner's total points |
| userPointsToday | number | 0 | Points the user earned today |
| partnerPointsToday | number | 0 | Points the partner earned today |

### MobilePoints
Same props as SidebarPoints.

## States

| State | Behavior |
|---|---|
| Both active today | Both deltas shown |
| One active | Delta on active partner only |
| No activity today | Totals only, no deltas |
| Solo user | Single row, no partner line |
| Points change | Animated counter (300ms, ease-out-quart) |
| Reduced motion | Instant number update, no animation |

## Animation

The `AnimatedNumber` internal component counts from the previous value to the new value over 300ms using ease-out-quart. This fires on task completion (optimistic UI). Under `prefers-reduced-motion`, the number updates instantly.

## Design decisions

- **Not a card**: No background, no border. Points breathe with the surrounding content, not in a container.
- **Not competitive**: Both partners shown at equal visual weight. No ranking or "who's ahead" treatment.
- **Today delta on hover (sidebar)**: Reduces visual noise on the ~50th daily visit. The delta is a discovery moment, not a permanent fixture.
- **Today delta always visible (mobile)**: Mobile doesn't have hover. The compact 10px size keeps it unobtrusive.
- **Success color for deltas**: `--color-success` (sage green) signals "good things happened" without using the accent color.

## Tokens used

- `--text-xs`, `--text-sm` (font sizes)
- `--color-text-secondary`, `--color-text-tertiary` (name + total hierarchy)
- `--color-accent` (user points on mobile)
- `--color-success` (today delta)
- `--space-1`, `--space-2`, `--space-3` (gaps)
- `--duration-fast` (hover transition)
