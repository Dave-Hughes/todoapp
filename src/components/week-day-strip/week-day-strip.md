# WeekDayStrip

Horizontal seven-day picker for the Week view. Each day is a pill showing a day name, date, and a small density indicator (task count). Today is visually anchored within the strip even when it isn't the selected day — the rest of the week reads *relative to today*, which is the whole point of a Week view.

## What it's for

- Day-level navigation inside a calendar week. Tap a day → that day's task list renders below.
- At-a-glance weekly density signal. Three dots cap at `•••+` so a heavy day stays legible.

## What it's not for

- A standalone date picker (use `DatePicker`).
- Week-over-week navigation (that lives in the page, via prev/next buttons).
- Month view's density grid (that will be its own component when Month ships).

## Props

| Prop | Type | Purpose |
|---|---|---|
| `days` | `WeekDay[]` | Array of seven days to render. Caller builds this. |
| `selectedIso` | `string` | ISO date (YYYY-MM-DD) of the currently selected day. |
| `onSelect` | `(iso: string) => void` | Called when the user picks a day. |

`WeekDay` includes `iso`, `shortName`, `dayOfMonth`, `count` (total active hard-deadline tasks), and `isToday`.

## States

- **Default** — surface background, secondary text.
- **Hover** — subtle surface-dim swap.
- **Selected** — accent background, accent-text color, small shadow.
- **Today, not selected** — accent-subtle background, accent text, plus a tiny floating "today" badge above the pill.
- **Today AND selected** — accent background wins; the badge is suppressed because the accent treatment already carries the weight.
- **Focus-visible** — 2px focus-ring against canvas offset.
- **Empty day** — density dots are invisible but reserve space so pill height doesn't jump.

## Density indicator

- `count === 0` → no dots (invisible spacer).
- `count 1–3` → that many dots.
- `count > 3` → three dots plus a `+` glyph, accent color.

Counts reflect hard-deadline tasks only. Flexible tasks roll with the user and don't create a meaningful anchor for a specific day.

## Accessibility

- `role="tablist"` on the container, `role="tab"` on each pill, `aria-selected` reflects selection.
- Selected pill is the only one with `tabIndex={0}`; the rest are `-1` so tab order is sane.
- Arrow keys (left/right) and Home/End move focus and select. Arrow keys clamp at the ends — they do not wrap (Saturday → ArrowRight stays on Saturday). Week-over-week navigation is a separate affordance, not a hidden side-effect of arrowing.
- Each pill carries a visually-hidden full-date + task-count sentence for screen readers (e.g. "Wednesday, April 15, today, 3 tasks").
- Touch targets ≥ 44px (min-height via `--touch-target-min`).
- Color contrast verified against the Cozy theme: selected (accent / accent-text) passes AA, non-selected (surface / text-secondary) passes AA.

## Usage

```tsx
<WeekDayStrip
  days={weekDays}
  selectedIso={selectedIso}
  onSelect={setSelectedIso}
/>
```

## Do / don't

- **Do** pass the full seven days of a calendar week. The component doesn't enforce it but assumes it for sizing.
- **Do** recompute `count` whenever tasks change — render is cheap.
- **Don't** use it for arbitrary date ranges (three days, fourteen days). Build a new component if that surface ever ships.
- **Don't** render more than one pill as `isToday: true` — it's meant as an anchor, not a label.

## Changelog

- **2026-04-15** — Initial version. Shipped with the Week view (Phase 5).
- **2026-04-15** — Doc fix: clarified that arrow keys clamp at Sun/Sat ends (doc previously said "wrap," but code and intended UX both clamp). No code change.
