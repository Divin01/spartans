"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  getTasks,
  getUsers,
  getReviews,
  getActivityLogs,
  getDeposits,
} from "@/lib/firestore";
import type { Task, User, Review, ActivityLog, Deposit } from "@/lib/types";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  ReferenceLine,
} from "recharts";
import {
  ListTodo,
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
  Target,
  Wallet,
  RefreshCw,
  Users,
  Activity,
} from "lucide-react";

// ── SVG Progress Ring ─────────────────────────────────────────────────────────
function ProgressRing({ pct, size = 140 }: { pct: number; size?: number }) {
  const r = size * 0.386;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const cx = size / 2;
  const cy = size / 2;
  const strokeW = size * 0.086;
  const color = pct >= 75 ? "#22c55e" : pct >= 40 ? "#6366f1" : "#f59e0b";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth={strokeW} />
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeW}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={circ / 4}
        style={{ transition: "stroke-dasharray 1s ease" }}
      />
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize={size * 0.157} fontWeight="700" fill="#1f2937">
        {pct}%
      </text>
      <text x={cx} y={cy + size * 0.115} textAnchor="middle" fontSize={size * 0.071} fill="#9ca3af">
        complete
      </text>
    </svg>
  );
}

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  fontSize: 12,
  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  async function load() {
    setLoading(true);
    const [t, u, r, a, d] = await Promise.all([
      getTasks(), getUsers(), getReviews(), getActivityLogs(), getDeposits(),
    ]);
    setTasks(t); setUsers(u); setReviews(r); setActivityLogs(a); setDeposits(d);
    setLastUpdated(new Date());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function isApproved(taskId: string, sub: { assigneeId: string; completed: boolean }) {
    if (!sub.completed) return false;
    return reviews.some(
      (r) => r.taskId === taskId && r.requesterId === sub.assigneeId && r.status === "approved"
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // ── Core stats ────────────────────────────────────────────────────────────
  const totalSubtasks = tasks.reduce((a, t) => a + t.subtasks.length, 0);
  const completedSubtasks = tasks.reduce(
    (a, t) => a + t.subtasks.filter((s) => isApproved(t.id, s)).length, 0
  );
  const progress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;
  const mySubtasks = tasks.reduce(
    (a, t) => a + t.subtasks.filter((s) => s.assigneeId === user?.id).length, 0
  );
  const myCompleted = tasks.reduce(
    (a, t) => a + t.subtasks.filter((s) => s.assigneeId === user?.id && isApproved(t.id, s)).length, 0
  );
  const myPct = mySubtasks > 0 ? Math.round((myCompleted / mySubtasks) * 100) : 0;
  const pendingReviews = reviews.filter((r) => r.status === "pending").length;
  const approvedReviews = reviews.filter((r) => r.status === "approved").length;

  // ── Chart 1: Milestone progress ───────────────────────────────────────────
  const milestones = [...new Set(tasks.map((t) => t.milestone))].filter(Boolean);
  const milestoneData = milestones.map((m) => {
    const mTasks = tasks.filter((t) => t.milestone === m);
    const total = mTasks.reduce((a, t) => a + t.subtasks.length, 0);
    const done = mTasks.reduce((a, t) => a + t.subtasks.filter((s) => isApproved(t.id, s)).length, 0);
    return {
      name: m.length > 22 ? m.slice(0, 20) + "…" : m,
      Total: total,
      Approved: done,
      pct: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  });

  // ── Chart 2: Activity timeline (last 8 weeks) ─────────────────────────────
  const now = new Date();
  const weeklyData = Array.from({ length: 8 }, (_, i) => {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7 * (7 - i));
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const label = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const inRange = (ts: string) => { const d = new Date(ts); return d >= weekStart && d < weekEnd; };
    return {
      week: label,
      Submissions: activityLogs.filter((l) => l.type === "submitted" && inRange(l.timestamp)).length,
      Approvals: activityLogs.filter((l) => l.type === "approved" && inRange(l.timestamp)).length,
    };
  });

  // ── Chart 3: Cumulative completion ────────────────────────────────────────
  const sortedApprovals = [...activityLogs]
    .filter((l) => l.type === "approved")
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  let cumulative = 0;
  const cumulativeData = sortedApprovals.reduce<{ date: string; Completed: number; Target: number }[]>(
    (acc, l) => {
      cumulative++;
      const date = new Date(l.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const last = acc[acc.length - 1];
      if (last && last.date === date) { last.Completed = cumulative; }
      else { acc.push({ date, Completed: cumulative, Target: totalSubtasks }); }
      return acc;
    }, []
  );
  const today = now.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (cumulativeData.length > 0 && cumulativeData[cumulativeData.length - 1].date !== today) {
    cumulativeData.push({ date: today, Completed: cumulative, Target: totalSubtasks });
  }

  // ── Chart 4: Review status pie ────────────────────────────────────────────
  const reviewPie = [
    { name: "Approved", value: approvedReviews, fill: "#22c55e" },
    { name: "Pending", value: pendingReviews, fill: "#f59e0b" },
    { name: "Not Approved", value: reviews.filter((r) => r.status === "not-approved").length, fill: "#ef4444" },
  ].filter((d) => d.value > 0);

  // ── Chart 5: Per-member progress ──────────────────────────────────────────
  const memberData = users
    .filter((u) => u.role === "member")
    .map((u) => {
      const total = tasks.reduce((a, t) => a + t.subtasks.filter((s) => s.assigneeId === u.id).length, 0);
      const done = tasks.reduce((a, t) => a + t.subtasks.filter((s) => s.assigneeId === u.id && isApproved(t.id, s)).length, 0);
      return { id: u.id, name: u.name.split(" ")[0], fullName: u.name, Total: total, Done: done, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
    })
    .sort((a, b) => b.pct - a.pct);

  // ── Chart 6: Finance per-member ───────────────────────────────────────────
  const financeData = users
    .filter((u) => u.role === "member")
    .map((u) => {
      const approved = deposits.filter((d) => d.userId === u.id && d.status === "approved").reduce((s, d) => s + d.amount, 0);
      const pending = deposits.filter((d) => d.userId === u.id && d.status === "pending").reduce((s, d) => s + d.amount, 0);
      return { name: u.name.split(" ")[0], Approved: approved, Pending: pending };
    });
  const totalDeposited = deposits.filter((d) => d.status === "approved").reduce((s, d) => s + d.amount, 0);
  const pendingDeposits = deposits.filter((d) => d.status === "pending").reduce((s, d) => s + d.amount, 0);
  const hasFinanceData = financeData.some((d) => d.Approved > 0 || d.Pending > 0);
  const hasCumulative = cumulativeData.length > 1;

  return (
    <div className="space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.name?.split(" ")[0]}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Project Analytics &nbsp;·&nbsp; Last updated{" "}
            {lastUpdated.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 active:scale-95 transition"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Tasks", value: tasks.length, sub: `${totalSubtasks} subtasks`, icon: ListTodo, accent: "text-blue-600", bg: "bg-blue-50" },
          { label: "Completed", value: `${completedSubtasks} / ${totalSubtasks}`, sub: `${progress}% overall done`, icon: CheckCircle2, accent: "text-green-600", bg: "bg-green-50" },
          { label: "Pending Reviews", value: pendingReviews, sub: `${approvedReviews} approved`, icon: AlertCircle, accent: "text-amber-600", bg: "bg-amber-50" },
          { label: "My Progress", value: `${myCompleted} / ${mySubtasks}`, sub: mySubtasks > 0 ? `${myPct}% of my tasks` : "No tasks assigned", icon: Target, accent: "text-indigo-600", bg: "bg-indigo-50" },
        ].map(({ label, value, sub, icon: Icon, accent, bg }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-sm transition">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">{label}</span>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bg}`}>
                <Icon className={`h-5 w-5 ${accent}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
            <p className="text-xs text-gray-400 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Row 1: Milestone bars + Overall donut ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-5">
            <span className="w-1.5 h-5 bg-indigo-600 rounded-full inline-block" />
            <h3 className="font-semibold text-gray-900">Progress by Milestone</h3>
            <span className="ml-auto text-xs text-gray-400">{milestoneData.length} milestone{milestoneData.length !== 1 ? "s" : ""}</span>
          </div>
          {milestoneData.length === 0 ? (
            <div className="flex items-center justify-center h-52 text-gray-300">
              <div className="text-center"><ListTodo className="h-10 w-10 mx-auto mb-2 opacity-30" /><p className="text-sm">No milestone data yet</p></div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={milestoneData} barGap={6} barSize={18} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#f9fafb", radius: 6 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Total" fill="#e0e7ff" radius={[4, 4, 0, 0]} name="Total Subtasks" />
                <Bar dataKey="Approved" fill="#6366f1" radius={[4, 4, 0, 0]} name="Approved" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1.5 h-5 bg-green-500 rounded-full inline-block" />
            <h3 className="font-semibold text-gray-900">Overall Progress</h3>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center">
            <ProgressRing pct={progress} size={148} />
            <p className="text-xs text-gray-500 mt-3 text-center">{completedSubtasks} of {totalSubtasks} subtasks approved</p>
          </div>
          <div className="mt-5 space-y-2.5">
            {milestoneData.slice(0, 4).map((m) => (
              <div key={m.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500 truncate max-w-[65%]">{m.name}</span>
                  <span className="text-xs font-semibold text-gray-700">{m.pct}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${m.pct}%`, background: m.pct >= 75 ? "#22c55e" : m.pct >= 40 ? "#6366f1" : "#f59e0b" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 2: Activity timeline + Review pie ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-5">
            <span className="w-1.5 h-5 bg-blue-500 rounded-full inline-block" />
            <h3 className="font-semibold text-gray-900">Activity Timeline</h3>
            <span className="ml-auto text-xs text-gray-400">Last 8 weeks</span>
          </div>
          {activityLogs.length === 0 ? (
            <div className="flex items-center justify-center h-52 text-gray-300">
              <div className="text-center"><Activity className="h-10 w-10 mx-auto mb-2 opacity-30" /><p className="text-sm">No activity recorded yet</p></div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={weeklyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradS" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="Submissions" stroke="#6366f1" strokeWidth={2} fill="url(#gradS)" dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
                <Area type="monotone" dataKey="Approvals" stroke="#22c55e" strokeWidth={2} fill="url(#gradA)" dot={{ r: 3, fill: "#22c55e", strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-5">
            <span className="w-1.5 h-5 bg-amber-500 rounded-full inline-block" />
            <h3 className="font-semibold text-gray-900">Review Status</h3>
          </div>
          {reviews.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-300">
              <div className="text-center"><AlertCircle className="h-10 w-10 mx-auto mb-2 opacity-30" /><p className="text-sm">No reviews yet</p></div>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={reviewPie} cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={3} dataKey="value" startAngle={90} endAngle={-270}>
                    {reviewPie.map((entry, i) => <Cell key={i} fill={entry.fill} stroke="none" />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-2.5">
                {[{ label: "Approved", color: "#22c55e" }, { label: "Pending", color: "#f59e0b" }, { label: "Not Approved", color: "#ef4444" }].map(({ label, color }) => {
                  const d = reviewPie.find((p) => p.name === label);
                  if (!d) return null;
                  const total = reviewPie.reduce((a, p) => a + p.value, 0);
                  const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
                  return (
                    <div key={label} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                        <span className="text-gray-600 text-xs">{label}</span>
                      </span>
                      <span className="font-semibold text-gray-800 text-xs tabular-nums">
                        {d.value} <span className="text-gray-400 font-normal">({pct}%)</span>
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                <p className="text-xs text-gray-400">{reviews.length} total reviews submitted</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Row 3: Member progress + Finance ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-5">
            <span className="w-1.5 h-5 bg-purple-500 rounded-full inline-block" />
            <h3 className="font-semibold text-gray-900">Team Member Progress</h3>
          </div>
          {memberData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-300">
              <div className="text-center"><Users className="h-10 w-10 mx-auto mb-2 opacity-30" /><p className="text-sm">No member data</p></div>
            </div>
          ) : (
            <div className="space-y-5">
              {memberData.map((m) => (
                <div key={m.id}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
                        {m.name[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{m.fullName}</p>
                        <p className="text-xs text-gray-400">{m.Done} of {m.Total} subtasks approved</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold tabular-nums" style={{ color: m.pct >= 75 ? "#22c55e" : m.pct >= 40 ? "#6366f1" : "#f59e0b" }}>
                      {m.pct}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${m.pct}%`, background: m.pct >= 75 ? "#22c55e" : m.pct >= 40 ? "#6366f1" : "#f59e0b" }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-5 bg-green-500 rounded-full inline-block" />
            <h3 className="font-semibold text-gray-900">Finance Snapshot</h3>
          </div>
          <p className="text-xs text-gray-400 mb-4 ml-4">Deposits per member</p>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-green-50 rounded-xl p-3">
              <p className="text-xs text-green-700 font-medium mb-0.5">Cleared</p>
              <p className="text-lg font-bold text-green-700 tabular-nums">R{totalDeposited.toLocaleString()}</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-3">
              <p className="text-xs text-amber-700 font-medium mb-0.5">Pending</p>
              <p className="text-lg font-bold text-amber-700 tabular-nums">R{pendingDeposits.toLocaleString()}</p>
            </div>
          </div>
          {!hasFinanceData ? (
            <div className="flex items-center justify-center h-28 text-gray-300">
              <div className="text-center"><Wallet className="h-10 w-10 mx-auto mb-2 opacity-30" /><p className="text-sm">No deposit data yet</p></div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={financeData} barGap={6} barSize={22} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => `R${v}`} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#f9fafb" }} formatter={(v) => typeof v === "number" ? `R${v.toLocaleString()}` : v} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Approved" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Pending" fill="#fbbf24" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Cumulative completion line chart ────────────────────────────────── */}
      {hasCumulative && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-5 bg-indigo-500 rounded-full inline-block" />
            <h3 className="font-semibold text-gray-900">Cumulative Completion</h3>
            <span className="ml-auto text-xs text-gray-400">Actual approvals vs project target</span>
          </div>
          <p className="text-xs text-gray-400 mb-5 ml-4">
            Target line shows <span className="font-medium text-gray-600">{totalSubtasks} subtasks</span>
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={cumulativeData} margin={{ top: 0, right: 24, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} domain={[0, totalSubtasks > 0 ? totalSubtasks + 1 : 10]} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <ReferenceLine y={totalSubtasks} stroke="#e5e7eb" strokeDasharray="6 3" strokeWidth={1.5}
                label={{ value: "Target", position: "right", fontSize: 10, fill: "#9ca3af" }} />
              <Line type="monotone" dataKey="Completed" stroke="#6366f1" strokeWidth={2.5} dot={false}
                activeDot={{ r: 5, strokeWidth: 0 }} name="Approvals (cumulative)" />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
            <span>{completedSubtasks < totalSubtasks ? `${totalSubtasks - completedSubtasks} subtasks remaining` : "All subtasks completed 🎉"}</span>
            <span className="font-medium text-indigo-600">{progress}% done</span>
          </div>
        </div>
      )}

      {/* ── Recent Activity ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-5">
          <span className="w-1.5 h-5 bg-gray-400 rounded-full inline-block" />
          <h3 className="font-semibold text-gray-900">Recent Activity</h3>
          <span className="ml-auto text-xs text-gray-400">{activityLogs.length} total events</span>
        </div>
        {activityLogs.length === 0 ? (
          <p className="text-sm text-gray-400">No activity yet.</p>
        ) : (
          <div className="space-y-3">
            {activityLogs.slice(0, 8).map((log) => (
              <div key={log.id} className="flex items-start gap-3 text-sm">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${log.type === "approved" ? "bg-green-100" : "bg-amber-100"}`}>
                  {log.type === "approved"
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                    : <Clock className="h-3.5 w-3.5 text-amber-600" />}
                </div>
                <div className="min-w-0 flex-1">
                  {log.type === "approved" ? (
                    <p className="text-gray-700 leading-snug">
                      <span className="font-medium">{log.userName}</span> completed{" "}
                      <span className="font-medium text-gray-900">&ldquo;{log.taskTitle}&rdquo;</span>{" "}
                      — approved by <span className="font-medium">{log.reviewerName}</span>
                    </p>
                  ) : (
                    <p className="text-gray-700 leading-snug">
                      <span className="font-medium">{log.userName}</span> submitted{" "}
                      <span className="font-medium text-gray-900">&ldquo;{log.taskTitle}&rdquo;</span>{" "}
                      for review
                    </p>
                  )}
                  <p className="text-gray-400 text-xs mt-0.5">
                    {log.milestone} &middot;{" "}
                    {new Date(log.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}{" "}
                    at{" "}
                    {new Date(log.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
