# Toast

## Purpose

A non-blocking status notification that appears briefly at the bottom of the screen. Used to confirm actions (e.g., "Task postponed"), surface quick feedback, and provide an undo/action affordance. Auto-dismisses after a configurable duration (default 6 seconds). Fully controlled — visibility and dismissal are managed by the caller. Respects `prefers-reduced-motion`.

## Non-purpose

- Not for errors that require user action — use a modal dialog or inline error for blocking issues.
- Not for persistent notifications — it auto-dismisses and is not a notification center.
- Not for multi-line or richly formatted content — single sentence only.
- Not a replacement for `aria-live` regions elsewhere in the page. This component itself is `role="status"` with `aria-live="polite"`.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `message` | `string` | required | The notification text. Keep to one short sentence. |
| `action` | `{ label: string; onClick: () => void } \| undefined` | — | Optional action button (e.g., "Undo"). Renders inline in the toast. |
| `isVisible` | `boolean` | required | Controls whether the toast is shown. |
| `onDismiss` | `() => void` | required | Called after `duration` ms, or immediately if you want to dismiss programmatically. |
| `duration` | `number` | `6000` | Auto-dismiss delay in milliseconds. |

## States

| State | Behavior |
|---|---|
| Hidden | Not rendered in the DOM (`AnimatePresence` unmounts it). |
| Entering | Fades in and slides up (`y: 16 → 0`) over 0.3s. |
| Visible | Dark surface (`--color-text-primary` background, inverse text). Timer counting down. |
| With action | Action button renders inline right-aligned, semibold, accent-subtle text. |
| Exiting | Slides down and fades out. |
| Auto-dismiss | `onDismiss` called after `duration` ms. Timer resets if `isVisible` changes. |
| Reduced motion | Fade only (no y-translate). `duration: 0`. |

## Positioning

- Mobile: full-width, above the tab bar — `bottom: calc(--tab-bar-height + --space-4)`, inset `--space-4` from edges.
- Desktop: bottom-right corner — `bottom: --space-6`, `right: --space-6`, `max-w-sm`.

## Accessibility

- `role="status"` and `aria-live="polite"` announce the message to screen readers when the toast appears, without interrupting ongoing speech.
- The action button meets `--touch-target-min` via `min-h-[var(--touch-target-min)]`.
- The 6-second default duration meets WCAG 2.2 SC 2.2.1 (Timing Adjustable) for non-critical notifications. If users need to act on the action (e.g., Undo), ensure 6 seconds is sufficient given the action's complexity.
- The toast is not the only means to undo an action — ensure the undo path is also accessible via the task's edit sheet or another persistent affordance.

## Usage examples

```tsx
const [toastVisible, setToastVisible] = useState(false);

function handlePostpone(taskId: string) {
  postponeTask(taskId);
  setToastVisible(true);
}

<Toast
  message="Task postponed to tomorrow."
  action={{ label: "Undo", onClick: () => { undoPostpone(); setToastVisible(false); } }}
  isVisible={toastVisible}
  onDismiss={() => setToastVisible(false)}
/>
```

```tsx
// Simple confirmation, no action
<Toast
  message="All done for today!"
  isVisible={showConfirmation}
  onDismiss={() => setShowConfirmation(false)}
  duration={4000}
/>
```

## Do / Don't

**Do** keep `message` to one sentence. The toast has no title, no icon, and minimal space.

**Don't** show multiple toasts simultaneously. The component is positioned fixed and stacks visually if two are rendered — manage a single toast slot at the app level.

**Do** use the `action` prop for reversible actions like postpone and delete. An Undo affordance significantly reduces friction for accidental swipes.

**Don't** use `duration` shorter than 3000ms for toasts with an action button — users need time to read and react.

**Don't** rely on the toast as the sole notification channel for important errors. It auto-dismisses; a dismissed error is a missed error.

## Changelog

| Date | Change |
|---|---|
| 2026-04-12 | Initial implementation. Auto-dismiss timer, optional action button, mobile/desktop positioning, reduced-motion support. |
| 2026-04-12 | Moved `fontSize` from inline `style` to className for consistency with codebase conventions. |
