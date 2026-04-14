# AssigneePicker

Compact listbox for selecting a task assignee: Me, Partner, or Shared. Shows avatar initials and a check mark for the selected option.

## What it's for

- Assigning a task to a specific person or marking it shared
- Used inside Popover on both breakpoints

## What it's not for

- Multi-select (a task has exactly one assignee or is shared)
- Household management or partner invitation

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | `"me" \| "partner" \| "shared"` | — | Currently selected assignee |
| `onChange` | `(value: AssigneeValue) => void` | — | Called when the user picks |
| `userName` | `string` | — | Current user's display name |
| `partnerName` | `string` | — | Partner's display name |

## States

- **Default**: selected option highlighted with accent background
- **Navigating**: arrow keys change selection immediately (live selection)

## Accessibility

- `role="listbox"` container with `role="option"` children
- `aria-selected` on the active option
- Arrow Up/Down, Home/End navigate; Enter/Space confirms
- Focus auto-moves to selected option on open

## Usage

```tsx
<AssigneePicker
  value="me"
  onChange={(v) => setAssignee(v)}
  userName="Dave"
  partnerName="Krista"
/>
```

## Do / Don't

- **Do** close the picker after selection (parent responsibility)
- **Don't** add options beyond the three defined — v1 is couples-only

## Changelog

- **Phase 2**: Initial implementation. Three-option listbox with avatar initials, keyboard nav, theme tokens.
