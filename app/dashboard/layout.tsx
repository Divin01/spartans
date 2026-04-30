"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getInitials } from "@/lib/colors";
import {
  LayoutDashboard,
  ListTodo,
  CalendarDays,
  Users,
  LogOut,
  Shield,
  Menu,
  X,
  ScrollText,
  AlertCircle,
  BookOpen,
  Wallet,
} from "lucide-react";
import { useState, useEffect, type ReactNode } from "react";
import { getReviews, getTasks, getReadTaskIds, getDeposits, getCashier } from "@/lib/firestore";
import type { Review } from "@/lib/types";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/tasks", label: "Tasks", icon: ListTodo },
  { href: "/dashboard/issues", label: "Issues", icon: AlertCircle },
  { href: "/dashboard/timeline", label: "Timeline", icon: CalendarDays },
  { href: "/dashboard/finance", label: "Finance & Budget", icon: Wallet },
  { href: "/dashboard/team", label: "Team", icon: Users },
  { href: "/dashboard/policy", label: "Group Rules & Policy", icon: BookOpen },
  { href: "/dashboard/logs", label: "Logs", icon: ScrollText, managerOnly: true },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reviewBadge, setReviewBadge] = useState(0);
  const [taskBadge, setTaskBadge] = useState(0);
  const [financeBadge, setFinanceBadge] = useState(0);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    getReviews().then((reviews) => {
      const count =
        reviews.filter(
          (r) => r.requesterId === user.id && r.status === "not-approved"
        ).length +
        reviews.filter(
          (r) => r.reviewerId === user.id && r.status === "pending"
        ).length;
      setReviewBadge(count);
    });
    // Task badge: count tasks assigned to user that haven't been read yet
    Promise.all([getTasks(), getReadTaskIds(user.id)]).then(
      ([tasks, readIds]) => {
        const readSet = new Set(readIds);
        const unreadCount = tasks.filter(
          (t) =>
            t.subtasks.some((s) => s.assigneeId === user.id) &&
            !readSet.has(t.id)
        ).length;
        setTaskBadge(unreadCount);
      }
    );
    // Finance badge: show pending deposits count to the cashier only
    Promise.all([getDeposits(), getCashier()]).then(([deps, cashier]) => {
      if (cashier && cashier.userId === user.id) {
        setFinanceBadge(deps.filter((d) => d.status === "pending").length);
      } else {
        setFinanceBadge(0);
      }
    });
  }, [user, pathname]);

  if (loading || !user) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform lg:relative lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <Shield className="h-6 w-6 text-indigo-600" />
            <span className="text-lg font-bold tracking-tight">Spartans</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems
            .filter((item) => !('managerOnly' in item && item.managerOnly) || user.role === "manager")
            .map(({ href, label, icon: Icon }) => {
            const active =
              href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition relative ${
                  active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
                {href === "/dashboard/tasks" && taskBadge > 0 && (
                  <span className="ml-auto w-5 h-5 bg-green-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {taskBadge}
                  </span>
                )}
                {href === "/dashboard/issues" && reviewBadge > 0 && (
                  <span className="ml-auto w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {reviewBadge}
                  </span>
                )}
                {href === "/dashboard/finance" && financeBadge > 0 && (
                  <span className="ml-auto w-5 h-5 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {financeBadge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold">
              {getInitials(user.name)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user.role}</p>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              router.replace("/");
            }}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 transition"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 lg:px-8 gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <Menu className="h-6 w-6" />
          </button>
          <h2 className="text-lg font-semibold">
            {navItems.find(
              (n) =>
                n.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(n.href)
            )?.label ?? "Dashboard"}
          </h2>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
