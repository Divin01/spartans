"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  getTasks,
  getUsers,
  getReviews,
  createReview,
  updateReview,
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
  Send,
  ChevronDown,
  MessageSquare,
  ClipboardList,
} from "lucide-react";

type Tab = "my-issues" | "review-requests";

export default function IssuesPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("my-issues");
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [submitModal, setSubmitModal] = useState<Task | null>(null);
  const [reviewerSelect, setReviewerSelect] = useState<string>("");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

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
  // Reviews where I am the requester (my submitted reviews)
  const myReviews = reviews.filter((r) => r.requesterId === user?.id);
  const myPending = myReviews.filter((r) => r.status === "pending");
  const myNotApproved = myReviews.filter((r) => r.status === "not-approved");
  const myApproved = myReviews.filter((r) => r.status === "approved");

  // Reviews where I am the reviewer (incoming for me to review)
  const incomingReviews = reviews.filter(
    (r) => r.reviewerId === user?.id && r.status === "pending"
  );

  // Tasks I can submit for review: tasks where I have subtasks, all my subtasks are completed,
  // and there's no pending/not-approved review for this task+me already
  const mySubmittableTasks = tasks.filter((t) => {
    const mySubs = t.subtasks.filter((s) => s.assigneeId === user?.id);
    if (mySubs.length === 0) return false;
    if (!mySubs.every((s) => s.completed)) return false;
    // No active review for this task from me
    const existing = reviews.find(
      (r) =>
        r.taskId === t.id &&
        r.requesterId === user?.id &&
        (r.status === "pending" || r.status === "approved")
    );
    return !existing;
  });

  // PM's tasks where PM's subtasks are all completed (for PM to submit to a selected reviewer)
  const pmSubmittableTasks = isManager
    ? tasks.filter((t) => {
        const mySubs = t.subtasks.filter((s) => s.assigneeId === user?.id);
        if (mySubs.length === 0) return false;
        if (!mySubs.every((s) => s.completed)) return false;
        const existing = reviews.find(
          (r) =>
            r.taskId === t.id &&
            r.requesterId === user?.id &&
            (r.status === "pending" || r.status === "approved")
        );
        return !existing;
      })
    : [];

  // Notification count for the member: not-approved reviews
  const notifCount = myNotApproved.length;

  // ── Handlers ──────────────────────────────────────────
  async function handleSubmitForReview(task: Task, reviewerId?: string) {
    if (!user) return;
    setSaving(true);

    // Determine reviewer
    let revId = reviewerId;
    let revName = "";

    if (isManager && reviewerId) {
      // PM selecting a specific reviewer
      const reviewer = users.find((u) => u.id === reviewerId);
      if (!reviewer) {
        setSaving(false);
        return;
      }
      revId = reviewer.id;
      revName = reviewer.name;
    } else {
      // Member → PM reviews
      const manager = users.find((u) => u.role === "manager");
      if (!manager) {
        setSaving(false);
        return;
      }
      revId = manager.id;
      revName = manager.name;
    }

    await createReview({
      taskId: task.id,
      taskTitle: task.title,
      taskDescription: task.description,
      milestone: task.milestone,
      requesterId: user.id,
      requesterName: user.name,
      reviewerId: revId!,
      reviewerName: revName,
      status: "pending",
      comment: null,
      requestedAt: new Date().toISOString(),
      reviewedAt: null,
    });

    setSaving(false);
    setSubmitModal(null);
    setReviewerSelect("");
    await load();
  }

  async function handleApprove(review: Review) {
    setSaving(true);
    await updateReview(review.id, {
      status: "approved",
      comment: comment.trim() || null,
      reviewedAt: new Date().toISOString(),
    });
    setSaving(false);
    setComment("");
    setSelectedReview(null);
    await load();
  }

  async function handleReject(review: Review) {
    if (!comment.trim()) return; // Comment required for rejection
    setSaving(true);
    await updateReview(review.id, {
      status: "not-approved",
      comment: comment.trim(),
      reviewedAt: new Date().toISOString(),
    });
    setSaving(false);
    setComment("");
    setSelectedReview(null);
    await load();
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

  function renderReviewCard(review: Review, clickable = true) {
    const reqColor = getUserColor(review.requesterId);
    const isNotApproved = review.status === "not-approved";

    return (
      <div
        key={review.id}
        onClick={() => clickable && setSelectedReview(review)}
        className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col ${
          clickable ? "cursor-pointer hover:shadow-md" : ""
        } ${
          isNotApproved
            ? "border-red-200 ring-1 ring-red-100"
            : "border-gray-200 hover:border-indigo-200"
        }`}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className="font-semibold text-gray-900 leading-snug">
              {review.taskTitle}
            </h4>
            {statusBadge(review.status)}
          </div>
          <p className="text-xs text-gray-400 mb-2">{review.milestone}</p>
          {review.taskDescription && (
            <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-3">
              {review.taskDescription}
            </p>
          )}

          {/* Requester info */}
          <div className="flex items-center gap-2 mb-2">
            <div
              className={`w-6 h-6 rounded-full ${reqColor.bg} ${reqColor.text} text-[10px] font-bold flex items-center justify-center`}
            >
              {initialsMap[review.requesterId] ??
                review.requesterName.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm text-gray-600">
              {review.requesterName}
            </span>
            <span className="text-xs text-gray-400">requested review</span>
          </div>

          {/* Date */}
          <p className="text-xs text-gray-400">
            {new Date(review.requestedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        {/* Comment preview for not-approved */}
        {isNotApproved && review.comment && (
          <div className="mx-5 mb-4 p-3 bg-red-50 rounded-xl border border-red-100">
            <div className="flex items-center gap-1.5 mb-1">
              <MessageSquare className="h-3.5 w-3.5 text-red-500" />
              <span className="text-xs font-medium text-red-600">
                Reviewer Comment
              </span>
            </div>
            <p className="text-sm text-red-700 line-clamp-2">
              {review.comment}
            </p>
          </div>
        )}

        {/* Approved comment */}
        {review.status === "approved" && review.comment && (
          <div className="mx-5 mb-4 p-3 bg-green-50 rounded-xl border border-green-100">
            <div className="flex items-center gap-1.5 mb-1">
              <MessageSquare className="h-3.5 w-3.5 text-green-600" />
              <span className="text-xs font-medium text-green-700">
                Reviewer Comment
              </span>
            </div>
            <p className="text-sm text-green-700 line-clamp-2">
              {review.comment}
            </p>
          </div>
        )}
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Issues</h1>
          <p className="text-gray-500 text-sm mt-1">
            Task reviews and approval workflow
          </p>
        </div>
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
        {(isManager || incomingReviews.length > 0) && (
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
      </div>

      {/* ── My Issues Tab ─────────────────────────────── */}
      {tab === "my-issues" && (
        <div className="space-y-8">
          {/* Submit for review section */}
          {(mySubmittableTasks.length > 0 ||
            (isManager && pmSubmittableTasks.length > 0)) && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Send className="h-4 w-4 text-indigo-500" />
                Ready for Review
              </h3>
              <p className="text-xs text-gray-400 mb-4">
                These tasks have all your subtasks completed. Submit them for
                review.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {(isManager ? pmSubmittableTasks : mySubmittableTasks).map(
                  (task) => {
                    const mySubs = task.subtasks.filter(
                      (s) => s.assigneeId === user?.id
                    );
                    const done = mySubs.filter((s) => s.completed).length;

                    return (
                      <div
                        key={task.id}
                        className="bg-white rounded-2xl border border-gray-200 hover:border-indigo-200 hover:shadow-md transition-all duration-200 flex flex-col"
                      >
                        <div className="px-5 pt-5 pb-3">
                          <h4 className="font-semibold text-gray-900 mb-1">
                            {task.title}
                          </h4>
                          <p className="text-xs text-gray-400 mb-2">
                            {task.milestone}
                          </p>
                          {task.description && (
                            <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                              {task.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                            <span className="text-green-600 font-medium">
                              {done}/{mySubs.length} subtasks done
                            </span>
                          </div>
                        </div>
                        <div className="px-5 pb-5 mt-auto">
                          <button
                            onClick={() => setSubmitModal(task)}
                            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition"
                          >
                            <Send className="h-4 w-4" />
                            Submit for Review
                          </button>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          )}

          {/* Not approved - with red alerts */}
          {myNotApproved.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Not Approved ({myNotApproved.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {myNotApproved.map((r) => renderReviewCard(r))}
              </div>
            </div>
          )}

          {/* Pending */}
          {myPending.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-amber-700 mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pending Approval ({myPending.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {myPending.map((r) => renderReviewCard(r))}
              </div>
            </div>
          )}

          {/* Approved */}
          {myApproved.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-green-700 mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Approved ({myApproved.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {myApproved.map((r) => renderReviewCard(r))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {myReviews.length === 0 && mySubmittableTasks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <ClipboardList className="h-8 w-8 text-gray-300" />
              </div>
              <p className="text-lg font-medium text-gray-500">
                No issues yet
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Complete your subtasks to submit tasks for review
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Review Requests Tab (PM & selected reviewers) ── */}
      {tab === "review-requests" && (
        <div className="space-y-6">
          {incomingReviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <ClipboardList className="h-8 w-8 text-gray-300" />
              </div>
              <p className="text-lg font-medium text-gray-500">
                No pending reviews
              </p>
              <p className="text-sm text-gray-400 mt-1">
                All review requests have been handled
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {incomingReviews.map((r) => renderReviewCard(r))}
            </div>
          )}
        </div>
      )}

      {/* ── Submit for Review Modal ──────────────────────── */}
      {submitModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => {
            setSubmitModal(null);
            setReviewerSelect("");
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Submit for Review</h2>
              <button
                onClick={() => {
                  setSubmitModal(null);
                  setReviewerSelect("");
                }}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {submitModal.title}
                </p>
                <p className="text-xs text-gray-400">{submitModal.milestone}</p>
              </div>

              {submitModal.description && (
                <p className="text-sm text-gray-500 leading-relaxed">
                  {submitModal.description}
                </p>
              )}

              {/* Show subtasks */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">
                  Your Subtasks
                </p>
                <div className="space-y-1.5">
                  {submitModal.subtasks
                    .filter((s) => s.assigneeId === user?.id)
                    .map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                        <span className="text-gray-600">{s.title}</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* PM selects reviewer */}
              {isManager && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Reviewer
                  </label>
                  <div className="space-y-2">
                    {users
                      .filter((u) => u.id !== user?.id)
                      .map((u) => {
                        const selected = reviewerSelect === u.id;
                        const c = getUserColor(u.id);
                        return (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => setReviewerSelect(u.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left text-sm transition ${
                              selected
                                ? "bg-indigo-50 border-indigo-300 text-indigo-800"
                                : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                            }`}
                          >
                            <div
                              className={`w-8 h-8 rounded-full ${c.bg} ${c.text} text-xs font-bold flex items-center justify-center`}
                            >
                              {initialsMap[u.id] ??
                                u.name.charAt(0).toUpperCase()}
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
                </div>
              )}

              {!isManager && (
                <div className="p-3 bg-indigo-50 rounded-xl">
                  <p className="text-sm text-indigo-700">
                    This will be sent to the project manager for review.
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setSubmitModal(null);
                  setReviewerSelect("");
                }}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleSubmitForReview(
                    submitModal,
                    isManager ? reviewerSelect : undefined
                  )
                }
                disabled={saving || (isManager && !reviewerSelect)}
                className="px-5 py-2.5 rounded-xl text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition flex items-center gap-2"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                <Send className="h-4 w-4" />
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Review Detail Modal ──────────────────────────── */}
      {selectedReview && (() => {
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
                  <p className="text-xs text-gray-400 mt-0.5">{r.milestone}</p>
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

                {/* Existing comment */}
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

                {/* Review actions — only for reviewer on pending reviews */}
                {isReviewer && isPending && (
                  <div className="space-y-3">
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
                    <div className="flex gap-3">
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
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 shrink-0">
                <button
                  onClick={() => {
                    setSelectedReview(null);
                    setComment("");
                  }}
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
