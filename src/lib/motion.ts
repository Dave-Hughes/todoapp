/**
 * Shared motion constants for Framer Motion.
 *
 * CSS transitions use tokens (--ease-out-quart, --duration-normal).
 * Framer Motion needs JS values — these are the JS equivalents.
 */

/** ease-out-quart: fast start, smooth deceleration. The default for all UI motion. */
export const EASE_OUT_QUART: [number, number, number, number] = [0.25, 1, 0.5, 1];

/** Standard transition preset for most UI animations. */
export const TRANSITION_NORMAL = {
  duration: 0.3,
  ease: EASE_OUT_QUART,
} as const;

/** Fast transition for micro-interactions (hover, press). */
export const TRANSITION_FAST = {
  duration: 0.15,
  ease: EASE_OUT_QUART,
} as const;

/** Reduced motion: instant, no animation. */
export const TRANSITION_REDUCED = {
  duration: 0,
} as const;
