"use client";

import { type ComponentType, type SVGProps } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  CalendarDays,
  CalendarRange,
  CalendarSearch,
  Settings,
  PanelLeftOpen,
  PanelLeftClose,
  UserPlus,
} from "lucide-react";
import { AnimatedNumber } from "../points-display/points-display";
import { Tooltip } from "../tooltip/tooltip";
import { NotificationBell } from "../notification-bell/notification-bell";

/** Detect mac for the right modifier glyph. Safe in SSR (returns false). */
function isMac() {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform);
}

type IconType = ComponentType<SVGProps<SVGSVGElement> & { size?: number; strokeWidth?: number }>;

type NavKey = "/today" | "/week" | "/month";

interface NavItem {
  path: NavKey;
  label: string;
  icon: IconType;
}

const MAIN_NAV: NavItem[] = [
  { path: "/today", label: "Today", icon: CalendarDays },
  { path: "/week", label: "Week", icon: CalendarRange },
  { path: "/month", label: "Month", icon: CalendarSearch },
];

interface SidebarProps {
  activePath: string;
  userId?: string;
  userName: string;
  partnerId?: string;
  partnerName?: string;
  userPoints: number;
  partnerPoints?: number;
  userPointsToday?: number;
  partnerPointsToday?: number;
  hasNotification?: boolean;
  /** Optional per-route contextual stats shown in the nav rows when expanded. */
  todayCount?: number;
  weekCount?: number;
  monthLabel?: string;
  /** Sidebar is locked open. Parent also uses this to adjust main-content offset. */
  isPinned: boolean;
  onTogglePin: () => void;
}

const EASE_OUT_QUART: [number, number, number, number] = [0.25, 1, 0.5, 1];

/* ================================================================
 * Logo mark — placeholder. Two overlapping soft squircles in accent
 * color, hinting at "two together" without being literal.
 * ================================================================ */
function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="1"
        y="6"
        width="16"
        height="16"
        rx="5"
        fill="var(--color-accent)"
      />
      <rect
        x="11"
        y="6"
        width="16"
        height="16"
        rx="5"
        fill="var(--color-accent)"
        fillOpacity="0.55"
      />
    </svg>
  );
}

/* ================================================================
 * Points hero — the emotional anchor of the rail.
 *
 * Expanded: horizontal twin-tally with a "This week" overline and
 *   a vertical accent hairline between the two partners. Both names
 *   held in equal weight — recognition, not competition.
 *
 * Peek: the user's numeral stacked over a small ampersand over the
 *   partner's numeral. Reads as "two together" even at 72px wide.
 * ================================================================ */
