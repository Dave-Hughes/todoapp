# InviteWaiting

Shown once an invite is pending. Copy-link field with a Copy button, plus a "Cancel and start over" action.

## Props

| Prop | Type | Notes |
|---|---|---|
| `invite` | `Invite` | The active invite row (status = 'pending'). |
| `onCancelled` | `() => void` | Fires after cancellation succeeds. Parent returns to compose. |

## Behavior notes

- Resend of an emailed invite is deliberately NOT surfaced in v1. Cancel + re-create achieves the same result with fewer surfaces.
- Copy button toggles text to "Copied" for ~1.8s on success.
- URL built from `window.location.origin` on the client.
