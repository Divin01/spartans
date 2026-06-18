"use client";

import { useEffect, useState, useMemo } from "react";
import { getTasks, getReviews, getProjectConfig, saveProjectConfig, updateTask } from "@/lib/firestore";
import { DEFAULT_CONFIG } from "@/lib/project-config";
import {
  formatPlanMilestone,
  getAllPlanTasks,
  getTaskPlanTaskId,
  taskMatchesPlanTask,
  buildOrderedMilestoneGroups,
} from "@/lib/milestones";
import { useAuth } from "@/lib/auth-context";
import type { Task, Review, ProjectConfig, Phase, PhaseTask, KeyMilestone } from "@/lib/types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  Loader2,
  CheckCircle2,
  Circle,
  Clock,
  ChevronDown,
  BarChart3,
  CalendarDays,
  Pencil,
  X,
  Save,
  Plus,
  Trash2,
  Target,
  TrendingDown,
  Activity,
  Flag,
} from "lucide-react";

// ── Default project config (from the plan) ───────────────
// ── Utility helpers ──────────────────────────────────────
function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}
function addDays(date: string, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function formatDate(iso: string, opts?: Intl.DateTimeFormatOptions) {
  return new Date(iso).toLocaleDateString("en-ZA", opts ?? { day: "numeric", month: "short", year: "numeric" });
}
function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

const STATUS_COLOR: Record<string, string> = {
  done: "bg-green-50 text-green-700 border-green-200",
  active: "bg-blue-50 text-blue-700 border-blue-200",
  upcoming: "bg-gray-50 text-gray-500 border-gray-200",
  target: "bg-amber-50 text-amber-700 border-amber-200",
};
const STATUS_DOT: Record<string, string> = {
  done: "bg-green-500",
  active: "bg-blue-500 animate-pulse",
  upcoming: "bg-gray-300",
  target: "bg-amber-400",
};
const PHASE_COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

// ── Burndown tooltip ─────────────────────────────────────
function BurndownTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const pt = payload[0]?.payload;
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xl min-w-[260px] text-xs space-y-2">
      <p className="font-bold text-gray-800 text-sm">{label}</p>

      {pt?.activePhases?.length > 0 && (
        <div className="space-y-0.5">
          {pt.activePhases.map((ph: string) => (
            <div key={ph} className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              <span className="text-indigo-600 font-semibold">{ph}</span>
            </div>
          ))}
        </div>
      )}

      {pt?.activePlanTasks?.length > 0 && (
        <div className="border-t border-gray-100 pt-2">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-1">In-scope tasks</p>
          <div className="space-y-0.5">
            {pt.activePlanTasks.slice(0, 5).map((t: string) => (
              <p key={t} className="text-gray-600">· {t}</p>
            ))}
            {pt.activePlanTasks.length > 5 && (
              <p className="text-gray-400">+{pt.activePlanTasks.length - 5} more</p>
            )}
          </div>
        </div>
      )}

      {pt?.nearbyMilestone && (
        <div className="flex items-center gap-1.5 bg-amber-50 rounded-lg px-2 py-1">
          <span className="text-amber-500">★</span>
          <span className="text-amber-700 font-medium">{pt.nearbyMilestone}</span>
        </div>
      )}

      <div className="border-t border-gray-100 pt-2 space-y-1.5">
        {payload.map((p: any) => p.value != null && (
          <div key={p.dataKey} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-gray-500">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: p.color }} />
              {p.name}
            </span>
            <span className="font-bold text-gray-800">{p.value} left</span>
          </div>
        ))}
      </div>

      {pt?.velocityPerWeek != null && pt.velocityPerWeek > 0 && (
        <p className="text-[10px] text-gray-400 border-t border-gray-100 pt-1.5">
          Burn rate: ~{pt.velocityPerWeek} milestones/week
        </p>
      )}
    </div>
  );
}

