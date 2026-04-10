# Principles

These are the rules every design, product, and engineering decision gets checked against. When in doubt, re-read these. When a proposed change violates one, it needs an explicit, written justification.

## Product principles

**1. Invisible labor, visible.** Every feature must either help a partner get what's in their head into a shared space, help the other partner see and act on it, or create a moment of mutual recognition. If a feature doesn't clearly serve one of these three, cut it or defer it.

**2. Recognition over coordination.** Coordination is table stakes — every to-do app does it. Recognition is the differentiator. When there's a trade-off between a "more efficient" flow and a "more recognizing" flow, pick the one that makes the other partner feel seen.

**3. Symmetric roles, asymmetric moments.** No primary account, no secondary account. Both partners have identical capabilities and identical standing in the product. The asymmetry between "the one holding the list" and "the one receiving tasks" is per-moment and fluid, not per-account.

**4. Warm, never scolding.** The app is on your side *and* on your partner's side. It never shames missed tasks, never takes sides in a disagreement, never frames either partner as the problem. Assume good faith. Missed tasks are human, not failures.

**5. Narrow surface, deep craft.** Ship fewer features at higher quality. Three features that feel like Linear beat ten that feel like a hackathon project. The v1 surface is small on purpose.

**6. Purpose-built for two.** Every surface — landing page, onboarding, empty states, settings, billing — feels like it was designed with a couple in mind, not retrofitted for one. This is the entire wedge. Never break it.

## Design principles

**7. Themed from day one.** The product is themeable as a first-class concept. Every component uses theme tokens (color, typography, spacing, motion, sound) instead of hard-coded values. v1 ships with one default theme but the system supports many.

**8. Tone is theme-agnostic.** The app's voice (warm, playful, cheeky) does not change between themes. Cyberpunk wears a different costume but has the same character underneath. Voice is *what the app says*; theme is *what it looks and sounds like when it says it*.

**9. Today is the hero view.** Most users open the app to answer "what do I need to do right now." The Today view gets the most design attention. Week and Month are planning surfaces and can be cleaner and less opinionated.

**10. Accessibility is not optional.** WCAG 2.1 AA from day one. Keyboard navigation, screen-reader labels, sufficient color contrast, touch targets ≥ 44px. Every new component gets an accessibility pass before it merges.

**11. Real states, not TODOs.** Every screen has real empty, loading, error, and offline states before the feature is considered done. No placeholder empty states in production.

**12. Motion has meaning.** Animation is used to reinforce cause and effect, not to decorate. Every animation has a reason. Durations and easing curves are tuned by hand, not left at framework defaults.

## Engineering principles

**13. CLI-first development.** Every tool in the stack must be accessible via CLI / API / MCP before building begins. Claude does not guess about external systems; Claude verifies via CLI access first. If CLI access is not in place for a given system, that is a blocker — pause and wire it up before proceeding.

**14. Never suggest solutions without full CLI access to the relevant system.** Copied verbatim from the build-flow guidance. If the system is a database, confirm you can query it. If it's an auth provider, confirm you can list users. If it's a deploy target, confirm you can trigger deploys. *Then* make recommendations.

**15. Prepared for post-v1, not built for post-v1.** The data model, IA, and component system assume Vault, Bounties, Themes beyond default, SMS, and digests are coming. v1 does not build them. v1 does not preclude them. If a shortcut in v1 would require a refactor to add them later, don't take the shortcut.

**16. Test the unhappy paths.** Playwright e2e tests cover happy paths *and* edge cases. Don't just focus on the happy paths — those are easy. Write tests for every plausible edge case: stale sessions, partial network failures, concurrent edits by both partners, invited-partner who never accepts, repeated tasks across DST boundaries, reassignment mid-completion.

**17. Update markdown after major changes.** After every significant milestone, feature completion, or error resolution, update the foundation docs and CLAUDE.md so future sessions inherit the current state. A major change without a doc update is incomplete.

**18. One source of truth per concept.** Each concept (task, partner, household, theme, etc.) has exactly one authoritative definition and one canonical location. Avoid duplicating state, duplicating types, or duplicating copy across files.

**18a. The components are the design system. The docs describe what the components already do.** Not the other way around. Component code is the source of truth; component docs are a view of it. Docs live *next to code* (e.g., `src/components/button/button.tsx` and `src/components/button/button.md` in the same folder) so drift is nearly impossible. When a component changes, its doc updates in the *same commit*. Drift between a component and its doc is a bug, not a doc-debt item. The `design-system/README.md` file holds the rules; the per-component docs live with the code they describe.

## Process principles

**19. Spec just-in-time.** Feature specs are written in detail immediately before the feature is built, not months in advance. Stub specs exist now as skeletons; real specs get filled out when our understanding of the feature is highest.

**20. Interview before building.** Every new feature starts with a short interview round (even a self-interview) to surface assumptions before committing to a direction. Skipping the interview is how scope creep begins.

**21. Foundation docs are living.** This doc, `vision.md`, `personas.md`, `scope-v1.md`, `voice-and-tone.md`, `themes.md`, and `open-questions.md` are not write-once. When reality contradicts them, update them. The most dangerous state is foundation docs that everyone has stopped trusting.
