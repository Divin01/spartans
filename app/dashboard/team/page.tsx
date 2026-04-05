"use client";

import { useEffect, useState } from "react";
import { getUsers, getTasks } from "@/lib/firestore";
import type { User, Task } from "@/lib/types";
import { Loader2, Shield, UserIcon } from "lucide-react";

export default function TeamPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getUsers(), getTasks()]).then(([u, t]) => {
      setUsers(u);
      setTasks(t);
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

  function getStats(userId: string) {
    let assigned = 0;
    let completed = 0;
    tasks.forEach((t) =>
      t.subtasks.forEach((s) => {
        if (s.assigneeId === userId) {
          assigned++;
          if (s.completed) completed++;
        }
      })
    );
    return { assigned, completed };
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Team</h1>
        <p className="text-gray-500 text-sm mt-1">
          {users.length} member{users.length !== 1 && "s"}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((u) => {
          const { assigned, completed } = getStats(u.id);
          const pct =
            assigned > 0 ? Math.round((completed / assigned) * 100) : 0;

          return (
            <div
              key={u.id}
              className="bg-white rounded-xl border border-gray-200 p-5"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-base font-bold">
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{u.name}</p>
                  <p className="text-sm text-gray-500 truncate">{u.email}</p>
                </div>
                {u.role === "manager" && (
                  <Shield className="h-4 w-4 text-indigo-500 shrink-0 ml-auto" />
                )}
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <UserIcon className="h-4 w-4" />
                <span className="capitalize">{u.role}</span>
              </div>

              <div className="mt-3">
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-gray-600">Completion</span>
                  <span className="font-medium">
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
