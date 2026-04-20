"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getTasks, getUsers, getReviews, getActivityLogs } from "@/lib/firestore";
import type { Task, User, Review, ActivityLog } from "@/lib/types";
import {
  ListTodo,
  CheckCircle2,
  Users,
  Clock,
  Loader2,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getTasks(), getUsers(), getReviews(), getActivityLogs()]).then(([t, u, r, a]) => {
      setTasks(t);
      setUsers(u);
      setReviews(r);
      setActivityLogs(a);
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

  // Review-aware: a subtask counts as "effectively done" only if
  // it's completed AND there's an approved review for that task+user
  function isEffectivelyDone(taskId: string, sub: { assigneeId: string; completed: boolean }) {
    if (!sub.completed) return false;
    const approvedReview = reviews.find(
      (r) => r.taskId === taskId && r.requesterId === sub.assigneeId && r.status === "approved"
    );
    return !!approvedReview;
  }

  const totalSubtasks = tasks.reduce((a, t) => a + t.subtasks.length, 0);
  const completedSubtasks = tasks.reduce(
    (a, t) => a + t.subtasks.filter((s) => isEffectivelyDone(t.id, s)).length,
    0
  );
  const mySubtasks = tasks.reduce(
    (a, t) => a + t.subtasks.filter((s) => s.assigneeId === user?.id).length,
    0
  );
  const myCompleted = tasks.reduce(
    (a, t) =>
      a +
      t.subtasks.filter((s) => s.assigneeId === user?.id && isEffectivelyDone(t.id, s)).length,
    0
  );
  const progress =
    totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  const pendingReviews = reviews.filter((r) => r.status === "pending").length;
  const approvedReviews = reviews.filter((r) => r.status === "approved").length;

  const stats = [
    {
      label: "Total Tasks",
      value: tasks.length,
      icon: ListTodo,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Subtasks Done",
      value: `${completedSubtasks}/${totalSubtasks}`,
      icon: CheckCircle2,
      color: "bg-green-50 text-green-600",
    },
    {
      label: "Pending Reviews",
      value: pendingReviews,
      icon: AlertCircle,
      color: "bg-amber-50 text-amber-600",
    },
    {
      label: "My Tasks",
      value: `${myCompleted}/${mySubtasks}`,
      icon: Clock,
      color: "bg-amber-50 text-amber-600",
    },
  ];

  // Recent activity from activity logs
  const recentActivity = activityLogs.slice(0, 8);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">
          Welcome back, {user?.name?.split(" ")[0]}
        </h1>
        <p className="text-gray-500 mt-1">Here&apos;s your project overview</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="bg-white rounded-xl border border-gray-200 p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">{label}</span>
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}
              >
                <Icon className="h-5 w-5" />
              </div>
            </div>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-600" />
            <h3 className="font-semibold">Overall Progress</h3>
          </div>
          <span className="text-sm font-medium text-indigo-600">{progress}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div
            className="bg-indigo-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold mb-4">Recent Activity</h3>
        {recentActivity.length === 0 ? (
          <p className="text-sm text-gray-400">No activity yet.</p>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 text-sm"
              >
                {log.type === "approved" ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                ) : (
                  <Clock className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                )}
                <div>
                  {log.type === "approved" ? (
                    <p>
                      <span className="font-medium">{log.userName}</span>
                      {" "}completed{" "}
                      <span className="font-medium">&ldquo;{log.taskTitle}&rdquo;</span>
                      {" "}approved by{" "}
                      <span className="font-medium">{log.reviewerName}</span>
                    </p>
                  ) : (
                    <p>
                      <span className="font-medium">{log.userName}</span>
                      {" "}submitted{" "}
                      <span className="font-medium">&ldquo;{log.taskTitle}&rdquo;</span>
                      {" "}for review to{" "}
                      <span className="font-medium">{log.reviewerName}</span>
                    </p>
                  )}
                  <p className="text-gray-400 text-xs">
                    {log.milestone} &middot;{" "}
                    {new Date(log.timestamp).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    at{" "}
                    {new Date(log.timestamp).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
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
