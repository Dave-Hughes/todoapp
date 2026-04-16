import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

vi.mock("framer-motion", async () => {
  const actual = await vi.importActual<typeof import("framer-motion")>("framer-motion");
  const MotionButton = React.forwardRef<HTMLButtonElement, any>(
    ({ initial, animate, transition, exit, variants, layout, whileHover, whileTap, whileFocus, ...rest }, ref) => (
      <button ref={ref} {...rest} />
    ),
  );
  MotionButton.displayName = "MotionButton";
  return {
    ...actual,
    motion: { ...actual.motion, button: MotionButton },
    useReducedMotion: () => false,
  };
});

import { WeekDayStrip, type WeekDay } from "./week-day-strip";

afterEach(() => cleanup());

function makeWeekDays(): WeekDay[] {
  return [
    { iso: "2026-04-12", shortName: "Sun", dayOfMonth: 12, count: 0, isToday: false },
    { iso: "2026-04-13", shortName: "Mon", dayOfMonth: 13, count: 2, isToday: false },
    { iso: "2026-04-14", shortName: "Tue", dayOfMonth: 14, count: 0, isToday: false },
    { iso: "2026-04-15", shortName: "Wed", dayOfMonth: 15, count: 3, isToday: true },
    { iso: "2026-04-16", shortName: "Thu", dayOfMonth: 16, count: 1, isToday: false },
    { iso: "2026-04-17", shortName: "Fri", dayOfMonth: 17, count: 5, isToday: false },
    { iso: "2026-04-18", shortName: "Sat", dayOfMonth: 18, count: 0, isToday: false },
  ];
}

function getDayPills(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLButtonElement>("[data-day-pill]"));
}

describe("WeekDayStrip", () => {
  it("renders seven day pills", () => {
    const { container } = render(<WeekDayStrip days={makeWeekDays()} selectedIso="2026-04-15" onSelect={() => {}} />);
    expect(getDayPills(container)).toHaveLength(7);
  });

  it("marks the selected day with aria-selected", () => {
    const { container } = render(<WeekDayStrip days={makeWeekDays()} selectedIso="2026-04-15" onSelect={() => {}} />);
    const selected = getDayPills(container).find(t => t.getAttribute("aria-selected") === "true");
    expect(selected).toBeDefined();
    expect(selected!.textContent).toContain("15");
  });

  it("marks today with aria-current=date", () => {
    const { container } = render(<WeekDayStrip days={makeWeekDays()} selectedIso="2026-04-12" onSelect={() => {}} />);
    const today = getDayPills(container).find(t => t.getAttribute("aria-current") === "date");
    expect(today).toBeDefined();
    expect(today!.textContent).toContain("15");
  });

  it("calls onSelect when a pill is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const { container } = render(<WeekDayStrip days={makeWeekDays()} selectedIso="2026-04-15" onSelect={onSelect} />);
    await user.click(getDayPills(container)[5]);
    expect(onSelect).toHaveBeenCalledWith("2026-04-17");
  });

  it("selected pill has tabIndex 0; others have -1", () => {
    const { container } = render(<WeekDayStrip days={makeWeekDays()} selectedIso="2026-04-13" onSelect={() => {}} />);
    const pills = getDayPills(container);
    expect(pills[1]).toHaveAttribute("tabindex", "0");
    expect(pills[0]).toHaveAttribute("tabindex", "-1");
    expect(pills[2]).toHaveAttribute("tabindex", "-1");
  });

  describe("keyboard navigation", () => {
    it("ArrowRight selects the next day", async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      const { container } = render(<WeekDayStrip days={makeWeekDays()} selectedIso="2026-04-14" onSelect={onSelect} />);
      getDayPills(container)[2].focus();
      await user.keyboard("{ArrowRight}");
      expect(onSelect).toHaveBeenCalledWith("2026-04-15");
    });

    it("ArrowLeft selects the previous day", async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      const { container } = render(<WeekDayStrip days={makeWeekDays()} selectedIso="2026-04-14" onSelect={onSelect} />);
      getDayPills(container)[2].focus();
      await user.keyboard("{ArrowLeft}");
      expect(onSelect).toHaveBeenCalledWith("2026-04-13");
    });

    it("ArrowLeft clamps at Sunday", async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      const { container } = render(<WeekDayStrip days={makeWeekDays()} selectedIso="2026-04-12" onSelect={onSelect} />);
      getDayPills(container)[0].focus();
      await user.keyboard("{ArrowLeft}");
      expect(onSelect).not.toHaveBeenCalled();
    });

    it("ArrowRight clamps at Saturday", async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      const { container } = render(<WeekDayStrip days={makeWeekDays()} selectedIso="2026-04-18" onSelect={onSelect} />);
      getDayPills(container)[6].focus();
      await user.keyboard("{ArrowRight}");
      expect(onSelect).not.toHaveBeenCalled();
    });

    it("Home jumps to the first day", async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      const { container } = render(<WeekDayStrip days={makeWeekDays()} selectedIso="2026-04-14" onSelect={onSelect} />);
      getDayPills(container)[2].focus();
      await user.keyboard("{Home}");
      expect(onSelect).toHaveBeenCalledWith("2026-04-12");
    });

    it("End jumps to the last day", async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      const { container } = render(<WeekDayStrip days={makeWeekDays()} selectedIso="2026-04-14" onSelect={onSelect} />);
      getDayPills(container)[2].focus();
      await user.keyboard("{End}");
      expect(onSelect).toHaveBeenCalledWith("2026-04-18");
    });
  });

  describe("density indicator", () => {
    it("does not show + for count=0 days", () => {
      const { container } = render(<WeekDayStrip days={makeWeekDays()} selectedIso="2026-04-12" onSelect={() => {}} />);
      const text = Array.from(getDayPills(container)[0].querySelectorAll("[aria-hidden='true']")).map(el => el.textContent).join("");
      expect(text).not.toContain("+");
    });

    it("shows + overflow for count > 3", () => {
      const { container } = render(<WeekDayStrip days={makeWeekDays()} selectedIso="2026-04-12" onSelect={() => {}} />);
      const text = Array.from(getDayPills(container)[5].querySelectorAll("[aria-hidden='true']")).map(el => el.textContent).join("");
      expect(text).toContain("+");
    });

    it("does not show + for count <= 3", () => {
      const { container } = render(<WeekDayStrip days={makeWeekDays()} selectedIso="2026-04-12" onSelect={() => {}} />);
      const text = Array.from(getDayPills(container)[1].querySelectorAll("[aria-hidden='true']")).map(el => el.textContent).join("");
      expect(text).not.toContain("+");
    });
  });

  describe("screen reader text", () => {
    it("includes full date and task count", () => {
      const { container } = render(<WeekDayStrip days={makeWeekDays()} selectedIso="2026-04-15" onSelect={() => {}} />);
      const pills = getDayPills(container);
      expect(pills[3].textContent).toContain("today");
      expect(pills[3].textContent).toContain("3 tasks");
    });

    it("says no tasks for empty days", () => {
      const { container } = render(<WeekDayStrip days={makeWeekDays()} selectedIso="2026-04-12" onSelect={() => {}} />);
      expect(getDayPills(container)[0].textContent).toContain("no tasks");
    });

    it("uses singular task for count=1", () => {
      const { container } = render(<WeekDayStrip days={makeWeekDays()} selectedIso="2026-04-16" onSelect={() => {}} />);
      const text = getDayPills(container)[4].textContent!;
      expect(text).toContain("1 task");
      expect(text).not.toContain("1 tasks");
    });
  });
});