// ── Edit milestones modal ────────────────────────────────
function EditMilestonesModal({
  config,
  onSave,
  onClose,
}: {
  config: ProjectConfig;
  onSave: (c: ProjectConfig) => Promise<void>;
  onClose: () => void;
}) {
  const [milestones, setMilestones] = useState<KeyMilestone[]>(config.keyMilestones.map((m) => ({ ...m })));
  const [phases, setPhases] = useState<Phase[]>(() =>
    config.phases.map((p) => ({ ...p, tasks: p.tasks.map((t) => ({ ...t, owners: [...t.owners] })) }))
  );
  const [projectStart, setProjectStart] = useState(config.projectStart);
  const [projectEnd, setProjectEnd] = useState(config.projectEnd);
  const [saving, setSaving] = useState(false);
  const [expandedPhase, setExpandedPhase] = useState<string | null>(phases[0]?.id ?? null);

  function updateMilestone(i: number, field: keyof KeyMilestone, value: string) {
    setMilestones((prev) => prev.map((m, idx) => idx === i ? { ...m, [field]: value } : m));
  }

  function updatePhase(pi: number, field: keyof Omit<Phase, "tasks" | "id">, value: string) {
    setPhases((prev) => prev.map((p, i) => i === pi ? { ...p, [field]: value } : p));
  }

  function addPhase() {
    const today = new Date().toISOString().slice(0, 10);
    const newId = String(Date.now());
    setPhases((prev) => [...prev, { id: newId, title: "New Phase", start: today, end: today, tasks: [] }]);
    setExpandedPhase(newId);
  }

  function removePhase(pi: number) {
    setPhases((prev) => {
      const next = prev.filter((_, i) => i !== pi);
      setExpandedPhase(next[0]?.id ?? null);
      return next;
    });
  }

  function addPhaseTask(pi: number) {
    const today = new Date().toISOString().slice(0, 10);
    setPhases((prev) => prev.map((p, i) => {
      if (i !== pi) return p;
      const taskId = `${p.id}.${p.tasks.length + 1}`;
      return { ...p, tasks: [...p.tasks, { id: taskId, title: "New Task", start: today, end: today, owners: [] }] };
    }));
  }

  function removePhaseTask(pi: number, ti: number) {
    setPhases((prev) => prev.map((p, i) => i === pi ? { ...p, tasks: p.tasks.filter((_, j) => j !== ti) } : p));
  }

  function updatePhaseTask(pi: number, ti: number, field: keyof Omit<PhaseTask, "owners">, value: string) {
    setPhases((prev) => prev.map((p, i) => {
      if (i !== pi) return p;
      return { ...p, tasks: p.tasks.map((t, j) => j === ti ? { ...t, [field]: value } : t) };
    }));
  }

  function updatePhaseTaskOwners(pi: number, ti: number, value: string) {
    setPhases((prev) => prev.map((p, i) => {
      if (i !== pi) return p;
      return { ...p, tasks: p.tasks.map((t, j) => j === ti ? { ...t, owners: value.split(",").map((s) => s.trim()).filter(Boolean) } : t) };
    }));
  }

  async function handleSave() {
    setSaving(true);
    const totalPlannedTasks = phases.reduce((s, p) => s + p.tasks.length, 0);
    await onSave({ ...config, projectStart, projectEnd, totalPlannedTasks, keyMilestones: milestones, phases, updatedAt: new Date().toISOString() });
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Edit Project Settings</h2>
            <p className="text-xs text-gray-400 mt-0.5">Changes reflect immediately in all charts</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-6">
          {/* Project dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Project Start</label>
              <input type="date" value={projectStart} onChange={(e) => setProjectStart(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Target End (Pitch)</label>
              <input type="date" value={projectEnd} onChange={(e) => setProjectEnd(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          {/* Key Milestones */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-700">Key Milestones</p>
              <button onClick={() => setMilestones((p) => [...p, { title: "", date: new Date().toISOString().slice(0, 10), status: "upcoming" }])}
                className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition">
                <Plus className="h-3.5 w-3.5" />Add
              </button>
            </div>
            <div className="space-y-2">
              {milestones.map((m, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center">
                  <input value={m.title} onChange={(e) => updateMilestone(i, "title", e.target.value)}
                    placeholder="Milestone title"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <input type="date" value={m.date} onChange={(e) => updateMilestone(i, "date", e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <select value={m.status} onChange={(e) => updateMilestone(i, "status", e.target.value as KeyMilestone["status"])}
                    className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="done">Done</option>
                    <option value="active">Active</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="target">Target</option>
                  </select>
                  <button onClick={() => setMilestones((p) => p.filter((_, idx) => idx !== i))}
                    className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Phases */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-700">
                Phases
                <span className="ml-2 text-xs font-normal text-gray-400">
                  {phases.reduce((s, p) => s + p.tasks.length, 0)} planned tasks total
                </span>
              </p>
              <button onClick={addPhase}
                className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition">
                <Plus className="h-3.5 w-3.5" />Add Phase
              </button>
            </div>
            <div className="space-y-3">
              {phases.map((phase, pi) => (
                <div key={phase.id} className="border border-gray-200 rounded-xl overflow-hidden">
                  {/* Phase header */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 cursor-pointer"
                    onClick={() => setExpandedPhase(expandedPhase === phase.id ? null : phase.id)}>
                    <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${expandedPhase === phase.id ? "" : "-rotate-90"}`} />
                    <input value={phase.title} onClick={(e) => e.stopPropagation()}
                      onChange={(e) => updatePhase(pi, "title", e.target.value)}
                      className="flex-1 bg-transparent text-sm font-semibold text-gray-800 focus:outline-none" />
                    <input type="date" value={phase.start} onClick={(e) => e.stopPropagation()}
                      onChange={(e) => updatePhase(pi, "start", e.target.value)}
                      className="border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white" />
                    <span className="text-xs text-gray-400">to</span>
                    <input type="date" value={phase.end} onClick={(e) => e.stopPropagation()}
                      onChange={(e) => updatePhase(pi, "end", e.target.value)}
                      className="border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white" />
                    <button onClick={(e) => { e.stopPropagation(); removePhase(pi); }}
                      className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Phase tasks */}
                  {expandedPhase === phase.id && (
                    <div className="px-3 py-3 space-y-2">
                      {phase.tasks.map((t, ti) => (
                        <div key={t.id} className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-2 items-center">
                          <span className="text-[10px] text-gray-400 font-mono w-8">{t.id}</span>
                          <input value={t.title} onChange={(e) => updatePhaseTask(pi, ti, "title", e.target.value)}
                            placeholder="Task title"
                            className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                          <input type="date" value={t.start} onChange={(e) => updatePhaseTask(pi, ti, "start", e.target.value)}
                            className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                          <span className="text-xs text-gray-400">to</span>
                          <input type="date" value={t.end} onChange={(e) => updatePhaseTask(pi, ti, "end", e.target.value)}
                            className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                          <button onClick={() => removePhaseTask(pi, ti)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      <button onClick={() => addPhaseTask(pi)}
                        className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 mt-1 transition">
                        <Plus className="h-3 w-3" />Add task
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────
export default function TimelinePage() {
  const { user } = useAuth();
  const isManager = user?.role === "manager";

  const [tasks, setTasks] = useState<Task[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [config, setConfig] = useState<ProjectConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"burndown" | "gantt" | "milestones">("burndown");
  const [burndownView, setBurndownView] = useState<"full" | "month" | "week">("full");
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    Promise.all([getTasks(), getReviews(), getProjectConfig()]).then(([t, r, cfg]) => {
      setTasks(t);
      setReviews(r);
      if (cfg) {
        setConfig(cfg);
      } else {
        // First run — seed DEFAULT_CONFIG so all future edits persist
        saveProjectConfig({ ...DEFAULT_CONFIG, updatedAt: new Date().toISOString(), updatedBy: "system" });
        setConfig(DEFAULT_CONFIG);
      }
      setLoading(false);
    });
  }, []);

  async function handleSaveConfig(updated: ProjectConfig) {
    const withUser = { ...updated, updatedBy: user?.name ?? "PM", updatedAt: new Date().toISOString() };

    // Detect renamed keyMilestones and propagate to all matching Firestore tasks
    const renames: Record<string, string> = {};
    config.keyMilestones.forEach((old, i) => {
      const next = updated.keyMilestones[i];
      if (next && old.title !== next.title) renames[old.title] = next.title;
    });
    if (Object.keys(renames).length > 0) {
      const affected = tasks.filter((t) => t.milestone in renames);
      await Promise.all(affected.map((t) => updateTask(t.id, { milestone: renames[t.milestone] })));
      const freshTasks = await getTasks();
      setTasks(freshTasks);
    }

    // Propagate phase-task title changes to linked Firestore tasks (via milestoneId)
    const oldPlanTasks = getAllPlanTasks(config);
    const newPlanTasks = getAllPlanTasks(updated);
    const planTitleUpdates = newPlanTasks
      .map((np) => {
        const op = oldPlanTasks.find((o) => o.id === np.id);
        if (!op || op.title === np.title) return null;
        return { id: np.id, label: formatPlanMilestone(np) };
      })
      .filter(Boolean) as { id: string; label: string }[];

    if (planTitleUpdates.length > 0) {
      const currentTasks = tasks.length ? tasks : await getTasks();
      const affected = currentTasks.filter(
        (t) => t.milestoneId && planTitleUpdates.some((u) => u.id === t.milestoneId)
      );
      if (affected.length > 0) {
        await Promise.all(
          affected.map((t) => {
            const next = planTitleUpdates.find((u) => u.id === t.milestoneId)!;
            return updateTask(t.id, { milestone: next.label });
          })
        );
        const freshTasks = await getTasks();
        setTasks(freshTasks);
      }
    }

    await saveProjectConfig(withUser);
    setConfig(withUser);
  }

  // Review-aware completion check
  function isEffectivelyDone(taskId: string, sub: { assigneeId: string; completed: boolean }) {
    if (!sub.completed) return false;
    return reviews.some(
      (r) => r.taskId === taskId && r.requesterId === sub.assigneeId && r.status === "approved"
    );
  }

  // ── Burndown data ────────────────────────────────────────
  // ── Milestone-count Burndown ────────────────────────────────────────────────
  // Y-axis = milestones remaining (raw count, NOT a %).
  //
  // Planned  : step-down using each live milestone group’s scheduled deadline
  //            (max task.dueDate within the group). Starts at N, drops by 1 as
  //            each group’s deadline passes — driven by phase schedule.
  //
  // Actual   : fractional remaining = Σ(1 − done_by_date/total) per group.
  //            Reconstructed from sub.completedAt.  e.g. “2.5” = half of 5
  //            milestones’ work is done.
  //
  // Projection: linear burn from today’s actual count → 0 by project end.
  //
  // Tooltip : shows which phase is active at that date + raw counts.
  const burndownData = useMemo(() => {
    const { projectStart, projectEnd } = config;
    if (daysBetween(projectStart, projectEnd) <= 0) return [];

    // ── Phase tasks are the unit of work — ALL tasks from config.phases ──────
    // N = total planned phase tasks (17). Planned line: 17 → 0 straight diagonal.
    // Actual line: normalized fraction done across all keyMilestone groups × N.
    // Weight = max(1, liveTaskCount) so milestones with no Firestore tasks still register.
    const allPlanTasks = getAllPlanTasks(config);
    const N = allPlanTasks.length;  // dynamic — updates if PM adds/removes tasks
    if (N === 0) return [];
    const totalProjectDays = daysBetween(projectStart, projectEnd);

    // Phase-task buckets — keyed by pt.id (e.g. "4.1").
    interface PtBucket { totalSubs: number; approvedByDate: Record<string, number> }
    const ptBuckets: Record<string, PtBucket> = {};
    allPlanTasks.forEach((pt) => { ptBuckets[pt.id] = { totalSubs: 0, approvedByDate: {} }; });

    tasks.forEach((task) => {
      const ptId = getTaskPlanTaskId(task, config);
      if (!ptId) return;
      task.subtasks.forEach((sub) => {
        ptBuckets[ptId].totalSubs += 1;
        if (isEffectivelyDone(task.id, sub) && sub.completedAt) {
          const d = sub.completedAt.slice(0, 10);
          ptBuckets[ptId].approvedByDate[d] = (ptBuckets[ptId].approvedByDate[d] ?? 0) + 1;
        }
      });
    });

    const todayStr = new Date().toISOString().slice(0, 10);
    let startDate = projectStart;
    let endDate = projectEnd;
    let stepDays = 7;

    if (burndownView === "month") {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
      stepDays = 1;
    } else if (burndownView === "week") {
      const now = new Date();
      const mon = new Date(now);
      mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      startDate = mon.toISOString().slice(0, 10);
      endDate = addDays(startDate, 6);
      stepDays = 1;
    }

    const rangeDays = daysBetween(startDate, endDate);
    const points: {
      label: string; date: string;
      planned: number; actual: number | null; projection: number | null;
      activePhases: string[]; activePlanTasks: string[];
      nearbyMilestone: string | null; velocityPerWeek: number;
    }[] = [];
    let lastActualRemaining = N;
    let lastActualIdx = -1;

    for (let i = 0; i <= rangeDays; i += stepDays) {
      const date = addDays(startDate, Math.min(i, rangeDays));

      // Planned: milestones whose deadline hasn’t passed yet = still “remaining”
      // PLANNED: ideal straight-line burn N to 0
      const elapsed = clamp(daysBetween(projectStart, date), 0, totalProjectDays);
      const planned = Math.round((1 - elapsed / totalProjectDays) * N * 10) / 10;
      const activePhases = config.phases.filter((p) => p.start <= date && p.end >= date).map((p) => p.title);
      const activePlanTasks = allPlanTasks.filter((t) => t.start <= date && t.end >= date).map((t) => t.id + " - " + t.title);
      const halfStep = Math.ceil(stepDays / 2);
      const nearbyMilestone = config.keyMilestones.find((m) => Math.abs(daysBetween(m.date, date)) <= halfStep)?.title ?? null;

      const isPast = date <= todayStr;
      const label = burndownView === "full"
        ? formatDate(date, { month: "short", year: "numeric" })
        : formatDate(date, { day: "numeric", month: "short" });

      let actualRemaining: number | null = null;
      let velocityPerWeek = 0;
      if (isPast) {
        let remaining = 0;
        allPlanTasks.forEach((pt) => {
          const b = ptBuckets[pt.id];
          if (b.totalSubs === 0) {
            remaining += 1;
          } else {
            let approvedUpTo = 0;
            Object.entries(b.approvedByDate).forEach(([d, cnt]) => {
              if (d <= date) approvedUpTo += cnt;
            });
            remaining += 1 - Math.min(1, approvedUpTo / b.totalSubs);
          }
        });
        actualRemaining = Math.round(remaining * 10) / 10;
        const daysWorked2 = Math.max(1, daysBetween(projectStart, date));
        velocityPerWeek = Math.round(((N - actualRemaining) / daysWorked2) * 7 * 10) / 10;
        lastActualRemaining = actualRemaining;
        lastActualIdx = points.length;
      }

      points.push({ label, date, planned, actual: actualRemaining, projection: null,
        activePhases, activePlanTasks, nearbyMilestone, velocityPerWeek });
    }

    // Linear projection from today’s actual count toward 0
    if (lastActualIdx >= 0 && lastActualIdx < points.length - 1) {
      const daysWorked = Math.max(1, daysBetween(projectStart, todayStr));
      const burnedSoFar = N - lastActualRemaining;
      const dailyVelocity = burnedSoFar / daysWorked;
      for (let j = lastActualIdx; j < points.length; j++) {
        const daysAhead = daysBetween(todayStr, points[j].date);
        points[j].projection = Math.round(Math.max(0, lastActualRemaining - dailyVelocity * daysAhead) * 10) / 10;
      }
    }

    return points;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, reviews, config, burndownView]);

  // ── Milestone progress — only groups with live tasks ──────────────────────
  // Tab 3 shows milestones in project plan order.
  const milestones = useMemo(() => {
    return buildOrderedMilestoneGroups(tasks, config).reduce<
      Record<string, { tasks: Task[]; done: number; total: number; planTaskId?: string }>
    >((acc, g) => {
      acc[g.key] = {
        tasks: g.tasks,
        done: g.tasks.reduce(
          (s, t) => s + t.subtasks.filter((sub) => isEffectivelyDone(t.id, sub)).length,
          0
        ),
        total: g.tasks.reduce((s, t) => s + t.subtasks.length, 0),
        planTaskId: g.planTaskId,
      };
      return acc;
    }, {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, reviews, config]);

  const orderedMilestoneEntries = useMemo(
    () => buildOrderedMilestoneGroups(tasks, config),
    [tasks, config]
  );

  // ── Per-phase-task live completion % ──────────────────────
  // Maps pt.id (e.g. "4.1") → 0-100. Used by Phase Plan tab status badges.
  const ptPctMap = useMemo(() => {
    const map: Record<string, number> = {};
    config.phases.flatMap((p) => p.tasks).forEach((pt) => {
      const matching = tasks.filter((t) => taskMatchesPlanTask(t, pt.id, config));
      if (matching.length === 0) { map[pt.id] = 0; return; }
      let total = 0, done = 0;
      matching.forEach((t) => {
        total += t.subtasks.length;
        done += t.subtasks.filter((s) => isEffectivelyDone(t.id, s)).length;
      });
      map[pt.id] = total > 0 ? Math.round((done / total) * 100) : 0;
    });
    return map;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, reviews, config]);

  // ── KPIs ─────────────────────────────────────────────────
  //
  // overallPct: weighted by TASK COUNT per milestone group.
  // A group with 4 tasks has 2× the weight of one with 2 tasks.
  // Completion fraction per group = approved subtasks / total subtasks.
  // overallPct = Σ(completion_i × taskCount_i) / Σ(taskCount_i) × 100
  //
  // scheduleProgress: based on phase plan deadlines — how many planned
  // phase tasks (config.phases) should be done by today?
  const milestoneEntries = Object.values(milestones);
  const totalSubtasks = milestoneEntries.reduce((s, g) => s + g.total, 0);
  const doneSubtasks  = milestoneEntries.reduce((s, g) => s + g.done,  0);

  const today = new Date().toISOString().slice(0, 10);
  const daysElapsed = Math.max(0, daysBetween(config.projectStart, today));
  const totalDays = daysBetween(config.projectStart, config.projectEnd);
  const timeElapsedPct = Math.min(100, Math.round((daysElapsed / totalDays) * 100));
  const daysLeft = Math.max(0, daysBetween(today, config.projectEnd));

  // ── All KPIs share the same N=17 phase-task scale as the burndown chart ────
  //
  // scheduleProgress  = timeElapsedPct
  //   The planned burndown line is a straight diagonal N→0 across the project
  //   duration, so "how much of the plan should be done by today" = time elapsed%.
  //
  // overallPct  — exact same weighted-bucket formula as the burndown actual line,
  //   evaluated at today's date. Both use keyMilestone group completion weighted
  //   by max(1, liveTaskCount), normalized to 0–100.
  //   → statusGap = scheduleProgress − overallPct = planned% − actual%
  //     Positive gap  = team is behind the ideal burn line  (red/orange)
  //     Negative gap  = team is ahead of the plan           (green)
  const scheduleProgress = timeElapsedPct;

  const overallPct = (() => {
    const allPT = getAllPlanTasks(config);
    if (allPT.length === 0) return 0;
    let remaining = 0;
    allPT.forEach((pt) => {
      const matching = tasks.filter((t) => taskMatchesPlanTask(t, pt.id, config));
      if (matching.length === 0) {
        remaining += 1;
      } else {
        let total = 0, done = 0;
        matching.forEach((t) => {
          total += t.subtasks.length;
          done += t.subtasks.filter((s) => isEffectivelyDone(t.id, s)).length;
        });
        remaining += total > 0 ? 1 - Math.min(1, done / total) : 1;
      }
    });
    return Math.round((1 - remaining / allPT.length) * 100);
  })();

  // Nuanced status: compare actual approved work vs scheduled completion
  const statusGap = scheduleProgress - overallPct;
  const statusLabel =
    statusGap <= -5 ? "Ahead" :
    statusGap <= 5  ? "On Track" :
    statusGap <= 15 ? "Slightly Behind" :
    statusGap <= 30 ? "Delayed" : "At Risk";
  const statusColor =
    statusGap <= 5  ? "text-green-600" :
    statusGap <= 15 ? "text-yellow-500" :
    statusGap <= 30 ? "text-orange-500" : "text-red-500";
  const statusBg =
    statusGap <= 5  ? "bg-green-50" :
    statusGap <= 15 ? "bg-yellow-50" :
    statusGap <= 30 ? "bg-orange-50" : "bg-red-50";
  const onTrack = statusGap <= 5;

  // Live countdown to investor pitch
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });
  useEffect(() => {
    function compute() {
      const target = new Date(config.projectEnd + "T00:00:00").getTime();
      const diff = Math.max(0, target - Date.now());
      setCountdown({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        mins: Math.floor((diff % 3600000) / 60000),
        secs: Math.floor((diff % 60000) / 1000),
      });
    }
    compute();
    const id = setInterval(compute, 1000);
    return () => clearInterval(id);
  }, [config.projectEnd]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Project Timeline</h1>
          <p className="text-gray-500 text-sm mt-1">
            {formatDate(config.projectStart)} → {formatDate(config.projectEnd)} · {daysLeft} days remaining
          </p>
        </div>
        {isManager && (
          <button onClick={() => setShowEdit(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100 transition">
            <Pencil className="h-3.5 w-3.5" />Edit milestones
          </button>
        )}
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Overall Progress — schedule-weighted across all phase tasks */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-indigo-50 rounded-xl p-2.5 shrink-0">
              <Activity className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Overall Progress</p>
              <p className="text-2xl font-bold text-gray-900 leading-tight">{overallPct}%</p>
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
            <div
              className="h-1.5 rounded-full bg-indigo-500 transition-all duration-700"
              style={{ width: `${overallPct}%` }}
            />
          </div>
          <p className="text-xs text-gray-400">
            {doneSubtasks}/{totalSubtasks} subtasks approved · {scheduleProgress}% of plan due today
          </p>
        </div>

        {/* Time Elapsed */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="bg-blue-50 rounded-xl p-2.5 shrink-0">
            <Clock className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Time Elapsed</p>
            <p className="text-xl font-bold text-gray-900 leading-tight">{timeElapsedPct}%</p>
            <p className="text-xs text-gray-400 mt-0.5">Day {daysElapsed} of {totalDays}</p>
          </div>
        </div>

        {/* Status */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
          <div className={`${statusBg} rounded-xl p-2.5 shrink-0`}>
            <TrendingDown className={`h-5 w-5 ${statusColor}`} />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Status</p>
            <p className={`text-xl font-bold leading-tight ${statusColor}`}>{statusLabel}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {overallPct}% actual · {scheduleProgress}% planned
            </p>
          </div>
        </div>

        {/* Countdown to Pitch */}
        <div className={`rounded-2xl border p-5 bg-black ${
          countdown.days <= 14 ? "border-red-900/50" :
          countdown.days <= 30 ? "border-orange-900/50" : "border-white/10"
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <Target className={`h-4 w-4 ${
              countdown.days <= 14 ? "text-red-400" :
              countdown.days <= 30 ? "text-orange-400" : "text-gray-500"
            }`} />
            <div>
              <p className="text-xs text-gray-500 font-medium">Investor Pitch</p>
              <p className={`text-[10px] font-semibold ${
                countdown.days <= 14 ? "text-red-400" :
                countdown.days <= 30 ? "text-orange-400" : "text-gray-500"
              }`}>{formatDate(config.projectEnd)}</p>
            </div>
          </div>
          {countdown.days === 0 && countdown.hours === 0 && countdown.mins === 0 && countdown.secs === 0 ? (
            <p className="text-sm font-bold text-white">Pitch day! 🎯</p>
          ) : (
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { v: countdown.days, u: "days" },
                { v: countdown.hours, u: "hrs" },
                { v: countdown.mins, u: "min" },
                { v: countdown.secs, u: "sec" },
              ].map(({ v, u }) => (
                <div key={u} className={`flex flex-col items-center rounded-lg py-2 ${
                  countdown.days <= 14 ? "bg-red-500/20" :
                  countdown.days <= 30 ? "bg-orange-500/20" : "bg-white/10"
                }`}>
                  <span className={`text-lg font-bold tabular-nums leading-none ${
                    countdown.days <= 14 ? "text-red-300" :
                    countdown.days <= 30 ? "text-orange-300" : "text-white"
                  }`}>
                    {String(v).padStart(2, "0")}
                  </span>
                  <span className={`text-[9px] font-semibold uppercase tracking-wide mt-0.5 ${
                    countdown.days <= 14 ? "text-red-500" :
                    countdown.days <= 30 ? "text-orange-500" : "text-gray-500"
                  }`}>{u}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {([
          { id: "burndown" as const, label: "Burndown Chart", icon: <TrendingDown className="h-4 w-4" /> },
          { id: "gantt"    as const, label: "Phase Plan",          icon: <CalendarDays className="h-4 w-4" /> },
          { id: "milestones" as const, label: "Live Progress",     icon: <BarChart3 className="h-4 w-4" /> },
        ]).map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition ${tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════ TAB 1: BURNDOWN ══════════════════ */}
      {tab === "burndown" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Burndown Analysis</h2>
            <p className="text-xs text-gray-400 mt-0.5">Tasks remaining from plan — planned ideal vs. actual approvals vs. velocity projection</p>
          </div>

          {/* Chart */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            {/* Filter + legend row */}
            <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
              <div className="space-y-3">
                <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
                  {(["full", "month", "week"] as const).map((v) => (
                    <button key={v} onClick={() => setBurndownView(v)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${burndownView === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                      {v === "full" ? "Full Project" : v === "month" ? "This Month" : "This Week"}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-5 flex-wrap">
                  {[
                    { color: "#6366f1", label: "Planned (Phase Schedule)", dash: false },
                    { color: "#10b981", label: "Actual (Approved Work)", dash: false },
                    { color: "#f59e0b", label: "Projected Burn", dash: true },
                  ].map((l) => (
                    <div key={l.label} className="flex items-center gap-2">
                      <svg width="24" height="3"><line x1="0" y1="1.5" x2="24" y2="1.5" stroke={l.color} strokeWidth="2.5" strokeDasharray={l.dash ? "4 3" : "0"} /></svg>
                      <span className="text-xs text-gray-500">{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <span className="text-xs text-gray-400 pt-1">Auto-updates as tasks are approved</span>
            </div>

            {burndownData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No data for this period</div>
            ) : (
              <ResponsiveContainer width="100%" height={380}>
                <LineChart data={burndownData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                    domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.05)]}
                    label={{ value: "Tasks Remaining", angle: -90, position: "insideLeft", offset: 10, style: { fill: "#94a3b8", fontSize: 11 } }} />
                  <Tooltip content={<BurndownTooltip />} />
                  <ReferenceLine x={burndownData.find((d) => d.date >= today)?.label}
                    stroke="#e11d48" strokeDasharray="4 3" strokeWidth={1.5}
                    label={{ value: "Today", position: "top", fill: "#e11d48", fontSize: 10 }} />
                  {config.keyMilestones.filter((m) => m.status === "target" || m.status === "active").slice(0, 3).map((m) => {
                    const pt = burndownData.find((d) => d.date >= m.date);
                    return pt ? <ReferenceLine key={m.title} x={pt.label} stroke={m.status === "target" ? "#f59e0b" : "#6366f1"} strokeDasharray="3 3" strokeWidth={1} /> : null;
                  })}
                  <Line type="monotone" dataKey="planned" name="Planned" stroke="#6366f1" strokeWidth={2} dot={false} activeDot={{ r: 4 }} connectNulls />
                  <Line type="monotone" dataKey="actual" name="Actual" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: "#10b981", strokeWidth: 0 }} activeDot={{ r: 5 }} connectNulls={false} />
                  <Line type="monotone" dataKey="projection" name="Projection" stroke="#f59e0b" strokeWidth={2} strokeDasharray="6 4" dot={false} activeDot={{ r: 4 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Key milestones list */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Flag className="h-4 w-4 text-indigo-500" />Key Milestones
              </h3>
              {isManager && (
                <button onClick={() => setShowEdit(true)} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
                  <Pencil className="h-3 w-3" />Edit
                </button>
              )}
            </div>
            <div className="space-y-2">
              {config.keyMilestones.map((m) => (
                <div key={m.title + m.date} className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_DOT[m.status]}`} />
                  <div className={`flex-1 flex items-center justify-between px-4 py-3 rounded-xl border text-sm ${STATUS_COLOR[m.status]}`}>
                    <span className="font-medium">{m.title}</span>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs opacity-70">{formatDate(m.date, { day: "numeric", month: "short", year: "numeric" })}</span>
                      <span className={`text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${STATUS_COLOR[m.status]}`}>{m.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-4">
              Last updated {formatDate(config.updatedAt, { day: "numeric", month: "short", year: "numeric" })} by {config.updatedBy}
            </p>
          </div>
        </div>
      )}

      {/* ══════════════════ TAB 2: PHASE PLAN ══════════════════ */}
      {tab === "gantt" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Phase Plan</h2>
            <p className="text-xs text-gray-400 mt-0.5">All development phases, tasks, and owners</p>
          </div>

          {/* Gantt overview bar */}
          {(() => {
            const projectStartMs = new Date(config.projectStart).getTime();
            const projectEndMs = new Date(config.projectEnd).getTime();
            const totalMs = projectEndMs - projectStartMs;
            const todayPct = clamp(((new Date(today).getTime() - projectStartMs) / totalMs) * 100, 0, 100);

            return (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 overflow-x-auto">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-gray-800">Timeline Overview</h3>
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-red-500 bg-red-50 px-3 py-1 rounded-full border border-red-100">
                    <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                    Today &mdash; {formatDate(today, { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-6">
                  {formatDate(config.projectStart, { month: "short", year: "numeric" })} → {formatDate(config.projectEnd, { month: "short", year: "numeric" })}
                </p>

                {/* Month axis — constrained to the bar track column only */}
                <div className="relative mb-3 h-5" style={{ marginLeft: "calc(6rem + 0.75rem)", marginRight: "calc(9rem + 0.75rem)" }}>
                  {(() => {
                    const months: { label: string; pct: number }[] = [];
                    const end = new Date(config.projectEnd);
                    let cur = new Date(new Date(config.projectStart).getFullYear(), new Date(config.projectStart).getMonth(), 1);
                    while (cur <= end) {
                      months.push({ label: cur.toLocaleDateString("en-ZA", { month: "short", year: "2-digit" }), pct: clamp(((cur.getTime() - projectStartMs) / totalMs) * 100, 0, 100) });
                      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
                    }
                    return months.map((m) => (
                      <span key={m.label} className="absolute text-xs text-gray-400 -translate-x-1/2 whitespace-nowrap" style={{ left: `${m.pct}%` }}>{m.label}</span>
                    ));
                  })()}
                </div>

                {/* Phase bars + task rows */}
                <div className="relative min-w-[600px]">
                  {/* Today line — constrained to bar track column so it aligns with phase/task bars */}
                  <div className="absolute top-0 bottom-0 z-10 pointer-events-none" style={{ left: "calc(6rem + 0.75rem)", right: "calc(9rem + 0.75rem)" }}>
                    <div className="absolute top-0 bottom-0 w-px bg-red-400 opacity-50" style={{ left: `${todayPct}%` }} />
                  </div>

                  <div className="space-y-5">
                    {config.phases.map((phase, phaseIdx) => {
                      const color = PHASE_COLORS[phaseIdx % PHASE_COLORS.length];
                      const phaseLeft = clamp(((new Date(phase.start).getTime() - projectStartMs) / totalMs) * 100, 0, 100);
                      const phaseWidth = clamp(((new Date(phase.end).getTime() - new Date(phase.start).getTime()) / totalMs) * 100, 1, 100 - phaseLeft);

                      return (
                        <div key={phase.id}>
                          {/* Phase label + bar */}
                          <div className="flex items-center gap-3 mb-1.5">
                            <span className="text-xs font-bold text-gray-600 w-24 shrink-0">Phase {phase.id}</span>
                            <div className="flex-1 relative h-7 bg-gray-50 rounded-lg overflow-hidden">
                              <div className="absolute top-0 h-full rounded-lg flex items-center px-2"
                                style={{ left: `${phaseLeft}%`, width: `${phaseWidth}%`, backgroundColor: color + "33", borderLeft: `3px solid ${color}` }}>
                                <span className="text-xs font-semibold truncate" style={{ color }}>{phase.title}</span>
                              </div>
                            </div>
                            <span className="text-xs text-gray-400 w-36 shrink-0 text-right">
                              {formatDate(phase.start, { month: "short", day: "numeric" })} → {formatDate(phase.end, { month: "short", day: "numeric" })}
                            </span>
                          </div>

                          {/* Task rows — padding matches track column: w-24+gap-3 left, w-36+gap-3 right */}
                          <div className="space-y-0.5" style={{ paddingLeft: "calc(6rem + 0.75rem)", paddingRight: "calc(9rem + 0.75rem)" }}>
                            {phase.tasks.map((task) => {
                              const tLeft = clamp(((new Date(task.start).getTime() - projectStartMs) / totalMs) * 100, 0, 100);
                              const tWidth = clamp(((new Date(task.end).getTime() - new Date(task.start).getTime()) / totalMs) * 100, 0.5, 100 - tLeft);
                              const livePct = ptPctMap[task.id] ?? 0;
                              const tDone = livePct === 100;
                              const tActive = !tDone && new Date(task.start) <= new Date() && new Date(task.end) >= new Date();

                              return (
                                <div key={task.id} className="group relative h-6 cursor-pointer">
                                  <div className={`absolute top-0.5 h-5 rounded transition-all ${tDone ? "opacity-60" : tActive ? "opacity-100" : "opacity-40"}`}
                                    style={{ left: `${tLeft}%`, width: `${tWidth}%`, backgroundColor: color + (tDone ? "55" : tActive ? "88" : "33"), border: tActive ? `1.5px solid ${color}` : "none" }}>
                                    <span className="text-[10px] px-1.5 truncate block leading-5" style={{ color }}>{task.id} {task.title}</span>
                                  </div>
                                  <div className="absolute left-0 bottom-7 z-20 hidden group-hover:block bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-xl pointer-events-none">
                                    <p className="font-semibold">{task.id}: {task.title}</p>
                                    <p className="text-gray-300 mt-0.5">
                                      {formatDate(task.start)} → {formatDate(task.end)}
                                      <span className="ml-2 text-white font-semibold">{daysBetween(task.start, task.end)} days</span>
                                    </p>
                                    <p className="text-gray-400 mt-0.5">Owners: {task.owners.join(", ")}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    {/* Milestone markers — constrained to bar track column */}
                    <div className="relative h-8 border-t border-gray-100 pt-2" style={{ marginLeft: "calc(6rem + 0.75rem)", marginRight: "calc(9rem + 0.75rem)" }}>
                      {config.keyMilestones.map((m) => {
                        const mPct = clamp(((new Date(m.date).getTime() - projectStartMs) / totalMs) * 100, 0, 100);
                        return (
                          <div key={m.title + m.date} className="group absolute flex flex-col items-center" style={{ left: `${mPct}%` }}>
                            <div className={`w-2.5 h-2.5 rounded-full border-2 border-white shadow ${STATUS_DOT[m.status]}`} />
                            <div className="absolute top-5 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-900 text-white text-[10px] rounded-lg px-2 py-1.5 whitespace-nowrap shadow-xl z-20 pointer-events-none">
                              <p className="font-semibold">{m.title}</p>
                              <p className="text-gray-300">{formatDate(m.date, { day: "numeric", month: "short", year: "numeric" })}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Phase detail tables */}
          {config.phases.map((phase, phaseIdx) => {
            const color = PHASE_COLORS[phaseIdx % PHASE_COLORS.length];
            return (
              <div key={phase.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden" style={{ borderLeftWidth: 4, borderLeftColor: color }}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  <div>
                    <h3 className="font-bold text-gray-800">{phase.title}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(phase.start)} → {formatDate(phase.end)}</p>
                  </div>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ backgroundColor: color + "22", color }}>{phase.tasks.length} tasks</span>
                </div>
                <div className="divide-y divide-gray-50">
                  <div className="grid grid-cols-[60px_1fr_110px_110px_1fr] gap-4 px-6 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    <span>ID</span><span>Task</span><span>Start</span><span>End</span><span>Owners</span>
                  </div>
                  {phase.tasks.map((task) => {
                    const tActive = new Date(task.start) <= new Date() && new Date(task.end) >= new Date();
                    const livePct = ptPctMap[task.id] ?? 0;
                    const isFullyDone = livePct === 100;
                    const hasProgress = livePct > 0 && livePct < 100;
                    return (
                      <div key={task.id} className={`grid grid-cols-[60px_1fr_110px_110px_1fr] gap-4 px-6 py-3 text-sm items-center transition hover:bg-gray-50 ${tActive && !isFullyDone ? "bg-blue-50/40" : ""}`}>
                        <span className="font-mono text-xs font-bold" style={{ color }}>{task.id}</span>
                        <span className={`font-medium ${isFullyDone ? "text-gray-400 line-through" : "text-gray-800"}`}>{task.title}</span>
                        <span className="text-xs text-gray-500">{formatDate(task.start, { day: "numeric", month: "short" })}</span>
                        <span className="text-xs text-gray-500">{formatDate(task.end, { day: "numeric", month: "short" })}</span>
                        <div className="flex items-center gap-1 flex-wrap">
                          {task.owners.map((o) => <span key={o} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{o}</span>)}
                          {isFullyDone && <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600 font-semibold">Done</span>}
                          {hasProgress && !isFullyDone && <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-semibold">{livePct}% done</span>}
                          {!isFullyDone && !hasProgress && tActive && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">Active</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

        </div>
      )}

      {/* ══════════════════ TAB 3: LIVE PROGRESS ══════════════════ */}
      {tab === "milestones" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Live Task Progress</h2>
            <p className="text-xs text-gray-400 mt-0.5">Approved subtask completion grouped by milestone</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="font-bold text-gray-800 mb-1 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-indigo-500" />Task Progress by Milestone
            </h3>
            <p className="text-xs text-gray-400 mb-5">Auto-updated from approved subtasks</p>
            {orderedMilestoneEntries.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No tasks assigned yet</p>
            ) : (
              <div className="relative">
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-100" />
                <div className="space-y-6">
                  {orderedMilestoneEntries.map(({ key: name, tasks: groupTasks, planTaskId }) => {
                    const data = milestones[name];
                    if (!data) return null;
                    const pct = data.total > 0 ? Math.round((data.done / data.total) * 100) : 0;
                    const isComplete = pct === 100;
                    return (
                      <div key={name} className="relative pl-14">
                        <div className={`absolute left-4 top-5 w-5 h-5 rounded-full border-2 flex items-center justify-center ${isComplete ? "bg-green-500 border-green-500" : "bg-white border-indigo-400"}`}>
                          {isComplete && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                        </div>
                        <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <span className="text-xs text-gray-400 uppercase tracking-wider">
                                {planTaskId ? `Plan ${planTaskId}` : "Milestone"}
                              </span>
                              <h4 className="text-sm font-bold mt-0.5 text-gray-800">{name}</h4>
                            </div>
                            <span className={`text-sm font-bold px-2.5 py-1 rounded-full ${isComplete ? "bg-green-50 text-green-700" : pct > 50 ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>{pct}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                            <div className={`h-2 rounded-full transition-all duration-500 ${isComplete ? "bg-green-500" : "bg-indigo-500"}`} style={{ width: `${pct}%` }} />
                          </div>
                          <button type="button"
                            onClick={() => setExpandedMilestones((prev) => {
                              const next = new Set(prev);
                              if (next.has(name)) next.delete(name); else next.add(name);
                              return next;
                            })}
                            className="flex items-center gap-2 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition">
                            <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${expandedMilestones.has(name) ? "rotate-180" : ""}`} />
                            {expandedMilestones.has(name) ? "Hide" : "Show"} tasks ({data.tasks.length})
                          </button>
                          {expandedMilestones.has(name) && (
                            <div className="space-y-2 mt-3">
                              {data.tasks.map((task) => {
                                const tDone = task.subtasks.filter((s) => isEffectivelyDone(task.id, s)).length;
                                const tTotal = task.subtasks.length;
                                return (
                                  <div key={task.id} className="bg-white rounded-lg p-3 border border-gray-100">
                                    <div className="flex items-center justify-between mb-2">
                                      <p className="text-xs font-semibold text-gray-700">{task.title}</p>
                                      <span className="text-xs text-gray-400">{tDone}/{tTotal}</span>
                                    </div>
                                    <div className="space-y-1">
                                      {task.subtasks.map((sub) => (
                                        <div key={sub.id} className="flex items-center gap-2 text-xs">
                                          {isEffectivelyDone(task.id, sub)
                                            ? <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                                            : <Circle className="h-3 w-3 text-gray-300 shrink-0" />}
                                          <span className={isEffectivelyDone(task.id, sub) ? "text-gray-400 line-through" : "text-gray-600"}>{sub.title}</span>
                                          <span className="ml-auto text-gray-400 shrink-0">{sub.assigneeName}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showEdit && isManager && (
        <EditMilestonesModal config={config} onSave={handleSaveConfig} onClose={() => setShowEdit(false)} />
      )}
    </div>
  );
}
