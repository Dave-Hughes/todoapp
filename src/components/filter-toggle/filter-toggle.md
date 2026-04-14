# FilterToggle

## Purpose

A thin wrapper around `SegmentedControl` that provides the Mine / Theirs / All task filter with the correct options and ARIA label. Delegates all rendering, animation, and keyboard navigation to the shared `SegmentedControl` primitive.

## Non-purpose

- Not a general-purpose segmented control — use `SegmentedControl` directly for other toggle needs.
- Does not manage its own state — fully controlled via `value` and `onChange`.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | `FilterValue` | required | Currently selected filter. One of `"mine"`, `"theirs"`, `"all"`. |
| `onChange` | `(value: FilterValue) => void` | required | Called with the new value when the user selects a different option. |
| `partnerName` | `string \| undefined` | — | Reserved for future use (partner name substitution in label). |

### Exported type

```ts
export type FilterValue = "mine" | "theirs" | "all";
```

## States, Accessibility, Keyboard

All inherited from `SegmentedControl`. See `segmented-control.md`.

## Usage

```tsx
const [filter, setFilter] = useState<FilterValue>("all");

<FilterToggle value={filter} onChange={setFilter} />
```

## Do / Don't

- **Do** keep `FilterToggle` controlled. Hoist state to the page component.
- **Don't** use `FilterToggle` for non-assignee filters — use `SegmentedControl` directly.

## Changelog

| Date | Change |
|---|---|
| 2026-04-12 | Initial implementation. Three-option pill with shared-layout animation, partner-name substitution, reduced-motion support. |
| 2026-04-14 | Refactored to thin wrapper around `SegmentedControl`. Animation, keyboard nav, and rendering now owned by the shared primitive. `layoutId` collision risk eliminated (SegmentedControl uses `useId()`). |
