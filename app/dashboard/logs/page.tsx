"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { getLoginLogs } from "@/lib/firestore";
import type { LoginLog } from "@/lib/types";
import { getUserColor, buildInitialsMap } from "@/lib/colors";
import { Loader2, ScrollText, Shield, UserIcon } from "lucide-react";

export default function LogsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user?.role !== "manager") {
      router.replace("/dashboard");
      return;
    }
    if (!authLoading && user) {
      getLoginLogs().then((l) => {
        setLogs(l);
        setLoading(false);
      });
    }
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // Group logs by date
  const grouped: Record<string, LoginLog[]> = {};
  for (const log of logs) {
    const dateKey = new Date(log.loginAt).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(log);
  }

  // Build initials from unique users in logs
  const uniqueUsers = [
    ...new Map(logs.map((l) => [l.userId, { id: l.userId, name: l.userName }])).values(),
  ];
  const initialsMap = buildInitialsMap(uniqueUsers);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Login Logs</h1>
        <p className="text-gray-500 text-sm mt-1">
          Track when team members sign into the system
        </p>
      </div>

      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <ScrollText className="h-8 w-8 text-gray-300" />
          </div>
          <p className="text-lg font-medium text-gray-500">No login activity yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Logs will appear here after members sign in
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, dayLogs]) => (
            <div key={date}>
              <h3 className="text-sm font-semibold text-gray-500 mb-3">
                {date}
              </h3>
              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                {dayLogs.map((log) => {
                  const color = getUserColor(log.userId);
                  const time = new Date(log.loginAt).toLocaleTimeString(
                    "en-US",
                    { hour: "numeric", minute: "2-digit", second: "2-digit" }
                  );

                  return (
                    <div
                      key={log.id}
                      className="flex items-center gap-4 px-5 py-4"
                    >
                      <div
                        className={`w-10 h-10 rounded-full ${color.bg} ${color.text} flex items-center justify-center text-sm font-bold shrink-0`}
                      >
                        {initialsMap[log.userId] ?? log.userName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 truncate">
                            {log.userName}
                          </p>
                          {log.userRole === "manager" && (
                            <Shield className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-gray-500 truncate">
                          {log.userEmail}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium text-gray-700">
                          {time}
                        </p>
                        <p className="text-xs text-gray-400 capitalize">
                          {log.userRole}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
