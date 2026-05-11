"use client";

import { useEffect, useState, useMemo } from "react";
import { getTasks, getReviews, getProjectConfig, saveProjectConfig } from "@/lib/firestore";
import { useAuth } from "@/lib/auth-context";
import type { Task, Review, ProjectConfig, Phase, KeyMilestone } from "@/lib/types";
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
const DEFAULT_CONFIG: ProjectConfig = {
  projectStart: "2026-04-02",
  projectEnd: "2026-10-15",
  totalPlannedTasks: 32,
  keyMilestones: [
    { title: "Project Kick-off & Scope Sign-off", date: "2026-04-02", status: "done" },
    { title: "Platform Development Start (Phase 4)", date: "2026-04-02", status: "active" },
    { title: "Cloud Deployment Live (Phase 8.1)", date: "2026-05-15", status: "upcoming" },
    { title: "Analytics & Reporting Complete (Phase 5)", date: "2026-06-01", status: "upcoming" },
    { title: "System Testing Start (Phase 7)", date: "2026-08-01", status: "upcoming" },
    { title: "UAT Completion", date: "2026-09-01", status: "upcoming" },
    { title: "Documentation & Pitch Deck Final", date: "2026-10-14", status: "upcoming" },
    { title: "INVESTOR PITCH", date: "2026-10-15", status: "target" },
  ],
  phases: [
    {
      id: "4",
      title: "Phase 4: Platform Development",
      start: "2026-04-03",
      end: "2026-08-09",
      tasks: [
        { id: "4.1", title: "User Authentication & Access Control", start: "2026-04-03", end: "2026-04-13", owners: ["Daniel", "Emmanuel S.", "Natalie", "Emza"] },
        { id: "4.2", title: "Event Management Module", start: "2026-04-03", end: "2026-04-27", owners: ["All Members"] },
        { id: "4.3", title: "EMS Marketplace & Procurement", start: "2026-04-24", end: "2026-05-11", owners: ["All Members"] },
        { id: "4.4", title: "Risk Prediction Engine (ML)", start: "2026-05-13", end: "2026-07-31", owners: ["Emmanuel S."] },
        { id: "4.5", title: "Real-Time on-site Event Monitoring (Mobile)", start: "2026-05-17", end: "2026-07-20", owners: ["All Members"] },
        { id: "4.6", title: "IOT Design Systems & Integration", start: "2026-05-25", end: "2026-07-20", owners: ["Daniel", "Divin"] },
        { id: "4.7", title: "GIS & Event Simulation Module", start: "2026-07-21", end: "2026-07-31", owners: ["Natalie", "Daniel"] },
        { id: "4.8", title: "Notification & Messaging System", start: "2026-07-21", end: "2026-08-09", owners: ["Divin"] },
        { id: "4.9", title: "Compliance Management Module", start: "2026-07-21", end: "2026-07-31", owners: ["Emza"] },
        { id: "4.10", title: "Payment & Financial System", start: "2026-07-21", end: "2026-07-31", owners: ["Emmanuel S."] },
      ],
    },
    {
      id: "5",
      title: "Phase 5: Analytics & Reporting",
      start: "2026-06-01",
      end: "2026-07-31",
      tasks: [
        { id: "5.1", title: "Event Analytics Dashboard", start: "2026-06-01", end: "2026-07-31", owners: ["Emmanuel S."] },
        { id: "5.2", title: "Post-Event Report Generation", start: "2026-06-01", end: "2026-07-31", owners: ["Emmanuel S."] },
      ],
    },
    {
      id: "7",
      title: "Phase 7: System Testing",
      start: "2026-08-01",
      end: "2026-09-30",
      tasks: [
        { id: "7.1", title: "Unit & Integration Testing", start: "2026-08-01", end: "2026-08-31", owners: ["All Members"] },
        { id: "7.2", title: "System, Security & Performance Testing", start: "2026-09-01", end: "2026-09-19", owners: ["All Members", "Stakeholders"] },
        { id: "7.3", title: "User Acceptance Testing (UAT)", start: "2026-09-01", end: "2026-09-30", owners: ["All Members", "Stakeholders"] },
      ],
    },
    {
      id: "8",
      title: "Phase 8: Deployment & Pitch Preparation",
      start: "2026-05-15",
      end: "2026-10-15",
      tasks: [
        { id: "8.1", title: "Cloud Deployment (Continuous)", start: "2026-05-15", end: "2026-10-01", owners: ["Divin", "Emmanuel S.", "Daniel"] },
        { id: "8.2", title: "Documentation & Final Pitch Prep", start: "2026-08-24", end: "2026-10-15", owners: ["All Members"] },
      ],
    },
  ],
  updatedAt: new Date().toISOString(),
  updatedBy: "system",
};

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
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-lg min-w-[160px] text-xs">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 mb-1">
          <span className="flex items-center gap-1.5 text-gray-500">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="font-semibold text-gray-700">{p.value != null ? `${p.value} tasks` : "—"}</span>
        </div>
      ))}
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
  const [projectStart, setProjectStart] = useState(config.projectStart);
  const [projectEnd, setProjectEnd] = useState(config.projectEnd);
  const [totalPlanned, setTotalPlanned] = useState(config.totalPlannedTasks);
  const [saving, setSaving] = useState(false);

  function updateMilestone(i: number, field: keyof KeyMilestone, value: string) {
    setMilestones((prev) => prev.map((m, idx) => idx === i ? { ...m, [field]: value } : m));
  }

  async function handleSave() {
    setSaving(true);
    await onSave({ ...config, projectStart, projectEnd, totalPlannedTasks: totalPlanned, keyMilestones: milestones, updatedAt: new Date().toISOString() });
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
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
          <div className="grid grid-cols-3 gap-4">
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
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Total Planned Tasks</label>
              <input type="number" min={1} value={totalPlanned} onChange={(e) => setTotalPlanned(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

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
  const [tab, setTab] = useState<"burndown" | "gantt">("burndown");
  const [burndownView, setBurndownView] = useState<"full" | "month" | "week">("full");
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    Promise.all([getTasks(), getReviews(), getProjectConfig()]).then(([t, r, cfg]) => {
      setTasks(t);
      setReviews(r);
      if (cfg) setConfig(cfg);
      setLoading(false);
    });
  }, []);

  async function handleSaveConfig(updated: ProjectConfig) {
    const withUser = { ...updated, updatedBy: user?.name ?? "PM", updatedAt: new Date().toISOString() };
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
  const burndownData = useMemo(() => {
    const { projectStart, projectEnd, totalPlannedTasks } = config;
    const totalDays = daysBetween(projectStart, projectEnd);
    if (totalDays <= 0) return [];

    const completionsByDate: Record<string, number> = {};
    tasks.forEach((task) => {
      task.subtasks.forEach((sub) => {
        if (isEffectivelyDone(task.id, sub) && sub.completedAt) {
          const d = sub.completedAt.slice(0, 10);
          completionsByDate[d] = (completionsByDate[d] ?? 0) + 1;
        }
      });
    });

    const today = new Date().toISOString().slice(0, 10);
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
    const sortedDates = Object.keys(completionsByDate).sort();
    const points: { label: string; date: string; planned: number; actual: number | null; projection: number | null }[] = [];
    let lastKnownActual = totalPlannedTasks;
    let lastKnownIdx = -1;

    for (let i = 0; i <= rangeDays; i += stepDays) {
      const date = addDays(startDate, Math.min(i, rangeDays));
      const dayFromStart = daysBetween(projectStart, date);
      const totalProjectDays = daysBetween(projectStart, projectEnd);
      const planned = Math.max(0, Math.round(totalPlannedTasks - (totalPlannedTasks * dayFromStart / totalProjectDays)));

      let actualAtDate = totalPlannedTasks;
      sortedDates.forEach((d) => { if (d <= date) actualAtDate -= completionsByDate[d]; });
      actualAtDate = Math.max(0, actualAtDate);

      const isPast = date <= today;
      const label = burndownView === "full"
        ? formatDate(date, { month: "short", year: "numeric" })
        : formatDate(date, { day: "numeric", month: "short" });

      if (isPast) { lastKnownActual = actualAtDate; lastKnownIdx = points.length; }

      points.push({ label, date, planned, actual: isPast ? actualAtDate : null, projection: null });
    }

    if (lastKnownIdx >= 0 && lastKnownIdx < points.length - 1) {
      const remaining = points.length - 1 - lastKnownIdx;
      const burnPerStep = remaining > 0 ? lastKnownActual / remaining : 0;
      for (let j = lastKnownIdx; j < points.length; j++) {
        points[j].projection = Math.max(0, Math.round(lastKnownActual - burnPerStep * (j - lastKnownIdx)));
      }
    }

    return points;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, reviews, config, burndownView]);

  // ── Milestone progress from live tasks ───────────────────
  const milestones = useMemo(() => {
    return tasks.reduce<Record<string, { tasks: Task[]; done: number; total: number }>>(
      (acc, t) => {
        const key = t.milestone || "Uncategorized";
        if (!acc[key]) acc[key] = { tasks: [], done: 0, total: 0 };
        acc[key].tasks.push(t);
        acc[key].total += t.subtasks.length;
        acc[key].done += t.subtasks.filter((s) => isEffectivelyDone(t.id, s)).length;
        return acc;
      }, {}
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, reviews]);

  // ── KPIs ─────────────────────────────────────────────────
  const totalSubtasks = tasks.reduce((s, t) => s + t.subtasks.length, 0);
  const doneSubtasks = tasks.reduce((s, t) => s + t.subtasks.filter((sub) => isEffectivelyDone(t.id, sub)).length, 0);
  const overallPct = totalSubtasks > 0 ? Math.round((doneSubtasks / totalSubtasks) * 100) : 0;
  const today = new Date().toISOString().slice(0, 10);
  const daysElapsed = Math.max(0, daysBetween(config.projectStart, today));
  const totalDays = daysBetween(config.projectStart, config.projectEnd);
  const timeElapsedPct = Math.min(100, Math.round((daysElapsed / totalDays) * 100));
  const daysLeft = Math.max(0, daysBetween(today, config.projectEnd));

  // Schedule-based overall progress: for every planned phase task, calculate
  // how far through its scheduled window today is (0–100%), weighted by duration.
  // Past-deadline tasks automatically contribute 100%, future tasks 0%.
  const scheduleProgress = useMemo(() => {
    const now = Date.now();
    let totalWeight = 0;
    let weightedProgress = 0;
    config.phases.forEach((phase) => {
      phase.tasks.forEach((task) => {
        const start = new Date(task.start).getTime();
        const end = new Date(task.end).getTime();
        const duration = Math.max(1, end - start);
        const elapsed = clamp((now - start) / duration, 0, 1);
        weightedProgress += elapsed * duration;
        totalWeight += duration;
      });
    });
    return totalWeight > 0 ? Math.round((weightedProgress / totalWeight) * 100) : 0;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  // On-track: actual approved work vs what the schedule says should be done by now
  const onTrack = overallPct >= scheduleProgress;

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
              <p className="text-2xl font-bold text-gray-900 leading-tight">{scheduleProgress}%</p>
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
            <div
              className="h-1.5 rounded-full bg-indigo-500 transition-all duration-700"
              style={{ width: `${scheduleProgress}%` }}
            />
          </div>
          <p className="text-xs text-gray-400">
            Schedule-based · {overallPct}% tasks approved ({doneSubtasks}/{totalSubtasks})
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
        <div className={`bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4`}>
          <div className={`${onTrack ? "bg-green-50" : "bg-red-50"} rounded-xl p-2.5 shrink-0`}>
            <TrendingDown className={`h-5 w-5 ${onTrack ? "text-green-600" : "text-red-500"}`} />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Status</p>
            <p className={`text-xl font-bold leading-tight ${onTrack ? "text-green-600" : "text-red-500"}`}>
              {onTrack ? "On Track" : "Behind"}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {overallPct}% done · {scheduleProgress}% due
            </p>
          </div>
        </div>

        {/* Countdown to Pitch */}
        <div className="bg-white rounded-2xl border border-amber-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-amber-50 rounded-xl p-2 shrink-0">
              <Target className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Investor Pitch</p>
              <p className="text-[10px] text-amber-600 font-semibold">{formatDate(config.projectEnd)}</p>
            </div>
          </div>
          {countdown.days === 0 && countdown.hours === 0 && countdown.mins === 0 && countdown.secs === 0 ? (
            <p className="text-sm font-bold text-amber-600">Pitch day! 🎯</p>
          ) : (
            <div className="grid grid-cols-4 gap-1">
              {[
                { v: countdown.days, u: "days" },
                { v: countdown.hours, u: "hours" },
                { v: countdown.mins, u: "mins" },
                { v: countdown.secs, u: "sec" },
              ].map(({ v, u }) => (
                <div key={u} className="flex flex-col items-center bg-amber-50 rounded-lg py-1.5">
                  <span className="text-base font-bold text-amber-700 tabular-nums leading-none">
                    {String(v).padStart(2, "0")}
                  </span>
                  <span className="text-[9px] text-amber-500 font-semibold uppercase tracking-wide mt-0.5">{u}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(["burndown", "gantt"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition ${tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {t === "burndown" ? <TrendingDown className="h-4 w-4" /> : <CalendarDays className="h-4 w-4" />}
            {t === "burndown" ? "Burndown Chart" : "Phase Plan"}
          </button>
        ))}
      </div>

      {/* ══════════════════ TAB 1: BURNDOWN ══════════════════ */}
      {tab === "burndown" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Burndown Analysis</h2>
              <p className="text-xs text-gray-400 mt-0.5">Remaining tasks — planned vs. actual vs. projected</p>
            </div>
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              {(["full", "month", "week"] as const).map((v) => (
                <button key={v} onClick={() => setBurndownView(v)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${burndownView === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                  {v === "full" ? "Full Project" : v === "month" ? "This Month" : "This Week"}
                </button>
              ))}
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center gap-6 mb-6 flex-wrap">
              {[
                { color: "#6366f1", label: "Planned (Ideal)", dash: false },
                { color: "#10b981", label: "Actual Burn", dash: false },
                { color: "#f59e0b", label: "Projection", dash: true },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-2">
                  <svg width="24" height="3"><line x1="0" y1="1.5" x2="24" y2="1.5" stroke={l.color} strokeWidth="2.5" strokeDasharray={l.dash ? "4 3" : "0"} /></svg>
                  <span className="text-xs text-gray-500">{l.label}</span>
                </div>
              ))}
              <span className="ml-auto text-xs text-gray-400">Auto-updates as tasks are approved</span>
            </div>

            {burndownData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No data for this period</div>
            ) : (
              <ResponsiveContainer width="100%" height={380}>
                <LineChart data={burndownData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                    label={{ value: "Remaining Tasks", angle: -90, position: "insideLeft", offset: 10, style: { fill: "#94a3b8", fontSize: 11 } }} />
                  <Tooltip content={<BurndownTooltip />} />
                  <ReferenceLine x={burndownData.find((d) => d.date === today)?.label}
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
                <h3 className="font-bold text-gray-800 mb-1">Timeline Overview</h3>
                <p className="text-xs text-gray-400 mb-6">
                  {formatDate(config.projectStart, { month: "short", year: "numeric" })} → {formatDate(config.projectEnd, { month: "short", year: "numeric" })}
                </p>

                {/* Month axis */}
                <div className="relative mb-3 h-5">
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
                  {/* Today line */}
                  <div className="absolute top-0 bottom-0 z-10 pointer-events-none" style={{ left: `${todayPct}%` }}>
                    <div className="w-px h-full bg-red-400 opacity-50" />
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

                          {/* Task rows */}
                          <div className="space-y-0.5 pl-[7.5rem] pr-[9.5rem]">
                            {phase.tasks.map((task) => {
                              const tLeft = clamp(((new Date(task.start).getTime() - projectStartMs) / totalMs) * 100, 0, 100);
                              const tWidth = clamp(((new Date(task.end).getTime() - new Date(task.start).getTime()) / totalMs) * 100, 0.5, 100 - tLeft);
                              const tDone = new Date(task.end) < new Date();
                              const tActive = new Date(task.start) <= new Date() && new Date(task.end) >= new Date();

                              return (
                                <div key={task.id} className="group relative h-6">
                                  <div className={`absolute top-0.5 h-5 rounded transition-all ${tDone ? "opacity-60" : tActive ? "opacity-100" : "opacity-40"}`}
                                    style={{ left: `${tLeft}%`, width: `${tWidth}%`, backgroundColor: color + (tDone ? "55" : tActive ? "88" : "33"), border: tActive ? `1.5px solid ${color}` : "none" }}>
                                    <span className="text-[10px] px-1.5 truncate block leading-5" style={{ color }}>{task.id} {task.title}</span>
                                  </div>
                                  <div className="absolute left-0 bottom-7 z-20 hidden group-hover:block bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-xl pointer-events-none">
                                    <p className="font-semibold">{task.id}: {task.title}</p>
                                    <p className="text-gray-300 mt-0.5">{formatDate(task.start)} → {formatDate(task.end)}</p>
                                    <p className="text-gray-400 mt-0.5">Owners: {task.owners.join(", ")}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    {/* Milestone markers */}
                    <div className="relative h-8 border-t border-gray-100 pt-2">
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
                <div className="mt-4 flex items-center gap-2 text-xs text-red-400">
                  <div className="w-4 h-px bg-red-400" />
                  Today ({formatDate(today, { day: "numeric", month: "short", year: "numeric" })})
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
                    const tDone = new Date(task.end) < new Date();
                    const tActive = new Date(task.start) <= new Date() && new Date(task.end) >= new Date();
                    return (
                      <div key={task.id} className={`grid grid-cols-[60px_1fr_110px_110px_1fr] gap-4 px-6 py-3 text-sm items-center transition hover:bg-gray-50 ${tActive ? "bg-blue-50/40" : ""}`}>
                        <span className="font-mono text-xs font-bold" style={{ color }}>{task.id}</span>
                        <span className={`font-medium ${tDone ? "text-gray-400 line-through" : "text-gray-800"}`}>{task.title}</span>
                        <span className="text-xs text-gray-500">{formatDate(task.start, { day: "numeric", month: "short" })}</span>
                        <span className="text-xs text-gray-500">{formatDate(task.end, { day: "numeric", month: "short" })}</span>
                        <div className="flex items-center gap-1 flex-wrap">
                          {task.owners.map((o) => <span key={o} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{o}</span>)}
                          {tActive && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">Active</span>}
                          {tDone && <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600 font-semibold">Done</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Live task progress by milestone */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="font-bold text-gray-800 mb-1 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-indigo-500" />Live Task Progress by Milestone
            </h3>
            <p className="text-xs text-gray-400 mb-5">Auto-updated from approved subtasks</p>
            {Object.keys(milestones).length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No tasks assigned yet</p>
            ) : (
              <div className="relative">
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-100" />
                <div className="space-y-6">
                  {Object.entries(milestones).map(([name, data], idx) => {
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
                              <span className="text-xs text-gray-400 uppercase tracking-wider">Milestone {idx + 1}</span>
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
