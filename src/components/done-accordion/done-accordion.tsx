"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { TaskListItem, type Task } from "../task-list-item/task-list-item";

interface DoneAccordionProps {
  tasks: Task[];
  onUncomplete: (taskId: string) => void;
  onTap: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
}

export function DoneAccordion({ tasks, onUncomplete, onTap, onDelete }: DoneAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  if (tasks.length === 0) return null;

  return (
    <div className="mt-[var(--space-4)]">
      {/* Header — always visible */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="done-task-list"
        className="
          flex items-center gap-[var(--space-2)] w-full
          py-[var(--space-2)] px-[var(--space-3)]
          text-[length:var(--text-sm)] font-[var(--weight-medium)]
          text-[color:var(--color-text-tertiary)]
          hover:text-[color:var(--color-text-secondary)]
          transition-colors duration-[var(--duration-instant)]
          min-h-[var(--touch-target-min)]
          rounded-[var(--radius-md)]
        "
      >
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { duration: 0.2, ease: [0.25, 1, 0.5, 1] }
          }
          className="inline-flex"
        >
          <ChevronDown size={16} strokeWidth={2.5} aria-hidden="true" />
        </motion.span>
        <span className="tabular-nums">
          Done <span className="text-[color:var(--color-success)]">({tasks.length})</span>
        </span>
      </button>

      {/* Expandable list — uses grid-template-rows for smooth height animation */}
      <div
        id="done-task-list"
        className="grid transition-[grid-template-rows,opacity] duration-[var(--duration-normal)] ease-[var(--ease-out-quart)]"
        style={{
          gridTemplateRows: isOpen ? "1fr" : "0fr",
          opacity: isOpen ? 1 : 0,
        }}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col divide-y divide-[var(--color-border-subtle)] rounded-[var(--radius-lg)] overflow-hidden bg-[var(--color-surface)] mt-[var(--space-1)]">
            {tasks.map((task) => (
              <TaskListItem
                key={task.id}
                task={task}
                onComplete={() => {}}
                onUncomplete={onUncomplete}
                onPostpone={() => {}}
                onTap={onTap}
                onDelete={onDelete}
                showAssignee={false}
                variant="done"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
