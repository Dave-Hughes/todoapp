# SegmentedControl

A radiogroup presented as a row of pill-shaped options with an animated sliding indicator on the active option. The shared primitive behind FilterToggle, the flexible deadline toggle, and any future binary or multi-option toggle.

## What it's for

- Any small set of mutually exclusive options (2–5)
- Filter bars, mode toggles, settings preferences, form field toggles
- Both toolbar-level (default size) and inline/form-level (compact size) contexts

## What it's not for

- Large option sets (use a listbox or select)
- Non-mutually-exclusive options (use checkboxes)
- Navigation tabs (use a tab bar)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `options` | `{ value: T; label: string }[]` | — | The available options. Minimum 2. |
| `value` | `T extends string` | — | Currently selected value. |
| `onChange` | `(value: T) => void` | — | Called when the user selects an option. |
| `ariaLabel` | `string` | — | Accessible label for the radiogroup. |
| `disabled` | `boolean` | `false` | Disables all options. |
| `size` | `"default" \| "compact"` | `"default"` | Visual size variant. Compact uses smaller text and tighter padding. |
| `className` | `string` | `""` | Additional classes for the outer container. |

## States

| State | Behavior |
|---|---|
| Default | Canvas bg, border, active option shows elevated surface + shadow. |
| Hover (inactive option) | Text darkens to secondary. |
| Focus-visible | 2px accent outline on focused option. |
| Active change | Framer Motion `layoutId` animates the sliding background indicator. |
| Disabled | 50% opacity, no pointer events. |
| Reduced motion | Indicator snaps instantly (duration: 0). |

## Accessibility

- `role="radiogroup"` on container with `aria-label`.
- `role="radio"` + `aria-checked` on each option.
- Roving tabindex: only the active option is in the tab order.
- Arrow Left/Right and Arrow Up/Down cycle through options.
- `useId()` generates unique `layoutId` per instance so multiple SegmentedControls on the same page animate independently.

## Usage

```tsx
// Default size (toolbar)
<SegmentedControl
  options={[
    { value: "mine", label: "Mine" },
    { value: "theirs", label: "Theirs" },
    { value: "all", label: "All" },
  ]}
  value={filter}
  onChange={setFilter}
  ariaLabel="Filter tasks by assignee"
/>

// Compact size (inline form)
<SegmentedControl
  options={[
    { value: "hard", label: "Hard deadline" },
    { value: "flexible", label: "When you can" },
  ]}
  value={deadlineType}
  onChange={setDeadlineType}
  ariaLabel="Deadline type"
  size="compact"
/>
```

## Do / Don't

- **Do** use `size="compact"` when the control sits inside a form row alongside other fields.
- **Do** provide a meaningful `ariaLabel` that describes the choice being made.
- **Don't** use for more than 5 options — the horizontal space becomes unwieldy.
- **Don't** mix sizes within the same visual group.

## Changelog

| Date | Change |
|---|---|
| 2026-04-14 | Initial extraction from FilterToggle. Two size variants (default, compact). Animated layoutId indicator. Arrow-key navigation with roving tabindex. Generic `<T extends string>` type parameter. |
