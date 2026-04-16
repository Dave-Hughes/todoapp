# InviteCompose

The Organizer's compose screen. Email input primary, "Copy link instead" secondary. Blocks self-invite client-side against Clerk's email.

## Props

| Prop | Type | Notes |
|---|---|---|
| `onSent` | `() => void` | Fires after the mutation succeeds. Parent swaps to the waiting state. |

## States

- Empty (just mounted): email field, Send button disabled-in-spirit (no client input), Copy-link link visible
- Typing: updates controlled input; enables submit on submit
- Submitting: button reads "Sending…", disabled
- Server error: inline `role="alert"` paragraph under the input
- Self-invite typed: client-side block, inline error "That's you."
- Link-only submit: skips the email field entirely

## Accessibility

- Label associated via `htmlFor`
- Errors use `role="alert"`
- Primary + secondary controls both meet touch-target-min height