function PointsHero({
  userName,
  partnerName,
  userPoints,
  partnerPoints,
  userPointsToday,
  partnerPointsToday,
  isExpanded,
}: {
  userName: string;
  partnerName?: string;
  userPoints: number;
  partnerPoints?: number;
  userPointsToday: number;
  partnerPointsToday: number;
  isExpanded: boolean;
}) {
  const hasPartner = Boolean(partnerName && partnerPoints !== undefined);

  return (
    <div className="relative flex flex-col w-full select-none">
      <AnimatePresence initial={false} mode="wait">
        {isExpanded ? (
          <motion.div
            key="expanded"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: EASE_OUT_QUART }}
            className="flex flex-col"
          >
            {/* Overline — frames what the number means */}
            <div className="flex items-center gap-[var(--space-2)] mb-[var(--space-3)]">
              <span className="h-px flex-1 bg-[var(--color-border-subtle)]" />
              <span
                className="
                  text-[length:var(--text-xs)] font-[var(--weight-semibold)]
                  uppercase tracking-[0.18em]
                  text-[color:var(--color-text-tertiary)]
                "
              >
                This week
              </span>
              <span className="h-px flex-1 bg-[var(--color-border-subtle)]" />
            </div>

            {/* Twin tallies, horizontal */}
            <div
              className={`
                grid
                ${hasPartner ? "grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]" : "grid-cols-1"}
                items-stretch
                gap-[var(--space-2)]
              `}
            >
              <TallyExpanded
                name={userName}
                points={userPoints}
                todayDelta={userPointsToday}
              />
              {hasPartner && (
                <div
                  aria-hidden="true"
                  className="relative flex flex-col items-center justify-center"
                >
                  <span className="h-full w-px bg-[var(--color-border)]" />
                  <span
                    className="
                      absolute
                      font-[family-name:var(--font-display)]
                      italic font-[var(--weight-medium)]
                      text-[length:var(--text-sm)]
                      text-[color:var(--color-accent)]
                      bg-[var(--color-surface)]
                      px-[var(--space-1)] leading-none
                    "
                  >
                    &amp;
                  </span>
                </div>
              )}
              {hasPartner && (
                <TallyExpanded
                  name={partnerName!}
                  points={partnerPoints!}
                  todayDelta={partnerPointsToday}
                />
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="peek"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14, ease: EASE_OUT_QUART }}
            className="flex flex-col items-center"
          >
            <PeekNumeral points={userPoints} emphasis />
            {hasPartner && (
              <>
                <span
                  aria-hidden="true"
                  className="
                    font-[family-name:var(--font-display)]
                    text-[length:var(--text-sm)]
                    text-[color:var(--color-accent)]
                    leading-none my-[var(--space-0-5)] italic
                  "
                >
                  &amp;
                </span>
                <PeekNumeral points={partnerPoints!} emphasis={false} />
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TallyExpanded({
  name,
  points,
  todayDelta,
}: {
  name: string;
  points: number;
  todayDelta: number;
}) {
  return (
    <div className="flex flex-col items-center text-center leading-none min-w-0">
      <span
        className="
          font-[family-name:var(--font-body)]
          text-[length:var(--text-xs)]
          font-[var(--weight-semibold)]
          uppercase tracking-[0.12em]
          text-[color:var(--color-text-secondary)]
          truncate max-w-full
        "
      >
        {name}
      </span>
      <span
        className="
          font-[family-name:var(--font-display)]
          font-[var(--weight-bold)]
          tabular-nums tracking-tight
          text-[color:var(--color-text-primary)]
          mt-[var(--space-2)]
          text-[length:var(--text-2xl)] leading-none
        "
      >
        <AnimatedNumber value={points} />
      </span>
      <span
        className="
          mt-[var(--space-2)]
          text-[length:var(--text-xs)] font-[var(--weight-medium)]
          tabular-nums
          min-h-[var(--space-4)] whitespace-nowrap
        "
        style={{
          color:
            todayDelta > 0
              ? "var(--color-success)"
              : "var(--color-text-disabled)",
        }}
        aria-label={todayDelta > 0 ? `${todayDelta} today` : "no points today"}
      >
        {todayDelta > 0 ? `+${todayDelta} today` : "—"}
      </span>
    </div>
  );
}

function PeekNumeral({
  points,
  emphasis,
}: {
  points: number;
  emphasis: boolean;
}) {
  return (
    <span
      className={`
        font-[family-name:var(--font-display)]
        font-[var(--weight-bold)]
        tabular-nums tracking-tight
        ${emphasis ? "text-[color:var(--color-text-primary)]" : "text-[color:var(--color-text-secondary)]"}
        text-[length:var(--text-xl)] leading-none
      `}
    >
      <AnimatedNumber value={points} />
    </span>
  );
}

/* ================================================================
 * Nav row — carries real weight because we only have three. Icon +
 * label + optional contextual stat. Active state is an inset canvas
 * panel + accent icon + primary-weight label. No left-border stripes.
 * ================================================================ */
function NavRow({
  item,
  isActive,
  isExpanded,
  stat,
}: {
  item: NavItem;
  isActive: boolean;
  isExpanded: boolean;
  stat?: string;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.path}
      aria-current={isActive ? "page" : undefined}
      aria-label={item.label}
      title={!isExpanded ? item.label : undefined}
      className={`
        group/nav relative
        flex items-center
        h-[3.25rem] /* 52px — intentional; aligns with compact sidebar header, not mobile --header-height */
        rounded-[var(--radius-lg)]
        transition-colors duration-[var(--duration-fast)]
        outline-none
        ${
          isActive
            ? "bg-[var(--color-canvas)]"
            : "hover:bg-[var(--color-surface-dim)]"
        }
      `}
      style={{
        paddingLeft: isExpanded ? "var(--space-4)" : "0",
        paddingRight: isExpanded ? "var(--space-3)" : "0",
        justifyContent: isExpanded ? "flex-start" : "center",
      }}
    >
      <span
        className={`
          flex items-center justify-center shrink-0
          h-10 w-10
          ${
            isActive
              ? "text-[color:var(--color-accent)]"
              : "text-[color:var(--color-text-secondary)] group-hover/nav:text-[color:var(--color-text-primary)]"
          }
        `}
      >
        <Icon
          size={22}
          strokeWidth={isActive ? 2.25 : 2}
          aria-hidden="true"
        />
      </span>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.span
            key="label"
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.18, ease: EASE_OUT_QUART }}
            className={`
              ml-[var(--space-2)]
              font-[family-name:var(--font-display)]
              text-[length:var(--text-lg)]
              ${
                isActive
                  ? "font-[var(--weight-semibold)] text-[color:var(--color-text-primary)]"
                  : "font-[var(--weight-medium)] text-[color:var(--color-text-secondary)] group-hover/nav:text-[color:var(--color-text-primary)]"
              }
              whitespace-nowrap
            `}
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {isExpanded && stat && (
          <motion.span
            key="stat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14, delay: 0.04, ease: EASE_OUT_QUART }}
            className={`
              ml-auto
              tabular-nums
              text-[length:var(--text-xs)]
              font-[var(--weight-medium)]
              whitespace-nowrap
              ${
                isActive
                  ? "text-[color:var(--color-accent)]"
                  : "text-[color:var(--color-text-tertiary)]"
              }
            `}
            aria-hidden="true"
          >
            {stat}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
}

/* ================================================================
 * Bottom utility — invite (solo), settings, pin toggle
 * ================================================================ */
function UtilityRow({
  isExpanded,
  activePath,
  userId,
  userName,
  partnerId,
  partnerName,
  isPinned,
  onTogglePin,
}: {
  isExpanded: boolean;
  activePath: string;
  userId?: string;
  userName: string;
  partnerId?: string;
  partnerName?: string;
  isPinned: boolean;
  onTogglePin: () => void;
}) {
  const settingsActive = activePath === "/settings";
  const PinIcon = isPinned ? PanelLeftClose : PanelLeftOpen;
  const pinLabel = isPinned ? "Collapse sidebar" : "Pin sidebar open";

  return (
    <div className="px-[var(--space-2)] pb-[var(--space-3)] flex flex-col gap-[var(--space-1)]">
      {/* Invite CTA — only in solo state */}
      <AnimatePresence initial={false}>
        {!partnerName && isExpanded && (
          <motion.a
            key="invite"
            href="/invite"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.2, ease: EASE_OUT_QUART }}
            className="
              mb-[var(--space-2)]
              flex items-center gap-[var(--space-2)]
              h-[var(--touch-target-min)] px-[var(--space-3)]
              rounded-[var(--radius-md)]
              bg-[var(--color-accent-subtle)]
              text-[color:var(--color-accent)]
              text-[length:var(--text-sm)] font-[var(--weight-semibold)]
              hover:bg-[var(--color-accent)] hover:text-[color:var(--color-accent-text)]
              transition-colors duration-[var(--duration-fast)]
            "
          >
            <UserPlus size={16} strokeWidth={2.25} aria-hidden="true" />
            Bring your person in
          </motion.a>
        )}
      </AnimatePresence>

      {/* Solo-state peek affordance — when collapsed & solo, just an accented
          icon so the invite path stays reachable. */}
      {!partnerName && !isExpanded && (
        <Link
          href="/invite"
          title="Bring your person in"
          className="
            flex items-center justify-center
            h-[3rem] rounded-[var(--radius-lg)]
            text-[color:var(--color-accent)]
            hover:bg-[var(--color-accent-subtle)]
            transition-colors duration-[var(--duration-fast)]
          "
        >
          <UserPlus size={20} strokeWidth={2.25} aria-hidden="true" />
          <span className="sr-only">Bring your person in</span>
        </Link>
      )}

      {/* Paired-state notification bell — replaces the invite affordance once
          the partner has joined. Rendered in both collapsed and expanded states
          using the same icon-only / icon+label layout rhythm as Settings. */}
      {partnerName && userId && partnerId && (
        <div
          className={`
            flex items-center h-11 rounded-[var(--radius-md)]
            ${isExpanded ? "w-full px-[var(--space-3)] gap-[var(--space-2)]" : "w-11 justify-center self-center"}
          `}
        >
          <NotificationBell
            members={[
              { id: userId, displayName: userName },
              { id: partnerId, displayName: partnerName },
            ]}
          />
          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.span
                key="bell-label"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.14, ease: EASE_OUT_QUART }}
                className="text-[length:var(--text-sm)] font-[var(--weight-medium)] text-[color:var(--color-text-tertiary)]"
              >
                Notifications
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Always-vertical stack. Settings and Pin use an identical
          "standard menu item" layout so icons line up in both states:
          peek = h-11 w-11 icon-only centered; expanded = full-width row
          with icon + label left-aligned. */}
      <div className="flex flex-col gap-[var(--space-1)]">
        {/* Settings */}
        <Link
          href="/settings"
          aria-current={settingsActive ? "page" : undefined}
          aria-label="Settings"
          title={!isExpanded ? "Settings" : undefined}
          className={`
            flex items-center h-11 rounded-[var(--radius-md)]
            transition-colors duration-[var(--duration-fast)]
            ${isExpanded ? "w-full px-[var(--space-3)] gap-[var(--space-2)] justify-start" : "w-11 justify-center self-center"}
            ${
              settingsActive
                ? "bg-[var(--color-canvas)] text-[color:var(--color-accent)]"
                : "text-[color:var(--color-text-tertiary)] hover:text-[color:var(--color-text-primary)] hover:bg-[var(--color-surface-dim)]"
            }
          `}
        >
          <Settings
            size={18}
            strokeWidth={settingsActive ? 2.25 : 2}
            aria-hidden="true"
          />
          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.span
                key="settings-label"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.14, ease: EASE_OUT_QUART }}
                className="text-[length:var(--text-sm)] font-[var(--weight-medium)]"
              >
                Settings
              </motion.span>
            )}
          </AnimatePresence>
          {!isExpanded && <span className="sr-only">Settings</span>}
        </Link>

        {/* Pin toggle — standard menu item layout, matches Settings */}
        <Tooltip
          label={pinLabel}
          shortcut={isMac() ? "⌘\\" : "Ctrl+\\"}
          placement="right"
          offset={10}
          className={isExpanded ? "w-full" : "self-center"}
        >
          <button
            type="button"
            onClick={onTogglePin}
            aria-label={pinLabel}
            aria-pressed={isPinned}
            className={`
              flex items-center h-11 rounded-[var(--radius-md)]
              transition-colors duration-[var(--duration-fast)]
              ${isExpanded ? "w-full px-[var(--space-3)] gap-[var(--space-2)] justify-start" : "w-11 justify-center"}
              ${
                isPinned
                  ? "bg-[var(--color-accent-subtle)] text-[color:var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-[color:var(--color-accent-text)]"
                  : "text-[color:var(--color-text-tertiary)] hover:text-[color:var(--color-text-primary)] hover:bg-[var(--color-surface-dim)]"
              }
            `}
          >
            <PinIcon size={18} strokeWidth={2} aria-hidden="true" />
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.span
                  key="pin-label"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.14, ease: EASE_OUT_QUART }}
                  className="text-[length:var(--text-sm)] font-[var(--weight-medium)]"
                >
                  {pinLabel}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </Tooltip>
      </div>
    </div>
  );
}

