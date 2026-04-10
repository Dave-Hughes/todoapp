# Themes

Themes are a first-class product concept, not a v2 afterthought. The app is themeable from day one. v1 ships with exactly one theme — the default "warm/playful/cheeky-cozy" vibe — but the *system* underneath supports many, and every component is built against theme tokens instead of hard-coded values.

Why this matters: Dave's experience with Outlook and Teams at his day job taught him that refreshing a theme every few weeks can make a tool feel alive again. Todoist is boring because Todoist is one thing, forever. This app is going to be many things wearing the same grin.

## The core insight: tone vs. theme

**Tone** is what the app says. It lives in [voice-and-tone.md](voice-and-tone.md). It does not change across themes.

**Theme** is what the app looks and sounds like when it says it. Themes are the costume; the character underneath is constant.

The acid test: a sentence like *"Nothing left. You two are dangerous."* should work identically in the default warm theme (rounded sans-serif, pastel, little confetti animation) and in a Cyberpunk theme (neon magenta monospace, scanlines, synth stab sound effect). Same words. Same character. Different vibe. If a theme change requires a copy change, something has leaked across the boundary and needs to be fixed.

## Anatomy of a theme

Every theme must specify *all* of the following. A theme is not complete until every axis is filled in. This is what prevents themes from feeling half-baked or inconsistent.

**Palette**
- Background tones (canvas, surface, elevated surface)
- Foreground tones (primary text, secondary text, disabled text)
- Accent / brand color
- Success, warning, and destructive colors (tuned to theme but still semantically legible)
- All color pairs must meet WCAG 2.1 AA contrast requirements

**Typography**
- Heading typeface
- Body typeface
- Monospace / numeric typeface if different
- Full type scale (sizes, line heights, weights)

**Spacing and radius**
- Most themes inherit the base spacing scale, but can override radius (sharp corners vs. soft)
- Themes should rarely override spacing itself; that leaks structure into costume

**Iconography**
- Icon set (line vs. filled vs. duotone vs. illustrated)
- Icon stroke weight and corner style

**Illustration style**
- Empty-state illustrations have the strongest theme flavor
- Default theme uses warm pastel hand-drawn; Cyberpunk might use pixel/glitch art; Cozy might use woodcut

**Motion**
- Easing curves and default durations
- The "feel" of animation — default theme is springy/soft, Cyberpunk might be snappy/glitchy
- All motion respects `prefers-reduced-motion`

**Sound (optional but first-class)**
- Completion sound
- Error sound
- Nudge / notification sound
- Theme-specific ambient touches (Cyberpunk synth stabs, Cozy wind chimes, etc.)
- All sound is opt-in and off by default; the app must work in silence

**Textures and backgrounds**
- Noise, grain, scanlines, paper texture, or none

## The default theme (v1)

**Name:** TBD (placeholder: "Cozy")

**Vibe:** Warm, playful, cheeky-cozy. The one Dave and Krista would actually live in daily. A house they want to come home to.

**Palette direction:** Soft warm neutrals as the base. A single warm accent color — likely in the peach/coral/terracotta family, or a muted rose. Success in sage green. Warning in honey. Destructive in brick. Everything muted; no neon; nothing saturated to 100%.

**Typography direction:** A friendly geometric sans for UI, slightly rounded. A second typeface for display moments — possibly a soft serif or a chunky sans — to give empty states and celebratory moments some personality.

**Iconography:** Line icons with generous stroke weight and fully rounded corners. Never harsh. Never thin.

**Illustration:** Hand-drawn feel. Pastel fills. Little characters in empty states — not mascots, just gentle warm presence. Think: the illustration style of a good children's book, but not for children.

**Motion:** Springy. Soft easing. Nothing snappy or abrupt. Task completion is celebrated with a brief, restrained flourish.

**Sound:** Off by default. When on: soft, warm, no harsh frequencies. Completion = a quiet plucked string. Nudge = a wind chime.

**Textures:** A very subtle paper/canvas noise on large surfaces. Nothing loud.

This is what the design-system skill will crystallize when we run it. What's written here is the brief; the output of the design-system session is the specific tokens and components.

## Deferred theme concepts

These are not in v1 but are tracked here so the theme system is designed to accommodate them.

- **Neutral / Minimal.** A stripped-back, almost monochrome theme for people who want the app to disappear. Closer to Linear's aesthetic. Likely the second theme to ship after the default.
- **Cyberpunk.** Neon, synthwave, scanlines, playful-not-dystopian. Leaned toward *Hotline Miami* and *The Outer Worlds* energy, not *Blade Runner* bleakness. The emotional register stays warm; only the visuals go neon.
- **Cozy Cottage.** Hand-lettered, parchment, woodcut illustrations, teacups. A more-cozy-than-the-default cozy.
- **Bauhaus / Modernist.** Strict grid, bold primary colors, Futura. A fun stress test of how far the theme system can stretch.
- **Seasonal themes.** Holiday, summer, autumn. Light touches, not full swaps. Possibly only adjust accent color and illustration.

Themes beyond the default are post-v1. They're listed here only to pressure-test that the theme *system* can accommodate this range. If the system can handle Cozy Cottage *and* Cyberpunk *and* Bauhaus without refactoring, it's the right system.

## Theme implementation notes

Detailed token structure and Tailwind v4 configuration will be produced when the design-system skill runs. Guiding constraints:

- Theme tokens exposed as CSS variables so runtime theme switching is instant, not a page reload.
- Theme tokens consumed by Tailwind v4 via its CSS-variable-first architecture (this is why v4 is the right pick for this project).
- A theme is defined in a single file that ships as part of the app bundle. New themes are added without code changes to components.
- Theme previews in settings show the actual app chrome, not abstract swatches. Users pick a theme by seeing the app wear it.

## Theme governance

One rule to prevent the theme system from decaying:

**No component ships with a hard-coded color, font, spacing value, motion curve, or sound effect. Ever. If a token doesn't exist for what you need, add the token to every theme before adding the component.**

This is boring but it's the single thing that keeps themeable products themeable three years in. Once one component hard-codes `#FF6B9D`, the dam breaks.

The rules for enforcing this in practice — what counts as a token, how new tokens are added, how components consume them, how component docs are kept in sync with component code — live in [`design-system/README.md`](../design-system/README.md). That file is the contract every future UI-touching session must read before writing a line of component code.
