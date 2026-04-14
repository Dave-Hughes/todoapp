"use client";

import { SegmentedControl } from "../segmented-control/segmented-control";

export type FilterValue = "mine" | "theirs" | "all";

interface FilterToggleProps {
  value: FilterValue;
  onChange: (value: FilterValue) => void;
  partnerName?: string;
}

/**
 * FilterToggle
 *
 * Thin wrapper around SegmentedControl for the Mine/Theirs/All task filter.
 * Provides the specific options and ARIA label; delegates rendering,
 * keyboard nav, and animation to the shared primitive.
 *
 * When `partnerName` is provided, the "Theirs" label becomes personalized
 * (e.g. "Krista's") — a small UX touch for a couples app.
 */
export function FilterToggle({
  value,
  onChange,
  partnerName,
}: FilterToggleProps) {
  const options: { value: FilterValue; label: string }[] = [
    { value: "mine", label: "Mine" },
    { value: "theirs", label: partnerName ? `${partnerName}'s` : "Theirs" },
    { value: "all", label: "All" },
  ];

  return (
    <SegmentedControl
      options={options}
      value={value}
      onChange={onChange}
      ariaLabel="Filter tasks by assignee"
    />
  );
}
