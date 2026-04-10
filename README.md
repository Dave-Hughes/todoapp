# ToDoApp

> **Note:** "ToDoApp" is a placeholder name. The real name is TBD and will be decided in a dedicated naming session. When renaming, find-and-replace "ToDoApp" throughout this repo.

A to-do app purpose-built for couples. Not a general-purpose productivity tool that happens to support sharing — a product designed from the ground up around the emotional and practical dynamics of two people running a life together.

## Start here

**Any new session working on this project should read [CLAUDE.md](CLAUDE.md) first.** It's the single source of truth for project orientation — the stack, the build flow, the conventions, and what to read next. Agent role definitions live in [AGENTS.md](AGENTS.md).

## Foundation docs

Read these in order before touching code. They define the why, the who, the what, and the how.

1. [docs/vision.md](docs/vision.md) — Why this exists, the origin story, the positioning wedge, the core tenets.
2. [docs/personas.md](docs/personas.md) — The Organizer, The Willing Partner, and the symmetric-roles constraint.
3. [docs/scope-v1.md](docs/scope-v1.md) — What ships in v1, what doesn't, and what v1 is *prepared for*.
4. [docs/principles.md](docs/principles.md) — Design and engineering tenets used to check every future decision.
5. [docs/voice-and-tone.md](docs/voice-and-tone.md) — The app's character. Theme-agnostic.
6. [docs/themes.md](docs/themes.md) — The theme system as a first-class product concept.
7. [docs/open-questions.md](docs/open-questions.md) — Unresolved questions that need answers before or during the build.
8. [docs/tech-stack.md](docs/tech-stack.md) — Every stack choice and the rationale behind it.

## Design system

- [design-system/README.md](design-system/README.md) — the rules of the design system. Every UI-touching session must read this first. The *contents* of the design system (tokens, components, patterns) live in code, not in this folder. Component docs live next to component code in `src/components/`.

## Feature specs

Stub specs live in [specs/](specs/). They start as skeletons and get filled out just-in-time, one at a time, immediately before the feature is built. This avoids designing the whole app in detail before any of it is built.

- [specs/tasks.md](specs/tasks.md)
- [specs/views.md](specs/views.md)
- [specs/multiplayer.md](specs/multiplayer.md)

## Status

Foundation + tech stack complete. No application code yet. Next step: design system bootstrap (install Impeccable, then run `design:design-system`). See `CLAUDE.md` for the full build flow.
