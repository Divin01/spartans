import type { PhaseTask, ProjectConfig, Task } from "./types";
import { DEFAULT_CONFIG } from "./project-config";

/** Canonical display label for a plan phase task, e.g. "4.1. User Authentication" */
export function formatPlanMilestone(pt: PhaseTask): string {
  return `${pt.id}. ${pt.title}`;
}

/** All phase tasks from the project plan, in plan order. */
export function getAllPlanTasks(config: ProjectConfig = DEFAULT_CONFIG): PhaseTask[] {
  return config.phases.flatMap((p) => p.tasks);
}

/**
 * Returns true when a stored milestone string refers to a plan task id.
 * Handles "4.1", "4.1 Title", "4.1. Title" and guards "4.1" vs "4.10".
 */
export function matchesPlanTaskId(milestone: string, ptId: string): boolean {
  const m = milestone.trim();
  if (m === ptId) return true;
  if (!m.startsWith(ptId)) return false;
  const sep = m[ptId.length];
  return sep === " " || sep === "." || sep === "-";
}

/** Resolve a free-text milestone (or explicit id) to a plan task id. */
export function resolvePlanTaskId(
  milestone: string,
  config: ProjectConfig = DEFAULT_CONFIG
): string | undefined {
  const m = milestone.trim();
  if (!m) return undefined;
  return getAllPlanTasks(config).find((pt) => matchesPlanTaskId(m, pt.id))?.id;
}

/** Resolve to the full plan task, preferring a stored milestoneId when present. */
export function resolvePlanTask(
  milestone: string,
  config: ProjectConfig = DEFAULT_CONFIG,
  milestoneId?: string
): PhaseTask | undefined {
  if (milestoneId) {
    const byId = getAllPlanTasks(config).find((pt) => pt.id === milestoneId);
    if (byId) return byId;
  }
  const id = resolvePlanTaskId(milestone, config);
  if (!id) return undefined;
  return getAllPlanTasks(config).find((pt) => pt.id === id);
}

export function getTaskPlanTaskId(
  task: Pick<Task, "milestone" | "milestoneId">,
  config: ProjectConfig = DEFAULT_CONFIG
): string | undefined {
  return task.milestoneId ?? resolvePlanTaskId(task.milestone, config);
}

/** Grouping / display key — canonical label when linked to the plan. */
export function taskMilestoneKey(
  task: Pick<Task, "milestone" | "milestoneId">,
  config: ProjectConfig = DEFAULT_CONFIG
): string {
  const pt = resolvePlanTask(task.milestone, config, task.milestoneId);
  if (pt) return formatPlanMilestone(pt);
  return task.milestone?.trim() || "Uncategorized";
}

export function taskMatchesPlanTask(
  task: Pick<Task, "milestone" | "milestoneId">,
  ptId: string,
  config: ProjectConfig = DEFAULT_CONFIG
): boolean {
  if (task.milestoneId === ptId) return true;
  return matchesPlanTaskId(task.milestone, ptId);
}

export interface NormalizedMilestone {
  milestone: string;
  milestoneId?: string;
}

/** Normalize user input to a canonical plan label + stable id when possible. */
export function normalizeMilestone(
  input: string,
  config: ProjectConfig = DEFAULT_CONFIG
): NormalizedMilestone {
  const trimmed = input.trim();
  if (!trimmed) return { milestone: "" };

  const pt = resolvePlanTask(trimmed, config);
  if (pt) {
    return { milestone: formatPlanMilestone(pt), milestoneId: pt.id };
  }
  return { milestone: trimmed };
}

export interface PlanMilestoneOption {
  id: string;
  label: string;
  /** True when at least one task already references this plan milestone. */
  used: boolean;
}

export function getPlanMilestoneOptions(
  config: ProjectConfig,
  tasks: Pick<Task, "milestone" | "milestoneId">[]
): PlanMilestoneOption[] {
  const usedIds = new Set<string>();
  tasks.forEach((t) => {
    const id = getTaskPlanTaskId(t, config);
    if (id) usedIds.add(id);
  });

  return getAllPlanTasks(config).map((pt) => ({
    id: pt.id,
    label: formatPlanMilestone(pt),
    used: usedIds.has(pt.id),
  }));
}

export function filterPlanMilestoneOptions(
  options: PlanMilestoneOption[],
  query: string
): PlanMilestoneOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return options;
  return options.filter(
    (o) => o.id.toLowerCase().includes(q) || o.label.toLowerCase().includes(q)
  );
}
