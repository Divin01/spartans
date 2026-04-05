"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  getTasks,
  getUsers,
  createTask,
  deleteTask,
  toggleSubtask,
} from "@/lib/firestore";
import type { Task, User, Subtask } from "@/lib/types";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  Loader2,
  X,
} from "lucide-react";

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
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

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

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
            .map(([m, ts]) => [
              m,
              ts.filter((t) =>
                t.subtasks.some((s) => s.assigneeId === user?.id)
              ),
            ] as [string, Task[]])
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
    <div className="space-y-6">
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
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
            >
              <Plus className="h-4 w-4" />
              New Task
            </button>
          )}
        </div>
      </div>

      {/* Task list */}
      {Object.keys(filteredMilestones).length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ListEmpty />
        </div>
      ) : (
        Object.entries(filteredMilestones).map(([milestone, mTasks]) => (
          <div key={milestone} className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              {milestone}
            </h3>
            {mTasks.map((task) => {
              const done = task.subtasks.filter((s) => s.completed).length;
              const total = task.subtasks.length;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              const isOpen = expanded.has(task.id);

              return (
                <div
                  key={task.id}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                >
                  <button
                    onClick={() => toggleExpand(task.id)}
                    className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition"
                  >
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{task.title}</p>
                      {task.description && (
                        <p className="text-sm text-gray-500 truncate mt-0.5">
                          {task.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="hidden sm:flex items-center gap-2">
                        <div className="w-24 bg-gray-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              pct === 100 ? "bg-green-500" : "bg-indigo-500"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-10 text-right">
                          {done}/{total}
                        </span>
                      </div>
                      {isManager && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(task.id);
                          }}
                          className="text-gray-300 hover:text-red-500 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-gray-100 px-5 py-3 space-y-2">
                      {task.subtasks.length === 0 ? (
                        <p className="text-sm text-gray-400 py-2">
                          No subtasks yet
                        </p>
                      ) : (
                        task.subtasks
                          .filter(
                            (s) =>
                              filter === "all" || s.assigneeId === user?.id
                          )
                          .map((sub) => {
                            const isMine = sub.assigneeId === user?.id;
                            return (
                              <div
                                key={sub.id}
                                className="flex items-center gap-3 py-1.5"
                              >
                                <button
                                  disabled={!isMine || sub.completed}
                                  onClick={() =>
                                    handleToggle(task, sub.id, !sub.completed)
                                  }
                                  className={`shrink-0 ${
                                    isMine && !sub.completed
                                      ? "text-gray-300 hover:text-green-500 cursor-pointer"
                                      : ""
                                  }`}
                                >
                                  {sub.completed ? (
                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                  ) : (
                                    <Circle className="h-5 w-5 text-gray-300" />
                                  )}
                                </button>
                                <span
                                  className={`flex-1 text-sm ${
                                    sub.completed
                                      ? "line-through text-gray-400"
                                      : ""
                                  }`}
                                >
                                  {sub.title}
                                </span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                  {sub.assigneeName}
                                </span>
                              </div>
                            );
                          })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))
      )}

      {/* Create modal */}
      {showCreate && (
        <CreateTaskModal
          users={users}
          userId={user!.id}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function ListEmpty() {
  return (
    <div>
      <p className="text-lg font-medium text-gray-500">No tasks found</p>
      <p className="text-sm text-gray-400 mt-1">Create a new task to get started</p>
    </div>
  );
}

// ── Create task modal ────────────────────────────────────
function CreateTaskModal({
  users,
  userId,
  onClose,
  onCreated,
}: {
  users: User[];
  userId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [milestone, setMilestone] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [subtasks, setSubtasks] = useState<
    { title: string; assigneeId: string }[]
  >([]);
  const [stTitle, setStTitle] = useState("");
  const [stAssignee, setStAssignee] = useState("");
  const [saving, setSaving] = useState(false);

  function addSubtask() {
    if (!stTitle.trim() || !stAssignee) return;
    setSubtasks((p) => [...p, { title: stTitle.trim(), assigneeId: stAssignee }]);
    setStTitle("");
    setStAssignee("");
  }

  function removeSubtask(i: number) {
    setSubtasks((p) => p.filter((_, idx) => idx !== i));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !milestone.trim()) return;
    setSaving(true);
    await createTask({
      title: title.trim(),
      description: description.trim(),
      milestone: milestone.trim(),
      dueDate: dueDate || undefined,
      createdBy: userId,
      subtasks: subtasks.map((s, i) => ({
        id: `st-${Date.now()}-${i}`,
        title: s.title,
        assigneeId: s.assigneeId,
        assigneeName:
          users.find((u) => u.id === s.assigneeId)?.name ?? "Unknown",
        completed: false,
      })),
    });
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form
        onSubmit={handleSave}
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Create Task Group</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <Field label="Milestone" required>
            <input
              value={milestone}
              onChange={(e) => setMilestone(e.target.value)}
              placeholder="e.g. 4.1 User Authentication"
              className="input"
              required
            />
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

          {/* Subtasks */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subtasks
            </label>
            {subtasks.map((s, i) => (
              <div
                key={i}
                className="flex items-center gap-2 mb-2 text-sm bg-gray-50 rounded-lg px-3 py-2"
              >
                <span className="flex-1">{s.title}</span>
                <span className="text-gray-500">
                  {users.find((u) => u.id === s.assigneeId)?.name}
                </span>
                <button
                  type="button"
                  onClick={() => removeSubtask(i)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}

            <div className="flex gap-2">
              <input
                value={stTitle}
                onChange={(e) => setStTitle(e.target.value)}
                placeholder="Subtask title"
                className="input flex-1"
              />
              <select
                value={stAssignee}
                onChange={(e) => setStAssignee(e.target.value)}
                className="input w-36"
              >
                <option value="">Assign to</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={addSubtask}
                className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-600 transition"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
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
            className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition flex items-center gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Task
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
