# CategoryPicker

Listbox for selecting a task category with colored dot indicators. Shows "File it where?" header.

## What it's for

- Categorizing a task into one of the v1 categories
- Used inside Popover on both breakpoints

## What it's not for

- Creating new categories (v2+)
- Multi-category tagging

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | `CategoryValue` | — | Currently selected category |
| `onChange` | `(value: CategoryValue) => void` | — | Called when the user picks |

## Categories (v1)

| Category | Color slot |
|---|---|
| Uncategorized | neutral |
| Errands | slot 1 (terracotta) |
| Health | slot 2 (sage) |
| Home | slot 3 (honey) |
| Bills | slot 4 (plum) |

## States

- **Default**: selected option highlighted with accent-subtle background
- **Navigating**: arrow keys change selection immediately

## Accessibility

- `role="listbox"` container with `role="option"` children
- `aria-selected` on the active option
- Arrow Up/Down, Home/End navigate; Enter/Space confirms
- Focus auto-moves to selected option on open

## Usage

```tsx
<CategoryPicker
  value="Uncategorized"
  onChange={(v) => setCategory(v)}
/>
```

## Do / Don't

- **Do** close the picker after selection (parent responsibility)
- **Do** use the category color tokens for the dots — they're semantic per-slot
- **Don't** hard-code colors — all colors come from `--color-category-N` tokens

## Changelog

- **Phase 2**: Initial implementation. Five-option listbox with colored dots, keyboard nav, theme tokens.
