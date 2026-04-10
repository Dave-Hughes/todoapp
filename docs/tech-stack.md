# Tech Stack

Decided during the tech stack interview on 2026-04-10. This document resolves [open-questions.md](open-questions.md) #2.

## The stack at a glance

| Slot | Choice | Role |
|---|---|---|
| Framework | Next.js (App Router) | Full-stack React framework, server and client |
| Styling | Tailwind CSS v4 | Utility-first CSS, theme token integration |
| Database | Neon (Postgres) | Serverless Postgres, us-east-1 |
| ORM | Drizzle | TypeScript-native schema, queries, and migrations |
| Auth | Clerk | Managed auth, Organizations for household scoping |
| Data fetching | TanStack Query | Client-side caching, polling, background refetch |
| Animation | Framer Motion | Layout animations, gestures, spring physics |
| Hosting | Vercel | Serverless deploy, edge network, preview deploys |
| DNS / Registrar | Cloudflare | DNS management and domain registration only |
| Transactional email | Resend | Partner invites, future notification emails |
| Payments | Stripe | Not integrated in v1; account wired early, data model ready |
| E2E testing | Playwright | Full browser flow tests |
| Unit / integration testing | Vitest + React Testing Library | Component and logic tests |
| Design tooling | Impeccable (pbakaus/impeccable) | Build-time AI design quality skills |
| Package manager | npm | Standard, no migration overhead |

## Decisions and rationale

Each decision below was made with three lenses: does it serve a real commercial product at scale, does it showcase craft, and does it keep the build moving?

### Auth: Clerk

Clerk handles session management, email verification, partner invites, and account linking out of the box. Its Organizations feature maps onto the household concept and provides multi-tenant data scoping without building it from scratch. The v1 partner onboarding flow (Organizer vs. Willing Partner) benefits from Clerk's hosted UI components, which are customizable enough for theming and polished enough to ship.

The trade-off is vendor lock-in. If a future native iOS app outgrows Clerk's mobile SDK, migration to a self-hosted solution is possible but non-trivial. At this stage, Clerk lets us focus energy on the product's differentiating features rather than auth plumbing. The free tier (10k MAU) covers v1 validation and well beyond.

**The "why Clerk" story:** Auth isn't the product's differentiator — the couple-specific experience is. Clerk is the best tool for the job, letting us ship faster without compromising security or UX.

### ORM: Drizzle

Drizzle is TypeScript-native, serverless-friendly, and transparent. The schema, types, and query builder share one language and one type system, which serves principle #18 (one source of truth per concept). No separate query engine process means no cold-start penalty on Vercel.

The trade-off vs. Prisma is ecosystem maturity — fewer guides, smaller community. For the scope of this data model (households, users, tasks, categories), that's a non-issue. Drizzle generates predictable, inspectable SQL, which is a better showcase story than a heavy abstraction layer.

### Testing: Vitest + React Testing Library + Playwright

