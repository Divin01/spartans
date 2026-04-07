"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  getTasks,
  getUsers,
  createTask,
  updateTask,
  deleteTask,
  toggleSubtask,
} from "@/lib/firestore";
import type { Task, User, Subtask } from "@/lib/types";
import { getUserColor, buildInitialsMap } from "@/lib/colors";
import {
  Plus,
  Trash2,
  Pencil,
  CheckCircle2,
  Circle,
  Loader2,
  X,
  Calendar,
  Users as UsersIcon,
  ClipboardList,
  Search,
  ArrowUpDown,
  Filter,
} from "lucide-react";

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<"all" | "mine">("mine");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "in-progress" | "not-started">("all");
  const [sortBy, setSortBy] = useState<"oldest" | "newest" | "due-date" | "progress">("oldest");

  async function load() {
    const [t, u] = await Promise.all([getTasks(), getUsers()]);
    setTasks(t);
    setUsers(u);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleToggle(task: Task, subtaskId: string, done: boolean) {
    await toggleSubtask(task.id, subtaskId, done, task.subtasks);
    await load();
  }

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setConfirmDelete(id);
  }

  async function confirmAndDelete() {
    if (!confirmDelete) return;
    await deleteTask(confirmDelete);
    setConfirmDelete(null);
    await load();
  }

  const isManager = user?.role === "manager";

  const initialsMap = buildInitialsMap(users);

  // Group tasks by milestone
  const milestones = tasks.reduce<Record<string, Task[]>>((acc, t) => {
    const key = t.milestone || "Uncategorized";
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  // Apply ownership filter
  let filtered: Record<string, Task[]> =
    filter === "mine"
      ? Object.fromEntries(
          Object.entries(milestones)
            .map(
              ([m, ts]) =>
                [
                  m,
                  ts.filter((t) =>
                    t.subtasks.some((s) => s.assigneeId === user?.id)
                  ),
                ] as [string, Task[]]
            )
            .filter(([, ts]) => ts.length > 0)
        )
      : milestones;

  // Apply search
  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = Object.fromEntries(
      Object.entries(filtered)
        .map(
          ([m, ts]) =>
            [
              m,
              ts.filter(
                (t) =>
                  t.title.toLowerCase().includes(q) ||
                  t.description?.toLowerCase().includes(q) ||
                  m.toLowerCase().includes(q) ||
                  t.subtasks.some((s) =>
                    s.assigneeName?.toLowerCase().includes(q)
                  )
              ),
            ] as [string, Task[]]
        )
        .filter(([, ts]) => ts.length > 0)
    );
  }

  // Apply status filter
  if (statusFilter !== "all") {
    filtered = Object.fromEntries(
      Object.entries(filtered)
        .map(([m, ts]) => {
          const matched = ts.filter((t) => {
            const done = t.subtasks.filter((s) => s.completed).length;
            const total = t.subtasks.length;
            if (statusFilter === "completed") return total > 0 && done === total;
            if (statusFilter === "in-progress") return done > 0 && done < total;
            return total === 0 || done === 0;
          });
          return [m, matched] as [string, Task[]];
        })
        .filter(([, ts]) => ts.length > 0)
    );
  }

  // Apply sort within each milestone
  const filteredMilestones: Record<string, Task[]> = Object.fromEntries(
    Object.entries(filtered).map(([m, ts]) => {
      const sorted = [...ts].sort((a, b) => {
        if (sortBy === "newest")
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (sortBy === "due-date") {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        if (sortBy === "progress") {
          const pA = a.subtasks.length > 0 ? a.subtasks.filter((s) => s.completed).length / a.subtasks.length : 0;
          const pB = b.subtasks.length > 0 ? b.subtasks.filter((s) => s.completed).length / b.subtasks.length : 0;
          return pA - pB;
        }
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
      return [m, sorted];
    })
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage and track project tasks
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1 text-sm">
            <button
              onClick={() => setFilter("mine")}
              className={`px-3 py-1.5 rounded-md transition ${
                filter === "mine"
                  ? "bg-white shadow-sm font-medium"
                  : "text-gray-500"
              }`}
            >
              My Tasks
            </button>
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-md transition ${
                filter === "all"
                  ? "bg-white shadow-sm font-medium"
                  : "text-gray-500"
              }`}
            >
              All
            </button>
          </div>
          {isManager && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition shadow-sm"
            >
              <Plus className="h-4 w-4" />
              New Task
            </button>
          )}
        </div>
      </div>

      {/* Search, filter & sort bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search tasks, milestones, or assignees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="appearance-none pl-8 pr-8 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="in-progress">In Progress</option>
              <option value="not-started">Not Started</option>
            </select>
          </div>
          <div className="relative">
            <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="appearance-none pl-8 pr-8 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="oldest">Oldest First</option>
              <option value="newest">Newest First</option>
              <option value="due-date">Due Date</option>
              <option value="progress">Progress</option>
            </select>
          </div>
        </div>
      </div>

      {/* Task cards */}
      {Object.keys(filteredMilestones).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <ClipboardList className="h-8 w-8 text-gray-300" />
          </div>
          <p className="text-lg font-medium text-gray-500">No tasks found</p>
          <p className="text-sm text-gray-400 mt-1">
            Create a new task to get started
          </p>
        </div>
      ) : (
        Object.entries(filteredMilestones).map(([milestone, mTasks]) => {
          const mileDone = mTasks.reduce(
            (a, t) => a + t.subtasks.filter((s) => s.completed).length,
            0
          );
          const mileTotal = mTasks.reduce(
            (a, t) => a + t.subtasks.length,
            0
          );
          const milePct =
            mileTotal > 0 ? Math.round((mileDone / mileTotal) * 100) : 0;

          return (
            <div key={milestone} className="space-y-4">
              {/* Milestone header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-8 rounded-full bg-indigo-500" />
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      {milestone}
                    </h3>
                    <p className="text-xs text-gray-400">
                      {mileDone}/{mileTotal} subtasks completed
                    </p>
                  </div>
                </div>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    milePct === 100
                      ? "bg-green-50 text-green-700"
                      : milePct > 50
                      ? "bg-blue-50 text-blue-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {milePct}%
                </span>
              </div>

              {/* Cards grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {mTasks.map((task) => {
                  const done = task.subtasks.filter(
                    (s) => s.completed
                  ).length;
                  const total = task.subtasks.length;
                  const pct =
                    total > 0 ? Math.round((done / total) * 100) : 0;

                  const visibleSubtasks =
                    filter === "mine"
                      ? task.subtasks.filter(
                          (s) => s.assigneeId === user?.id
                        )
                      : task.subtasks;

                  // Unique assignees
                  const assigneeMap = new Map(
                    task.subtasks.map((s) => [s.assigneeId, s.assigneeName])
                  );
                  const assignees = [...assigneeMap.entries()].map(
                    ([id, name]) => ({ id, name })
                  );

                  return (
                    <div
                      key={task.id}
                      className="group bg-white rounded-2xl border border-gray-200 hover:border-indigo-200 hover:shadow-md transition-all duration-200 flex flex-col"
                    >
                      {/* Card header */}
                      <div className="px-5 pt-5 pb-3">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-semibold text-gray-900 leading-snug">
                            {task.title}
                          </h4>
                          {isManager && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <button
                                onClick={() => setEditingTask(task)}
                                className="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition"
                                title="Edit task"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(task.id)}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
                                title="Delete task"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                        {task.description && (
                          <div className="mb-3">
                            <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">
                              {task.description}
                            </p>
                            {task.description.length > 100 && (
                              <button
                                onClick={() => setViewingTask(task)}
                                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium mt-1 transition"
                              >
                                View more
                              </button>
                            )}
                          </div>
                        )}

                        {/* Assignee names */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {assignees.map((a) => {
                            const c = getUserColor(a.id);
                            return (
                              <span
                                key={a.id}
                                className={`inline-flex items-center gap-1 text-xs ${c.bg} ${c.text} px-2 py-0.5 rounded-full`}
                              >
                                <span
                                  className={`w-4 h-4 rounded-full ${c.ring} text-[9px] font-bold flex items-center justify-center`}
                                >
                                  {initialsMap[a.id] ?? a.name.charAt(0).toUpperCase()}
                                </span>
                                {a.name.split(" ")[0]}
                              </span>
                            );
                          })}
                        </div>

                        {/* Meta row */}
                        <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                          {task.dueDate && (() => {
                            const now = new Date();
                            now.setHours(0, 0, 0, 0);
                            const due = new Date(task.dueDate);
                            due.setHours(0, 0, 0, 0);
                            const diff = Math.ceil(
                              (due.getTime() - now.getTime()) / 86400000
                            );
                            const isOverdue = diff < 0;
                            const label =
                              diff === 0
                                ? "Due today"
                                : isOverdue
                                ? `${Math.abs(diff)}d overdue`
                                : `${diff}d left`;
                            return (
                              <span
                                className={`flex items-center gap-1 font-medium ${
                                  isOverdue
                                    ? "text-red-500"
                                    : diff <= 3
                                    ? "text-amber-500"
                                    : "text-gray-400"
                                }`}
                              >
                                <Calendar className="h-3 w-3" />
                                {new Date(task.dueDate).toLocaleDateString(
                                  "en-US",
                                  { month: "short", day: "numeric" }
                                )}
                                <span className="ml-0.5">({label})</span>
                              </span>
                            );
                          })()}
                          <span className="flex items-center gap-1">
                            <UsersIcon className="h-3 w-3" />
                            {assignees.length}
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="flex items-center gap-2.5">
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all duration-500 ${
                                pct === 100 ? "bg-green-500" : "bg-indigo-500"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-500 tabular-nums">
                            {done}/{total}
                          </span>
                        </div>
                      </div>

                      {/* Subtasks list */}
                      <div className="border-t border-gray-100 px-5 py-3 flex-1">
                        {visibleSubtasks.length === 0 ? (
                          <p className="text-xs text-gray-400 py-1">
                            No subtasks
                          </p>
                        ) : (
                          <div className="space-y-1.5">
                            {visibleSubtasks.map((sub) => {
                              const isMine = sub.assigneeId === user?.id;
                              return (
                                <div
                                  key={sub.id}
                                  className={`flex items-center gap-2.5 py-1 px-2 rounded-lg transition ${
                                    isMine
                                      ? "hover:bg-indigo-50/50"
                                      : ""
                                  }`}
                                >
                                  <button
                                    disabled={!isMine}
                                    onClick={() =>
                                      handleToggle(
                                        task,
                                        sub.id,
                                        !sub.completed
                                      )
                                    }
                                    className={`shrink-0 transition ${
                                      isMine
                                        ? "text-gray-300 hover:text-green-500 cursor-pointer"
                                        : ""
                                    }`}
                                  >
                                    {sub.completed ? (
                                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    ) : (
                                      <Circle className="h-4 w-4 text-gray-300" />
                                    )}
                                  </button>
                                  <span
                                    className={`flex-1 text-sm truncate ${
                                      sub.completed
                                        ? "line-through text-gray-400"
                                        : "text-gray-700"
                                    }`}
                                  >
                                    {sub.title}
                                  </span>
                                  <span className="shrink-0 text-xs text-gray-400 truncate max-w-[80px]">
                                    {sub.assigneeName}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Assignee avatars footer */}
                      <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                        <div className="flex -space-x-2">
                          {assignees.slice(0, 4).map((a) => {
                            const c = getUserColor(a.id);
                            return (
                              <div
                                key={a.id}
                                className={`w-7 h-7 rounded-full ${c.bg} ${c.text} text-xs font-bold flex items-center justify-center border-2 border-white`}
                                title={a.name}
                              >
                                {initialsMap[a.id] ?? a.name.charAt(0).toUpperCase()}
                              </div>
                            );
                          })}
                          {assignees.length > 4 && (
                            <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center border-2 border-white">
                              +{assignees.length - 4}
                            </div>
                          )}
                        </div>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            pct === 100
                              ? "bg-green-50 text-green-600"
                              : pct > 0
                              ? "bg-indigo-50 text-indigo-600"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {pct === 100
                            ? "Complete"
                            : pct > 0
                            ? "In Progress"
                            : "Not Started"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {/* Create modal */}
      {showCreate && (
        <TaskModal
          mode="create"
          users={users}
          userId={user!.id}
          existingMilestones={Object.keys(milestones)}
          onClose={() => setShowCreate(false)}
          onDone={async () => {
            setShowCreate(false);
            await load();
          }}
        />
      )}

      {/* Edit modal */}
      {editingTask && (
        <TaskModal
          mode="edit"
          task={editingTask}
          users={users}
          userId={user!.id}
          existingMilestones={Object.keys(milestones)}
          onClose={() => setEditingTask(null)}
          onDone={async () => {
            setEditingTask(null);
            await load();
          }}
        />
      )}

      {/* Delete confirm dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="h-7 w-7 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Delete Task
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete this task? This action cannot be
              undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmAndDelete}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task detail modal */}
      {viewingTask && (() => {
        const t = viewingTask;
        const done = t.subtasks.filter((s) => s.completed).length;
        const total = t.subtasks.length;
        const assigneeMap = new Map(
          t.subtasks.map((s) => [s.assigneeId, s.assigneeName])
        );
        const taskAssignees = [...assigneeMap.entries()].map(
          ([id, name]) => ({ id, name })
        );

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onClick={() => setViewingTask(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-gray-900 truncate">
                    {t.title}
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">{t.milestone}</p>
                </div>
                <button
                  onClick={() => setViewingTask(null)}
                  className="text-gray-400 hover:text-gray-600 transition shrink-0 ml-3"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-6 py-5 space-y-5">
                {/* Description */}
                {t.description && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-1.5">
                      Description
                    </h4>
                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                      {t.description}
                    </p>
                  </div>
                )}

                {/* Meta */}
                <div className="flex flex-wrap gap-4 text-sm">
                  {t.dueDate && (
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <Calendar className="h-4 w-4" />
                      {new Date(t.dueDate).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <UsersIcon className="h-4 w-4" />
                    {taskAssignees.length} assignee{taskAssignees.length !== 1 && "s"}
                  </div>
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      done === total && total > 0
                        ? "bg-green-50 text-green-600"
                        : "bg-indigo-50 text-indigo-600"
                    }`}
                  >
                    {done}/{total} done
                  </span>
                </div>

                {/* Assignees */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Assigned to
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {taskAssignees.map((a) => {
                      const c = getUserColor(a.id);
                      return (
                        <span
                          key={a.id}
                          className={`inline-flex items-center gap-1.5 text-sm ${c.bg} ${c.text} px-3 py-1 rounded-full`}
                        >
                          <span
                            className={`w-5 h-5 rounded-full ${c.ring} text-[10px] font-bold flex items-center justify-center`}
                          >
                            {initialsMap[a.id] ?? a.name.charAt(0).toUpperCase()}
                          </span>
                          {a.name}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Subtasks */}
                {total > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Subtasks
                    </h4>
                    <div className="space-y-1.5">
                      {t.subtasks.map((sub) => (
                        <div
                          key={sub.id}
                          className="flex items-center gap-2.5 py-1.5 px-3 rounded-lg bg-gray-50"
                        >
                          {sub.completed ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                          ) : (
                            <Circle className="h-4 w-4 text-gray-300 shrink-0" />
                          )}
                          <span
                            className={`flex-1 text-sm ${
                              sub.completed
                                ? "line-through text-gray-400"
                                : "text-gray-700"
                            }`}
                          >
                            {sub.title}
                          </span>
                          <span className="text-xs text-gray-400 shrink-0">
                            {sub.assigneeName}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 shrink-0">
                <button
                  onClick={() => setViewingTask(null)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Unified Create / Edit modal ──────────────────────────
function TaskModal({
  mode,
  task,
  users,
  userId,
  existingMilestones,
  onClose,
  onDone,
}: {
  mode: "create" | "edit";
  task?: Task;
  users: User[];
  userId: string;
  existingMilestones: string[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [milestone, setMilestone] = useState(task?.milestone ?? "");
  const [dueDate, setDueDate] = useState(task?.dueDate ?? "");
  const [subtasks, setSubtasks] = useState<
    {
      id?: string;
      title: string;
      assigneeId: string;
      assigneeName?: string;
      completed?: boolean;
      completedAt?: string;
    }[]
  >(
    task?.subtasks.map((s) => ({
      id: s.id,
      title: s.title,
      assigneeId: s.assigneeId,
      assigneeName: s.assigneeName,
      completed: s.completed,
      completedAt: s.completedAt,
    })) ?? []
  );
  const [saving, setSaving] = useState(false);

  // All registered users (managers + members)
  const members = users;

  const modalInitials = buildInitialsMap(users);

  // Selected user IDs derived from subtasks
  const selectedUserIds = new Set(subtasks.map((s) => s.assigneeId));

  function toggleUser(u: User) {
    if (selectedUserIds.has(u.id)) {
      // Deselect — remove the subtask for this user
      setSubtasks((p) => p.filter((s) => s.assigneeId !== u.id));
    } else {
      // Select — add a subtask for this user
      setSubtasks((p) => [
        ...p,
        {
          title: u.name,
          assigneeId: u.id,
          assigneeName: u.name,
          completed: false,
        },
      ]);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !milestone.trim()) return;
    setSaving(true);

    const builtSubtasks: Subtask[] = subtasks.map((s, i) => ({
      id: s.id || `st-${Date.now()}-${i}`,
      title: s.title,
      assigneeId: s.assigneeId,
      assigneeName:
        s.assigneeName ??
        users.find((u) => u.id === s.assigneeId)?.name ??
        "Unknown",
      completed: s.completed ?? false,
      ...(s.completedAt ? { completedAt: s.completedAt } : {}),
    }));

    if (mode === "edit" && task) {
      await updateTask(task.id, {
        title: title.trim(),
        description: description.trim(),
        milestone: milestone.trim(),
        ...(dueDate ? { dueDate } : {}),
        subtasks: builtSubtasks,
      });
    } else {
      await createTask({
        title: title.trim(),
        description: description.trim(),
        milestone: milestone.trim(),
        ...(dueDate ? { dueDate } : {}),
        createdBy: userId,
        subtasks: builtSubtasks,
      });
    }
    onDone();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSave}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <h2 className="text-lg font-semibold">
            {mode === "edit" ? "Edit Task" : "Create Task"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body — two columns on desktop */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
            {/* Left: Task details */}
            <div className="px-6 py-5 space-y-4">
              <Field label="Milestone" required>
                <div className="space-y-2">
                  {existingMilestones.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {existingMilestones.map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setMilestone(m)}
                          className={`text-xs px-2.5 py-1 rounded-full border transition ${
                            milestone === m
                              ? "bg-indigo-50 border-indigo-300 text-indigo-700 font-medium"
                              : "bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  )}
                  <input
                    value={milestone}
                    onChange={(e) => setMilestone(e.target.value)}
                    placeholder={
                      existingMilestones.length > 0
                        ? "Or type a new milestone"
                        : "e.g. 4.1 User Authentication"
                    }
                    className="input"
                    required
                  />
                </div>
              </Field>
              <Field label="Title" required>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Task title"
                  className="input"
                  required
                />
              </Field>
              <Field label="Description">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                  rows={3}
                  className="input resize-none"
                />
              </Field>
              <Field label="Due Date">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="input"
                />
              </Field>
            </div>

            {/* Right: Assign to users */}
            <div className="px-6 py-5">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assign to
              </label>
              <p className="text-xs text-gray-400 mb-3">
                Select the people responsible for this task
              </p>
              {members.length === 0 ? (
                <p className="text-sm text-gray-400">
                  No users registered yet
                </p>
              ) : (
                <div className="space-y-2">
                  {members.map((u) => {
                    const selected = selectedUserIds.has(u.id);
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => toggleUser(u)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left text-sm transition ${
                          selected
                            ? "bg-indigo-50 border-indigo-300 text-indigo-800"
                            : "bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            selected
                              ? "bg-indigo-200 text-indigo-800"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {modalInitials[u.id] ?? u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{u.name}</p>
                          <p className="text-xs text-gray-400 truncate">
                            {u.email}
                          </p>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition ${
                            selected
                              ? "border-indigo-600 bg-indigo-600"
                              : "border-gray-300"
                          }`}
                        >
                          {selected && (
                            <CheckCircle2 className="h-4 w-4 text-white" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {selectedUserIds.size > 0 && (
                <p className="text-xs text-indigo-600 font-medium mt-3">
                  {selectedUserIds.size} user{selectedUserIds.size > 1 ? "s" : ""} selected
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 shrink-0">
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
            {mode === "edit" ? "Save Changes" : "Create Task"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
