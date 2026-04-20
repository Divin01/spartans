"use client";

import { useEffect, useState } from "react";
import { getTasks, getReviews } from "@/lib/firestore";
import type { Task, Review } from "@/lib/types";
import { Loader2, CheckCircle2, Circle, Clock, ChevronDown } from "lucide-react";

export default function TimelinePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([getTasks(), getReviews()]).then(([t, r]) => {
      setTasks(t);
      setReviews(r);
      setLoading(false);
    });
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

  // Group by milestone and calculate progress
  const milestones = tasks.reduce<
    Record<string, { tasks: Task[]; done: number; total: number }>
  >((acc, t) => {
    const key = t.milestone || "Uncategorized";
    if (!acc[key]) acc[key] = { tasks: [], done: 0, total: 0 };
    acc[key].tasks.push(t);
    acc[key].total += t.subtasks.length;
    acc[key].done += t.subtasks.filter((s) => isEffectivelyDone(t.id, s)).length;
    return acc;
  }, {});

  const milestoneEntries = Object.entries(milestones);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Timeline</h1>
        <p className="text-gray-500 text-sm mt-1">
          Visual overview of project milestones
        </p>
      </div>

      {milestoneEntries.length === 0 ? (
        <p className="text-center py-16 text-gray-400">
          No milestones to display
        </p>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

          <div className="space-y-8">
            {milestoneEntries.map(([name, data], idx) => {
              const pct =
                data.total > 0
                  ? Math.round((data.done / data.total) * 100)
                  : 0;
              const isComplete = pct === 100;

              return (
                <div key={name} className="relative pl-14">
                  {/* Dot on timeline */}
                  <div
                    className={`absolute left-4 top-5 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      isComplete
                        ? "bg-green-500 border-green-500"
                        : "bg-white border-indigo-400"
                    }`}
                  >
                    {isComplete && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                    )}
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className="text-xs text-gray-400 uppercase tracking-wider">
                          Milestone {idx + 1}
                        </span>
                        <h3 className="text-lg font-semibold mt-0.5">
                          {name}
                        </h3>
                      </div>
                      <span
                        className={`text-sm font-medium px-2.5 py-1 rounded-full ${
                          isComplete
                            ? "bg-green-50 text-green-700"
                            : pct > 50
                            ? "bg-blue-50 text-blue-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {pct}%
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          isComplete ? "bg-green-500" : "bg-indigo-500"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    {/* Show/hide tasks toggle */}
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedMilestones((prev) => {
                          const next = new Set(prev);
                          if (next.has(name)) next.delete(name);
                          else next.add(name);
                          return next;
                        });
                      }}
                      className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition"
                    >
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-200 ${
                          expandedMilestones.has(name) ? "rotate-180" : ""
                        }`}
                      />
                      {expandedMilestones.has(name) ? "Hide" : "Show"} tasks ({data.tasks.length})
                    </button>

                    {/* Task groups under this milestone */}
                    {expandedMilestones.has(name) && (
                    <div className="space-y-3 mt-3">
                      {data.tasks.map((task) => {
                        const tDone = task.subtasks.filter(
                          (s) => isEffectivelyDone(task.id, s)
                        ).length;
                        const tTotal = task.subtasks.length;
                        return (
                          <div
                            key={task.id}
                            className="bg-gray-50 rounded-lg p-3"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-medium">
                                {task.title}
                              </p>
                              <span className="text-xs text-gray-500">
                                {tDone}/{tTotal}
                              </span>
                            </div>
                            <div className="space-y-1">
                              {task.subtasks.map((sub) => (
                                <div
                                  key={sub.id}
                                  className="flex items-center gap-2 text-xs"
                                >
                                  {sub.completed ? (
                                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                  ) : (
                                    <Circle className="h-3.5 w-3.5 text-gray-300 shrink-0" />
                                  )}
                                  <span
                                    className={
                                      sub.completed
                                        ? "text-gray-400 line-through"
                                        : "text-gray-600"
                                    }
                                  >
                                    {sub.title}
                                  </span>
                                  <span className="ml-auto text-gray-400">
                                    {sub.assigneeName}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    )}

                    {/* Due date if present */}
                    {data.tasks.some((t) => t.dueDate) && (() => {
                      const dueDates = data.tasks
                        .filter((t) => t.dueDate)
                        .map((t) => new Date(t.dueDate!).getTime());
                      const maxDue = new Date(Math.max(...dueDates));
                      return (
                        <div className="flex items-center gap-1.5 mt-3 text-xs text-gray-400">
                          <Clock className="h-3.5 w-3.5" />
                          Due: {maxDue.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