Three layers of coverage. Vitest for unit and integration tests (pure functions, API route handlers, database queries against a test Neon instance). React Testing Library for component-level tests, asserting on what the user sees rather than implementation details. Playwright for end-to-end flows covering both happy paths and edge cases (principle #16).

### Deploy region: us-east-1

Product is US-focused. Neon database and Vercel serverless functions co-located in us-east-1 for minimal latency. Vercel's edge network handles static assets globally. If international expansion matters later, Neon read replicas can be added without rearchitecting.

### Domain strategy: single domain

Marketing site and app live at the same domain (e.g., `yourapp.com` for landing page, `/app` for authenticated experience). One Next.js project, one Vercel deploy pipeline, one SSL cert. Clerk auth stays on the same origin with no cross-domain cookie complexity. The actual domain is TBD pending the naming session (open question #1).

### Cloudflare: DNS and registrar only

Domain purchased through Cloudflare (cheap, no markup). DNS managed there, pointed at Vercel. Vercel handles edge caching, DDoS protection, and image optimization. Doubling up Cloudflare as a CDN in front of Vercel adds debugging complexity (two cache layers) for no benefit at this scale. If we ever need Cloudflare Workers, R2 storage, or heavier edge logic, Cloudflare is already in the loop and easy to expand.

### Animation: Framer Motion

The principles say motion has meaning and durations are tuned by hand (principle #12). Framer Motion handles layout animations (task reordering, completion), gesture support, exit animations (AnimatePresence), and spring physics. Motion tokens (duration, easing) feed directly into Framer Motion's transition props, which integrates cleanly with the theme system.

Web-only, but a future iOS app would have its own animation system regardless. The motion *tokens* carry over; the implementation wouldn't.

### Data fetching: TanStack Query with polling

TanStack Query handles client-side data caching, background refetching, and polling. v1 uses simple polling (5-second interval) for partner sync — when one partner completes a task, the other sees it within seconds. This is sufficient for a couples to-do app and keeps v1 simple.

**Post-v1 upgrade path:** The polling interval can be swapped to server-sent events or WebSocket push without touching the component layer. TanStack Query's abstraction makes this a backend-only change. Real-time sync animations ("Krista just completed this") are explicitly deferred per the multiplayer spec.

### Transactional email: Resend

Developer-friendly email API with a React email SDK — email templates can be built in JSX using the same design tokens as the app. v1 use is primarily partner invite emails and any transactional emails Clerk doesn't handle natively. Generous free tier for low volume.

### Payments: Stripe

Not integrated in v1. Billing model is still open (open question #13). A Stripe account should be wired up early so the integration path is clear, and the data model should not preclude per-household subscriptions, freemium, or any other model. Stripe is the default for a reason and nothing else is worth considering at this stage.

### Design tooling: Impeccable

Impeccable (pbakaus/impeccable) is a build-time design skills toolkit that teaches AI assistants better design judgment. Install via `npx skills add pbakaus/impeccable` and run `/impeccable teach` once before building any UI. Covers typography, color, layout, and anti-pattern detection. Complements the runtime stack; does not replace any runtime dependency.

### Package manager: npm

Standard choice. No migration overhead, works with Vercel and every dependency in the stack.

## What this stack does not include (and why)

These were considered and explicitly excluded.

**Supabase Auth** — strong if using Supabase as the database, but awkward alongside Neon + Drizzle. Would pull in a second Postgres instance just for auth.

**Auth.js (NextAuth)** — full control over auth UI, but more surface area to build and maintain for something that isn't differentiating. The v1 partner onboarding flow has real auth complexity (Organizer vs. Willing Partner, invite links, household linking) that Clerk handles out of the box.

**Prisma** — mature ecosystem, but adds cold-start latency on serverless via its Rust query engine. Heavier abstraction than needed for this data model.

**Jest** — the incumbent, but slower and more configuration friction with TypeScript/ESM. Vitest was built to replace it.

**Separate subdomains for marketing and app** — adds infrastructure complexity (two deploys, cross-subdomain cookies) for no benefit at this stage.

**Real-time push in v1** — SSE or WebSocket sync is an upgrade path, not a v1 requirement. Polling is sufficient and dramatically simpler.

## Post-v1 considerations

Decisions that were made with future phases in mind.

**iOS app:** Clerk has an iOS SDK. The API layer (Next.js API routes + Drizzle + Neon) is client-agnostic — a native iOS app would hit the same endpoints. Framer Motion is web-only; iOS would use its own animation system but share motion tokens. TanStack Query has a React Native variant.

**Real-time sync:** TanStack Query's abstraction allows swapping polling for SSE or WebSocket push without changing components. The data model and API don't need to change.

**International expansion:** Neon supports read replicas in additional regions. Vercel's edge network already serves static assets globally. SMS outside the US is a separate problem (noted as a constraint for the US-focused v1).

**Billing:** Stripe account wired early. Data model supports per-household subscriptions. The billing UX is a post-v1 feature.
