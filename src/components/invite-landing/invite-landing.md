# InviteLanding

Branded public landing page the Willing Partner sees when they click the invite link. Zero marketing, zero feature list — just the organizer's name, a warm framing line, and the two CTAs (Sign up / Sign in).

## Props

| Prop | Type | Notes |
|---|---|---|
| `organizerName` | `string` | Display name of the user who sent the invite. |
| `token` | `string` | Passed as `redirect_url=/invite/[token]/accept` on both CTAs. |

## Decision: presentational only

The parent server component owns all token validation and error handling. This component is safe to render in storybook-like contexts.
