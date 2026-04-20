"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getUsers, getTasks, getReviews, createUser } from "@/lib/firestore";
import type { User, Task, Review } from "@/lib/types";
import { getUserColor, buildInitialsMap } from "@/lib/colors";
import {
  Loader2,
  Shield,
  UserIcon,
  CheckCircle2,
  Circle,
  ChevronDown,
  X,
  Plus,
} from "lucide-react";

export default function TeamPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());
  const [showAddUser, setShowAddUser] = useState(false);

  const isManager = user?.role === "manager";

  async function load() {
    const [u, t, r] = await Promise.all([getUsers(), getTasks(), getReviews()]);
    setUsers(u);
    setTasks(t);
    setReviews(r);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // Review-aware: subtask only counts as done if an approved review exists for that task+user
  function isEffectivelyDone(taskId: string, sub: { assigneeId: string; completed: boolean }) {
    if (!sub.completed) return false;
    const approvedReview = reviews.find(
      (r) => r.taskId === taskId && r.requesterId === sub.assigneeId && r.status === "approved"
    );
    return !!approvedReview;
  }

  function getStats(userId: string) {
    let assigned = 0;
    let completed = 0;
    tasks.forEach((t) =>
      t.subtasks.forEach((s) => {
        if (s.assigneeId === userId) {
          assigned++;
          if (isEffectivelyDone(t.id, s)) completed++;
        }
      })
    );
    return { assigned, completed };
  }

  function getUserTasks(userId: string) {
    return tasks.filter((t) =>
      t.subtasks.some((s) => s.assigneeId === userId)
    );
  }

  const initialsMap = buildInitialsMap(users);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-gray-500 text-sm mt-1">
            {users.length} member{users.length !== 1 && "s"}
          </p>
        </div>
        {isManager && (
          <button
            onClick={() => setShowAddUser(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add User
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((u) => {
          const { assigned, completed } = getStats(u.id);
          const pct =
            assigned > 0 ? Math.round((completed / assigned) * 100) : 0;
          const color = getUserColor(u.id);

          return (
            <div
              key={u.id}
              onClick={() => setSelectedUser(u)}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden cursor-pointer hover:shadow-md transition-all duration-200 group"
            >
              {/* Color hero banner */}
              <div
                className={`h-20 bg-gradient-to-r ${color.hero} relative`}
              >
                <div className="absolute -bottom-5 left-5">
                  <div
                    className={`w-12 h-12 rounded-full ${color.bg} ${color.text} flex items-center justify-center text-lg font-bold border-4 border-white shadow-sm`}
                  >
                    {initialsMap[u.id] ?? u.name.charAt(0).toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="pt-8 pb-5 px-5">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-gray-900 truncate">
                    {u.name}
                  </p>
                  {u.role === "manager" && (
                    <Shield className="h-4 w-4 text-indigo-500 shrink-0" />
                  )}
                </div>
                <p className="text-sm text-gray-500 truncate mb-3">
                  {u.email}
                </p>

                <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                  <UserIcon className="h-3.5 w-3.5" />
                  <span className="capitalize">{u.role}</span>
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-gray-500">Progress</span>
                    <span className="font-medium text-gray-700">
                      {completed}/{assigned}{" "}
                      <span className="text-gray-400">({pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        pct === 100 ? "bg-green-500" : "bg-indigo-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <p className="text-xs text-indigo-500 font-medium mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  Click to view tasks →
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* User tasks drawer */}
      {selectedUser && (() => {
        const color = getUserColor(selectedUser.id);
        const userTasks = getUserTasks(selectedUser.id);
        const { assigned, completed } = getStats(selectedUser.id);

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onClick={() => setSelectedUser(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Hero header */}
              <div
                className={`bg-gradient-to-r ${color.hero} px-6 pt-6 pb-10 relative shrink-0`}
              >
                <button
                  onClick={() => setSelectedUser(null)}
                  className="absolute top-4 right-4 text-white/80 hover:text-white transition"
                >
                  <X className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-white/20 text-white flex items-center justify-center text-xl font-bold border-2 border-white/30">
                    {initialsMap[selectedUser.id] ?? selectedUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-white truncate">
                      {selectedUser.name}
                    </h2>
                    <p className="text-white/70 text-sm truncate">
                      {selectedUser.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats strip */}
              <div className="px-6 -mt-5 shrink-0">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-6">
                  <div className="text-center flex-1">
                    <p className="text-xl font-bold text-gray-900">
                      {assigned}
                    </p>
                    <p className="text-xs text-gray-400">Assigned</p>
                  </div>
                  <div className="w-px h-8 bg-gray-100" />
                  <div className="text-center flex-1">
                    <p className="text-xl font-bold text-green-600">
                      {completed}
                    </p>
                    <p className="text-xs text-gray-400">Completed</p>
                  </div>
                  <div className="w-px h-8 bg-gray-100" />
                  <div className="text-center flex-1">
                    <p className="text-xl font-bold text-gray-900">
                      {assigned > 0
                        ? Math.round((completed / assigned) * 100)
                        : 0}
                      %
                    </p>
                    <p className="text-xs text-gray-400">Progress</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-6 py-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Tasks ({userTasks.length})
                </h3>
                {userTasks.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">
                    No tasks assigned yet
                  </p>
                ) : (() => {
                  const grouped = userTasks.reduce<Record<string, Task[]>>((acc, t) => {
                    const key = t.milestone || "Uncategorized";
                    if (!acc[key]) acc[key] = [];
                    acc[key].push(t);
                    return acc;
                  }, {});

                  return (
                    <div className="space-y-3">
                      {Object.entries(grouped).map(([milestone, mTasks]) => {
                        const mKey = `${selectedUser.id}-${milestone}`;
                        const isOpen = expandedMilestones.has(mKey);
                        const mileDone = mTasks.reduce(
                          (a, t) => a + t.subtasks.filter((s) => s.assigneeId === selectedUser.id && isEffectivelyDone(t.id, s)).length,
                          0
                        );
                        const mileTotal = mTasks.reduce(
                          (a, t) => a + t.subtasks.filter((s) => s.assigneeId === selectedUser.id).length,
                          0
                        );

                        const milePct = mileTotal > 0 ? Math.round((mileDone / mileTotal) * 100) : 0;

                        return (
                          <div key={milestone}>
                            <button
                              type="button"
                              onClick={() => {
                                setExpandedMilestones((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(mKey)) next.delete(mKey);
                                  else next.add(mKey);
                                  return next;
                                });
                              }}
                              className="w-full flex items-center justify-between bg-gray-100 hover:bg-gray-150 rounded-lg px-4 py-3 transition"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-1 h-5 rounded-full bg-indigo-500" />
                                <div className="text-left">
                                  <p className="text-sm font-semibold text-gray-900">{milestone}</p>
                                  <p className="text-xs text-gray-400">{mileDone}/{mileTotal} subtasks &middot; {mTasks.length} task{mTasks.length !== 1 ? "s" : ""}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                                    milePct === 100
                                      ? "bg-green-50 text-green-700"
                                      : milePct > 0
                                      ? "bg-amber-50 text-amber-700"
                                      : "bg-red-50 text-red-600"
                                  }`}
                                >
                                  {milePct}%
                                </span>
                                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                              </div>
                            </button>

                            {isOpen && (
                              <div className="space-y-3 mt-3 pl-3">
                                {mTasks.map((t) => {
                                  const userSubtasks = t.subtasks.filter(
                                    (s) => s.assigneeId === selectedUser.id
                                  );
                                  const done = userSubtasks.filter((s) => isEffectivelyDone(t.id, s)).length;

                                  return (
                                    <div
                                      key={t.id}
                                      className="bg-gray-50 rounded-xl p-4"
                                    >
                                      <div className="flex items-start justify-between gap-2 mb-1">
                                        <p className="font-medium text-gray-900 text-sm">
                                          {t.title}
                                        </p>
                                        <span
                                          className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                                            done === userSubtasks.length
                                              ? "bg-green-50 text-green-600"
                                              : "bg-indigo-50 text-indigo-600"
                                          }`}
                                        >
                                          {done}/{userSubtasks.length}
                                        </span>
                                      </div>
                                      {t.description && (
                                        <p className="text-sm text-gray-500 leading-relaxed mb-2 whitespace-pre-wrap">
                                          {t.description}
                                        </p>
                                      )}
                                      {t.dueDate && (
                                        <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                                          Due:{" "}
                                          {new Date(t.dueDate).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                          })}
                                        </p>
                                      )}
                                      <div className="space-y-1">
                                        {userSubtasks.map((s) => (
                                          <div
                                            key={s.id}
                                            className="flex items-center gap-2 text-sm"
                                          >
                                            {s.completed ? (
                                              <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                            ) : (
                                              <Circle className="h-3.5 w-3.5 text-gray-300 shrink-0" />
                                            )}
                                            <span
                                              className={
                                                s.completed
                                                  ? "line-through text-gray-400"
                                                  : "text-gray-600"
                                              }
                                            >
                                              {s.title}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        );
      })()}
      {showAddUser && (
        <AddUserModal
          onClose={() => setShowAddUser(false)}
          onDone={async () => {
            setShowAddUser(false);
            await load();
          }}
        />
      )}
    </div>
  );
}

function AddUserModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "manager">("member");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setSaving(true);
    setError("");
    try {
      await createUser({ name: name.trim(), email: email.trim().toLowerCase(), role });
      onDone();
    } catch {
      setError("Failed to create user. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Add New User</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Divine Mathem's"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. john@example.com"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Role
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRole("member")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition ${
                  role === "member"
                    ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                    : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                <UserIcon className="h-4 w-4" />
                Member
              </button>
              <button
                type="button"
                onClick={() => setRole("manager")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition ${
                  role === "manager"
                    ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                    : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                <Shield className="h-4 w-4" />
                Manager
              </button>
            </div>
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition flex items-center gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Add User
          </button>
        </div>
      </form>
    </div>
  );
}
