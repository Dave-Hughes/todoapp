"use client";

/**
 * Locate a task row by data attribute and briefly highlight it.
 * Callers must ensure each rendered task row has `data-task-id={task.id}`.
 */
export function scrollToTaskAndHighlight(taskId: string): void {
  const el = document.querySelector<HTMLElement>(
    `[data-task-id="${CSS.escape(taskId)}"]`,
  );
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.add("task-highlight");
  window.setTimeout(() => el.classList.remove("task-highlight"), 2000);
}