/* ================================================================
 * Sidebar — composition
 * ================================================================ */
export function Sidebar({
  activePath,
  userId,
  userName,
  partnerId,
  partnerName,
  userPoints,
  partnerPoints,
  userPointsToday = 0,
  partnerPointsToday = 0,
  hasNotification = false,
  todayCount,
  weekCount,
  monthLabel,
  isPinned,
  onTogglePin,
}: SidebarProps) {
  const shouldReduceMotion = useReducedMotion();

  // Sidebar is binary: pinned (272px, labels + stats) or collapsed (72px rail).
  // The previous hover-to-expand "peek" affordance was removed — it flashed
  // during route transitions and was disorienting. The pinned bit is the only
  // input to layout. Toggle with ⌘\ or the pin button.
  const isExpanded = isPinned;

  // Width animates via CSS transition rather than Framer Motion — Motion v12
  // won't interpolate between two CSS variable strings (it applies the
  // initial value then no-ops subsequent changes), which left the rail stuck
  // at peek width even when isPinned flipped true. CSS transitions handle
  // `width` changes between var() values correctly.
  const navStat: Record<NavKey, string | undefined> = {
    "/today": todayCount != null ? `${todayCount} left` : undefined,
    "/week": weekCount != null ? `${weekCount} ahead` : undefined,
    "/month": monthLabel,
  };

  return (
    <aside
      className={`
        hidden lg:flex flex-col
        h-screen fixed inset-y-0 left-0 z-[var(--z-sticky)]
        bg-[var(--color-surface)]
        border-r border-[var(--color-border-subtle)]
        ${shouldReduceMotion ? "" : "transition-[width] duration-[var(--duration-normal)] ease-[var(--ease-out-quart)]"}
      `}
      style={{
        width: isExpanded ? "var(--sidebar-width)" : "var(--sidebar-width-peek)",
      }}
      aria-label="Primary"
    >
      {/* ---- Top: logo mark (+ wordmark when expanded) ---- */}
      <div
        className="
          flex items-center
          h-[3.25rem] /* 52px — intentional; aligns with compact sidebar header, not mobile --header-height */ shrink-0
          border-b border-[var(--color-border-subtle)]
        "
        style={{
          justifyContent: isExpanded ? "flex-start" : "center",
          paddingLeft: isExpanded ? "var(--space-6)" : 0,
          paddingRight: isExpanded ? "var(--space-6)" : 0,
        }}
      >
        <LogoMark size={24} />
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.span
              key="wordmark"
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -4 }}
              transition={{ duration: 0.18, ease: EASE_OUT_QUART }}
              className="
                ml-[var(--space-2)]
                font-[family-name:var(--font-display)]
                text-[length:var(--text-lg)]
                font-[var(--weight-bold)]
                text-[color:var(--color-text-primary)]
                tracking-tight
              "
            >
              todo<span className="text-[color:var(--color-accent)]">.</span>
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* ---- Hero: points ----
           Fixed height across peek/expanded so the nav below does not
           shift down when the rail expands on hover. Compact peek tally
           is vertically centered within the reserved space. */}
      <div
        className={`
          shrink-0 flex items-center justify-center
          h-[9rem]
          ${isExpanded ? "px-[var(--space-5)]" : "px-[var(--space-2)]"}
          border-b border-[var(--color-border-subtle)]
        `}
      >
        {hasNotification && (
          <span
            className="sr-only"
            role="status"
            aria-live="polite"
          >
            You have a new notification.
          </span>
        )}
        <PointsHero
          userName={userName}
          partnerName={partnerName}
          userPoints={userPoints}
          partnerPoints={partnerPoints}
          userPointsToday={userPointsToday}
          partnerPointsToday={partnerPointsToday}
          isExpanded={isExpanded}
        />
      </div>

      {/* ---- Nav ---- */}
      <nav
        aria-label="Main navigation"
        className={`
          flex-1 min-h-0
          ${isExpanded ? "px-[var(--space-3)]" : "px-[var(--space-2)]"}
          pt-[var(--space-4)]
        `}
      >
        <ul className="flex flex-col gap-[var(--space-1)]" role="list">
          {MAIN_NAV.map((item) => (
            <li key={item.path}>
              <NavRow
                item={item}
                isActive={activePath === item.path}
                isExpanded={isExpanded}
                stat={navStat[item.path]}
              />
            </li>
          ))}
        </ul>
      </nav>

      {/* ---- Bottom utility ---- */}
      <UtilityRow
        isExpanded={isExpanded}
        activePath={activePath}
        userId={userId}
        userName={userName}
        partnerId={partnerId}
        partnerName={partnerName}
        isPinned={isPinned}
        onTogglePin={onTogglePin}
      />
    </aside>
  );
}
