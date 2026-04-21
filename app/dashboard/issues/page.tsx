"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  getTasks,
  getUsers,
  getReviews,
  updateReview,
  resetSubtasksForUser,
  completeSubtasksForUser,
  createActivityLog,
} from "@/lib/firestore";
import type { Task, User, Review } from "@/lib/types";
import { getUserColor, buildInitialsMap } from "@/lib/colors";
import {
  Loader2,
  X,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Clock,
  ChevronDown,
  MessageSquare,
  ClipboardList,
  Search,
  Filter,
} from "lucide-react";

type Tab = "my-issues" | "review-requests" | "all-issues";

export default function IssuesPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("my-issues");
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "approved" | "not-approved"
  >("all");
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [approvedExpanded, setApprovedExpanded] = useState(false);

  const isManager = user?.role === "manager";
  const initialsMap = buildInitialsMap(users);

  async function load() {
    const [t, u, r] = await Promise.all([getTasks(), getUsers(), getReviews()]);
    setTasks(t);
    setUsers(u);
    setReviews(r);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  // ── Derived data ──────────────────────────────────────
  const myReviews = reviews.filter((r) => r.requesterId === user?.id);
  const myNotApproved = myReviews.filter((r) => r.status === "not-approved");

  const incomingReviews = reviews.filter(
    (r) => r.reviewerId === user?.id && r.status === "pending"
  );

  const notifCount = myNotApproved.length;

  // ── Filtering ─────────────────────────────────────────
  function filterReviews(list: Review[]) {
    let filtered = list;
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.taskTitle.toLowerCase().includes(q) ||
          r.milestone.toLowerCase().includes(q) ||
          r.requesterName.toLowerCase().includes(q) ||
          r.reviewerName.toLowerCase().includes(q) ||
          (r.comment && r.comment.toLowerCase().includes(q))
      );
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }
    return filtered;
  }

  const filteredMyReviews = filterReviews(myReviews);
  const filteredIncoming = search.trim()
    ? incomingReviews.filter((r) => {
        const q = search.toLowerCase();
        return (
          r.taskTitle.toLowerCase().includes(q) ||
          r.milestone.toLowerCase().includes(q) ||
          r.requesterName.toLowerCase().includes(q)
        );
      })
    : incomingReviews;
  const filteredAllReviews = filterReviews(reviews);

  // ── Handlers ──────────────────────────────────────────
  async function handleApprove(review: Review) {
    setSaving(true);
    await updateReview(review.id, {
      status: "approved",
      comment: comment.trim() || null,
      reviewedAt: new Date().toISOString(),
    });
    // Auto-complete the requester's subtasks in Firestore
    await completeSubtasksForUser(review.taskId, review.requesterId);
    // Log activity
    await createActivityLog({
      type: "approved",
      taskId: review.taskId,
      taskTitle: review.taskTitle,
      milestone: review.milestone,
      userId: review.requesterId,
      userName: review.requesterName,
      reviewerId: review.reviewerId,
      reviewerName: review.reviewerName,
      timestamp: new Date().toISOString(),
    });
    setSaving(false);
    setComment("");
    setSelectedReview(null);
    await load();
  }

  async function handleReject(review: Review) {
    if (!comment.trim()) return;
    setSaving(true);
    await updateReview(review.id, {
      status: "not-approved",
      comment: comment.trim(),
      reviewedAt: new Date().toISOString(),
    });
    // Reset the requester's subtasks on this task back to incomplete
    await resetSubtasksForUser(review.taskId, review.requesterId);
    setSaving(false);
    setComment("");
    setSelectedReview(null);
    await load();
  }

  async function handleResubmit(review: Review) {
    setSaving(true);
    await updateReview(review.id, {
      status: "pending",
      comment: null,
      reviewedAt: null,
      requestedAt: new Date().toISOString(),
    });
    setSaving(false);
    await load();
  }

  function toggleExpanded(id: string) {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ── Render helpers ────────────────────────────────────
  function statusBadge(status: Review["status"]) {
    if (status === "pending")
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
          <Clock className="h-3 w-3" />
          Pending
        </span>
      );
    if (status === "approved")
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-green-50 text-green-700">
          <CheckCircle2 className="h-3 w-3" />
          Approved
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-red-50 text-red-600">
        <AlertTriangle className="h-3 w-3" />
        Not Approved
      </span>
    );
  }

  function renderReviewCard(review: Review) {
    const reqColor = getUserColor(review.requesterId);
    const isNotApproved = review.status === "not-approved";
    const isApproved = review.status === "approved";
    const isExpanded = expandedCards.has(review.id);

    return (
      <div
        key={review.id}
        className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col ${
          isNotApproved
            ? "border-red-200 ring-1 ring-red-100"
            : isApproved
            ? "border-green-200"
            : "border-gray-200"
        }`}
      >
        <div className="px-5 pt-5 pb-3 space-y-3">
          {/* Comment on top — the main focus */}
          {isNotApproved && review.comment && (
            <div className="p-3 bg-red-50 rounded-xl border border-red-100">
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                <span className="text-xs font-semibold text-red-600">
                  Review Feedback
                </span>
              </div>
              <p className="text-sm text-red-700">{review.comment}</p>
            </div>
          )}

          {isApproved && review.comment && (
            <div className="p-3 bg-green-50 rounded-xl border border-green-100">
              <div className="flex items-center gap-1.5 mb-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                <span className="text-xs font-semibold text-green-700">
                  Review Feedback
                </span>
              </div>
              <p className="text-sm text-green-700">{review.comment}</p>
            </div>
          )}

          {review.status === "pending" && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-xs font-semibold text-amber-700">
                  Awaiting review from {review.reviewerName}
                </span>
              </div>
            </div>
          )}

          {/* Task info + status */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="font-semibold text-gray-900 leading-snug">
                {review.taskTitle}
              </h4>
              <p className="text-xs text-gray-400 mt-0.5">
                {review.milestone}
              </p>
            </div>
            {statusBadge(review.status)}
          </div>

          {/* Requester info */}
          <div className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-full ${reqColor.bg} ${reqColor.text} text-[10px] font-bold flex items-center justify-center`}
            >
              {initialsMap[review.requesterId] ??
                review.requesterName.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm text-gray-600">
              {review.requesterName}
            </span>
            <span className="text-xs text-gray-400">
              &middot;{" "}
              {new Date(review.requestedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        </div>

        {/* Expandable description */}
        <div className="px-5 pb-4">
          <button
            type="button"
            onClick={() => toggleExpanded(review.id)}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition"
          >
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform duration-200 ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
            {isExpanded ? "Hide details" : "Show details"}
          </button>
          {isExpanded && (
            <div className="mt-3 space-y-3">
              {review.taskDescription && (
                <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-wrap">
                  {review.taskDescription}
                </p>
              )}
              {(() => {
                const task = tasks.find((t) => t.id === review.taskId);
                if (!task) return null;
                const userSubs = task.subtasks.filter(
                  (s) => s.assigneeId === review.requesterId
                );
                if (userSubs.length === 0) return null;
                return (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1.5">
                      Subtasks
                    </p>
                    <div className="space-y-1">
                      {userSubs.map((s) => (
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
              })()}
              {review.reviewedAt && (
                <p className="text-xs text-gray-400">
                  Reviewed:{" "}
                  {new Date(review.reviewedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Click to open detail */}
        <div className="px-5 pb-4 mt-auto space-y-2">
          {isNotApproved && review.requesterId === user?.id && (
            <button
              onClick={() => handleResubmit(review)}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 text-xs font-medium text-white bg-amber-500 hover:bg-amber-600 py-2 rounded-lg transition disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ClipboardList className="h-3.5 w-3.5" />
              )}
              Resubmit for Review
            </button>
          )}
          <button
            onClick={() => setSelectedReview(review)}
            className="w-full text-center text-xs font-medium text-indigo-600 hover:text-indigo-700 py-2 rounded-lg hover:bg-indigo-50 transition"
          >
            View full details
          </button>
        </div>
      </div>
    );
  }

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
      <div>
        <h1 className="text-2xl font-bold">Issues</h1>
        <p className="text-gray-500 text-sm mt-1">
          Task reviews and approval workflow
        </p>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-lg p-1 text-sm w-fit">
        <button
          onClick={() => setTab("my-issues")}
          className={`px-4 py-2 rounded-md transition relative ${
            tab === "my-issues"
              ? "bg-white shadow-sm font-medium"
              : "text-gray-500"
          }`}
        >
          My Issues
          {notifCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {notifCount}
            </span>
          )}
        </button>
        {(isManager ||
          incomingReviews.length > 0 ||
          reviews.some((r) => r.reviewerId === user?.id)) && (
          <button
            onClick={() => setTab("review-requests")}
            className={`px-4 py-2 rounded-md transition relative ${
              tab === "review-requests"
                ? "bg-white shadow-sm font-medium"
                : "text-gray-500"
            }`}
          >
            Review Requests
            {incomingReviews.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-indigo-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {incomingReviews.length}
              </span>
            )}
          </button>
        )}
        <button
          onClick={() => setTab("all-issues")}
          className={`px-4 py-2 rounded-md transition ${
            tab === "all-issues"
              ? "bg-white shadow-sm font-medium"
              : "text-gray-500"
          }`}
        >
          All Issues
        </button>
      </div>

      {/* Search & filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by task, milestone, or person..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        {(tab === "my-issues" || tab === "all-issues") && (
          <div className="relative">
            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as typeof statusFilter)
              }
              className="appearance-none pl-8 pr-8 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="not-approved">Not Approved</option>
            </select>
          </div>
        )}
      </div>

      {/* ── My Issues Tab ─────────────────────────────── */}
      {tab === "my-issues" && (
        <div className="space-y-8">
          {filteredMyReviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <ClipboardList className="h-8 w-8 text-gray-300" />
              </div>
              <p className="text-lg font-medium text-gray-500">
                {search || statusFilter !== "all"
                  ? "No matching issues"
                  : "No issues yet"}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {search || statusFilter !== "all"
                  ? "Try adjusting your search or filter"
                  : "Submit tasks for review from the Tasks tab"}
              </p>
            </div>
          ) : (
            <>
              {/* Not approved group */}
              {filteredMyReviews.filter((r) => r.status === "not-approved")
                .length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Not Approved (
                    {
                      filteredMyReviews.filter(
                        (r) => r.status === "not-approved"
                      ).length
                    }
                    )
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredMyReviews
                      .filter((r) => r.status === "not-approved")
                      .map((r) => renderReviewCard(r))}
                  </div>
                </div>
              )}

              {/* Pending group */}
              {filteredMyReviews.filter((r) => r.status === "pending").length >
                0 && (
                <div>
                  <h3 className="text-sm font-semibold text-amber-700 mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Pending Approval (
                    {
                      filteredMyReviews.filter((r) => r.status === "pending")
                        .length
                    }
                    )
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredMyReviews
                      .filter((r) => r.status === "pending")
                      .map((r) => renderReviewCard(r))}
                  </div>
                </div>
              )}

              {/* Approved group — collapsible dropdown */}
              {filteredMyReviews.filter((r) => r.status === "approved").length >
                0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setApprovedExpanded((prev) => !prev)}
                    className="w-full flex items-center justify-between hover:bg-gray-50 rounded-lg p-2 -m-2 transition mb-3"
                  >
                    <h3 className="text-sm font-semibold text-green-700 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Approved (
                      {
                        filteredMyReviews.filter((r) => r.status === "approved")
                          .length
                      }
                      )
                    </h3>
                    <ChevronDown
                      className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                        approvedExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {approvedExpanded && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {filteredMyReviews
                        .filter((r) => r.status === "approved")
                        .map((r) => renderReviewCard(r))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Review Requests Tab ───────────────────────── */}
      {tab === "review-requests" && (
        <div className="space-y-6">
          {filteredIncoming.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <ClipboardList className="h-8 w-8 text-gray-300" />
              </div>
              <p className="text-lg font-medium text-gray-500">
                {search ? "No matching reviews" : "No pending reviews"}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {search
                  ? "Try adjusting your search"
                  : "All review requests have been handled"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredIncoming.map((r) => renderReviewCard(r))}
            </div>
          )}
        </div>
      )}

      {/* ── All Issues Tab ────────────────────────────── */}
      {tab === "all-issues" && (
        <div className="space-y-8">
          {filteredAllReviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <ClipboardList className="h-8 w-8 text-gray-300" />
              </div>
              <p className="text-lg font-medium text-gray-500">
                {search || statusFilter !== "all"
                  ? "No matching issues"
                  : "No issues yet"}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {search || statusFilter !== "all"
                  ? "Try adjusting your search or filter"
                  : "No review requests have been submitted yet"}
              </p>
            </div>
          ) : (
            <>
              {filteredAllReviews.filter((r) => r.status === "not-approved").length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Not Approved ({filteredAllReviews.filter((r) => r.status === "not-approved").length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredAllReviews.filter((r) => r.status === "not-approved").map((r) => renderReviewCard(r))}
                  </div>
                </div>
              )}
              {filteredAllReviews.filter((r) => r.status === "pending").length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-amber-700 mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Pending Approval ({filteredAllReviews.filter((r) => r.status === "pending").length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredAllReviews.filter((r) => r.status === "pending").map((r) => renderReviewCard(r))}
                  </div>
                </div>
              )}
              {filteredAllReviews.filter((r) => r.status === "approved").length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-green-700 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Approved ({filteredAllReviews.filter((r) => r.status === "approved").length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredAllReviews.filter((r) => r.status === "approved").map((r) => renderReviewCard(r))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Review Detail Modal ──────────────────────────── */}
      {selectedReview &&
        (() => {
          const r = selectedReview;
          const isReviewer = r.reviewerId === user?.id;
          const isPending = r.status === "pending";
          const task = tasks.find((t) => t.id === r.taskId);
          const reqColor = getUserColor(r.requesterId);
          const revColor = getUserColor(r.reviewerId);

          return (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
              onClick={() => {
                setSelectedReview(null);
                setComment("");
              }}
            >
              <div
                className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-gray-900 truncate">
                      {r.taskTitle}
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {r.milestone}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    {statusBadge(r.status)}
                    <button
                      onClick={() => {
                        setSelectedReview(null);
                        setComment("");
                      }}
                      className="text-gray-400 hover:text-gray-600 transition"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-6 py-5 space-y-5">
                  {/* Existing comment — shown first */}
                  {r.comment && !isPending && (
                    <div
                      className={`p-4 rounded-xl border ${
                        r.status === "approved"
                          ? "bg-green-50 border-green-100"
                          : "bg-red-50 border-red-100"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-2">
                        <MessageSquare
                          className={`h-4 w-4 ${
                            r.status === "approved"
                              ? "text-green-600"
                              : "text-red-500"
                          }`}
                        />
                        <span
                          className={`text-sm font-medium ${
                            r.status === "approved"
                              ? "text-green-700"
                              : "text-red-600"
                          }`}
                        >
                          Reviewer Comment
                        </span>
                      </div>
                      <p
                        className={`text-sm ${
                          r.status === "approved"
                            ? "text-green-700"
                            : "text-red-700"
                        }`}
                      >
                        {r.comment}
                      </p>
                    </div>
                  )}

                  {/* Description */}
                  {r.taskDescription && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1.5">
                        Description
                      </h4>
                      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                        {r.taskDescription}
                      </p>
                    </div>
                  )}

                  {/* People */}
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-full ${reqColor.bg} ${reqColor.text} text-[10px] font-bold flex items-center justify-center`}
                      >
                        {initialsMap[r.requesterId] ??
                          r.requesterName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          {r.requesterName}
                        </p>
                        <p className="text-xs text-gray-400">Requester</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-full ${revColor.bg} ${revColor.text} text-[10px] font-bold flex items-center justify-center`}
                      >
                        {initialsMap[r.reviewerId] ??
                          r.reviewerName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          {r.reviewerName}
                        </p>
                        <p className="text-xs text-gray-400">Reviewer</p>
                      </div>
                    </div>
                  </div>

                  {/* Task subtasks */}
                  {task && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Subtasks ({r.requesterName})
                      </h4>
                      <div className="space-y-1.5">
                        {task.subtasks
                          .filter((s) => s.assigneeId === r.requesterId)
                          .map((s) => (
                            <div
                              key={s.id}
                              className="flex items-center gap-2.5 py-1.5 px-3 rounded-lg bg-gray-50"
                            >
                              {s.completed ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                              ) : (
                                <Circle className="h-4 w-4 text-gray-300 shrink-0" />
                              )}
                              <span
                                className={`flex-1 text-sm ${
                                  s.completed
                                    ? "line-through text-gray-400"
                                    : "text-gray-700"
                                }`}
                              >
                                {s.title}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Dates */}
                  <div className="text-xs text-gray-400 space-y-1">
                    <p>
                      Submitted:{" "}
                      {new Date(r.requestedAt).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    {r.reviewedAt && (
                      <p>
                        Reviewed:{" "}
                        {new Date(r.reviewedAt).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>

                  {/* Review actions — only for reviewer on pending reviews */}
                  {isReviewer && isPending && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Comment
                      </label>
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Add a comment (required for rejection)..."
                        rows={3}
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                      />
                    </div>
                  )}
                </div>

                {/* Footer — action buttons for reviewer, nothing otherwise */}
                {isReviewer && isPending && (
                  <div className="px-6 py-4 border-t border-gray-200 shrink-0 flex gap-3">
                    <button
                      onClick={() => handleReject(r)}
                      disabled={saving || !comment.trim()}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50 transition border border-red-200"
                    >
                      {saving && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      <AlertTriangle className="h-4 w-4" />
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprove(r)}
                      disabled={saving}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition"
                    >
                      {saving && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      <CheckCircle2 className="h-4 w-4" />
                      Approve
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
    </div>
  );
}
