# TaskListSkeleton

Pulsing placeholder shown while task data loads. Mimics the visual shape of a TaskListItem row so there's no layout shift when real data replaces it.

## When to use

Anywhere a list of tasks renders from async data. Show this while `isLoading` is true, before deciding between the empty state and the populated list.

## API

```ts
interface TaskListSkeletonProps {
  /** Number of placeholder rows (default 3). */
  count?: number;
}
```

## Usage

```tsx
{isLoading ? (
  <TaskListSkeleton />
) : isEmpty ? (
  <EmptyState variant="no-tasks" onAddTask={handleAdd} />
) : (
  <TaskList tasks={tasks} />
)}
```

## Design notes

- Each row is a card matching the real TaskListItem surface: `rounded-lg`, `shadow-sm`, `bg-surface`.
- A round circle stands in for the checkbox; two bars stand in for title + metadata.
- Varying widths (per row index) prevent the uniform-grid AI-slop look.
- Uses `animate-pulse` with the `--color-skeleton` token — soft, on-brand, not grey-out.
- `aria-busy="true"` + `aria-label="Loading tasks"` announces loading state to assistive tech.

## Why it exists

Three views (`/today`, `/week`, `/month`) had identical inline skeleton markup. Extraction lifts it into one component so future loading-state tweaks happen in one place.

## Changelog

- **2026-04-15** — Created. Extracted from duplicated inline markup in Today and Week views.
