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
} from "lucide-react";

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<"all" | "mine">("all");

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

  async function handleDelete(id: string) {
    if (!confirm("Delete this task group?")) return;
    await deleteTask(id);
    await load();
  }

  const isManager = user?.role === "manager";

  // Group tasks by milestone
  const milestones = tasks.reduce<Record<string, Task[]>>((acc, t) => {
    const key = t.milestone || "Uncategorized";
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  const filteredMilestones: Record<string, Task[]> =
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
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-md transition ${
                filter === "all"
                  ? "bg-white shadow-sm font-medium"
                  : "text-gray-500"
              }`}
            >
              All
            </button>
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
                  const assignees = [
                    ...new Map(
                      task.subtasks.map((s) => [s.assigneeId, s.assigneeName])
                    ).values(),
                  ];

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
                          <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-3">
                            {task.description}
                          </p>
                        )}

                        {/* Assignee names */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {assignees.map((name, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full"
                            >
                              <span className="w-4 h-4 rounded-full bg-indigo-200 text-indigo-800 text-[9px] font-bold flex items-center justify-center">
                                {name.charAt(0).toUpperCase()}
                              </span>
                              {name.split(" ")[0]}
                            </span>
                          ))}
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
                          {assignees.slice(0, 4).map((name, i) => (
                            <div
                              key={i}
                              className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center border-2 border-white"
                              title={name}
                            >
                              {name.charAt(0).toUpperCase()}
                            </div>
                          ))}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form
        onSubmit={handleSave}
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">
            {mode === "edit" ? "Edit Task" : "Create Task"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

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
                placeholder={existingMilestones.length > 0 ? "Or type a new milestone" : "e.g. 4.1 User Authentication"}
                className="input"
                required
              />
            </div>
          </Field>
          <Field label="Title" required>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task group title"
              className="input"
              required
            />
          </Field>
          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={2}
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

          {/* Assign to */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign to
            </label>
            {members.length === 0 ? (
              <p className="text-sm text-gray-400">No members registered yet</p>
            ) : (
              <div className="space-y-1.5">
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
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          selected
                            ? "bg-indigo-200 text-indigo-800"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{u.name}</p>
                        <p className="text-xs text-gray-400 truncate">
                          {u.email}
                        </p>
                      </div>
                      {selected && (
                        <CheckCircle2 className="h-5 w-5 text-indigo-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition flex items-center gap-2"
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
