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

/** Numeric-aware comparison for plan ids such as "4.1" vs "4.10". */
export function comparePlanTaskIds(a: string, b: string): number {
  const parts = (id: string) => id.split(".").map((n) => parseInt(n, 10) || 0);
  const pa = parts(a);
  const pb = parts(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function planIndexForKey(milestoneKey: string, config: ProjectConfig): number {
  if (!milestoneKey || milestoneKey === "Uncategorized") return -1;
  const all = getAllPlanTasks(config);
  return all.findIndex(
    (pt) => formatPlanMilestone(pt) === milestoneKey || matchesPlanTaskId(milestoneKey, pt.id)
  );
}

/** Sort milestone keys in project plan order; custom labels follow, then Uncategorized. */
export function compareMilestoneKeys(
  a: string,
  b: string,
  config: ProjectConfig = DEFAULT_CONFIG
): number {
  const all = getAllPlanTasks(config);
  const rank = (key: string): number => {
    if (!key || key === "Uncategorized") return all.length + 2;
    const idx = planIndexForKey(key, config);
    if (idx !== -1) return idx;
    return all.length + 1;
  };

  const ra = rank(a);
  const rb = rank(b);
  if (ra !== rb) return ra - rb;
  return a.localeCompare(b);
}

export function sortMilestoneKeys(
  keys: string[],
  config: ProjectConfig = DEFAULT_CONFIG
): string[] {
  return [...keys].sort((a, b) => compareMilestoneKeys(a, b, config));
}

export function sortMilestoneEntries<T>(
  entries: [string, T][],
  config: ProjectConfig = DEFAULT_CONFIG
): [string, T][] {
  return [...entries].sort(([a], [b]) => compareMilestoneKeys(a, b, config));
}

export function groupTasksByMilestone(
  tasks: Pick<Task, "milestone" | "milestoneId">[],
  config: ProjectConfig = DEFAULT_CONFIG
): Record<string, Task[]> {
  return tasks.reduce<Record<string, Task[]>>((acc, t) => {
    const key = taskMilestoneKey(t, config);
    if (!acc[key]) acc[key] = [];
    acc[key].push(t as Task);
    return acc;
  }, {});
}

export interface OrderedMilestoneGroup {
  key: string;
  tasks: Task[];
  planIndex: number;
  planTaskId?: string;
  isPlanMilestone: boolean;
}

/** Build milestone groups sorted in plan order; optionally include empty plan slots. */
export function buildOrderedMilestoneGroups(
  tasks: Task[],
  config: ProjectConfig = DEFAULT_CONFIG,
  options?: { includeEmptyPlanMilestones?: boolean }
): OrderedMilestoneGroup[] {
  const grouped = groupTasksByMilestone(tasks, config);
  const all = getAllPlanTasks(config);

  if (options?.includeEmptyPlanMilestones) {
    const result: OrderedMilestoneGroup[] = all.map((pt, planIndex) => {
      const key = formatPlanMilestone(pt);
      return {
        key,
        tasks: grouped[key] ?? [],
        planIndex,
        planTaskId: pt.id,
        isPlanMilestone: true,
      };
    });

    const planKeys = new Set(result.map((g) => g.key));
    sortMilestoneEntries(
      Object.entries(grouped).filter(
        ([key]) => !planKeys.has(key) && key !== "Uncategorized"
      ),
      config
    ).forEach(([key, groupTasks]) => {
      result.push({
        key,
        tasks: groupTasks,
        planIndex: all.length,
        isPlanMilestone: false,
      });
    });

    if (grouped["Uncategorized"]?.length) {
      result.push({
        key: "Uncategorized",
        tasks: grouped["Uncategorized"],
        planIndex: all.length + 1,
        isPlanMilestone: false,
      });
    }

    return result;
  }

  return sortMilestoneEntries(Object.entries(grouped), config).map(([key, groupTasks]) => {
    const planIndex = planIndexForKey(key, config);
    const pt = planIndex !== -1 ? all[planIndex] : undefined;
    return {
      key,
      tasks: groupTasks,
      planIndex,
      planTaskId: pt?.id,
      isPlanMilestone: planIndex !== -1,
    };
  });
}

/** True when two milestone strings refer to the same canonical milestone. */
export function milestoneStringsMatch(
  a: string,
  b: string,
  config: ProjectConfig = DEFAULT_CONFIG
): boolean {
  if (a === b) return true;
  return taskMilestoneKey({ milestone: a }, config) === taskMilestoneKey({ milestone: b }, config);
}

/** Ordered milestone keys for charts/filters — all plan slots plus any custom groups with tasks. */
export function getOrderedMilestoneKeys(
  tasks: Task[],
  config: ProjectConfig = DEFAULT_CONFIG,
  options?: { includeEmptyPlanMilestones?: boolean }
): string[] {
  return buildOrderedMilestoneGroups(tasks, config, options).map((g) => g.key);
}
