"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  getDeposits,
  createDeposit,
  updateDeposit,
  deleteDeposit,
  getCashier,
  getBankingDetails,
  setBankingDetails,
  setCashierPasskey,
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} from "@/lib/firestore";
import type { Deposit, CashierSetting, BankingDetails, Expense } from "@/lib/types";
import {
  Loader2,
  Plus,
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  Wallet,
  FileText,
  Upload,
  ChevronDown,
  MessageSquare,
  ExternalLink,
  Pencil,
  Trash2,
  CreditCard,
  Building2,
  KeyRound,
  Tag,
  ShoppingBag,
  XCircle,
  ReceiptText,
  Banknote,
  BarChart3,
  Link2,
  ImageIcon,
  Globe,
} from "lucide-react";

// ── Helpers ──────────────────────────────────────────────
function fmt(amount: number) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
  }).format(amount);
}

function StatusBadge({ status }: { status: Deposit["status"] }) {
  if (status === "approved")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700">
        <CheckCircle2 className="h-3 w-3" />
        Approved
      </span>
    );
  if (status === "declined")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-600">
        <AlertTriangle className="h-3 w-3" />
        Declined
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
      <Clock className="h-3 w-3" />
      Pending
    </span>
  );
}

// ── Expense constants ────────────────────────────────────
const EXPENSE_CATEGORIES = [
  "Infrastructure & Hosting",
  "Development Tools",
  "Marketing & Design",
  "Legal & Administration",
  "Operations",
  "Hardware & Equipment",
  "Event & Presentation",
  "Miscellaneous",
] as const;

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  "Infrastructure & Hosting":  { bg: "bg-blue-50",    text: "text-blue-700" },
  "Development Tools":         { bg: "bg-purple-50",  text: "text-purple-700" },
  "Marketing & Design":        { bg: "bg-pink-50",    text: "text-pink-700" },
  "Legal & Administration":    { bg: "bg-amber-50",   text: "text-amber-700" },
  "Operations":                { bg: "bg-slate-100",  text: "text-slate-700" },
  "Hardware & Equipment":      { bg: "bg-cyan-50",    text: "text-cyan-700" },
  "Event & Presentation":      { bg: "bg-rose-50",    text: "text-rose-700" },
  "Miscellaneous":             { bg: "bg-gray-100",   text: "text-gray-600" },
};

const isSupportedProofImage = (file: File) => {
  return (
    file.type.startsWith("image/") ||
    /\.(jpe?g|png|webp|heic|heif|gif|bmp|tiff)$/i.test(file.name)
  );
};

function normalizeSourceUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

function displaySourceHost(url: string): string {
  try {
    return new URL(normalizeSourceUrl(url)).hostname.replace(/^www\./, "");
  } catch {
    return url.trim();
  }
}

async function uploadProofImage(file: File): Promise<{ path: string; name: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.error ?? "Upload failed");
  }
  return res.json();
}

function imageFileFromClipboard(
  data: DataTransfer | null | undefined
): File | null {
  if (!data) return null;

  const items = data.items ? Array.from(data.items) : [];
  for (const item of items) {
    if (item.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (file) return file;
    }
  }

  const files = data.files ? Array.from(data.files) : [];
  return files.find((f) => f.type.startsWith("image/") || isSupportedProofImage(f)) ?? null;
}

function applyPastedSourceImage(
  file: File,
  onApply: (file: File) => void,
  onError: (message: string) => void
): boolean {
  if (!isSupportedProofImage(file)) {
    onError("Unsupported pasted image. Use JPG, PNG, WEBP, or other common image formats.");
    return false;
  }
  onApply(file);
  return true;
}

function ExpenseSourceReference({
  expense,
  compact = false,
}: {
  expense: Expense;
  compact?: boolean;
}) {
  if (!expense.hasSourceReference) return null;

  const imagePath = expense.sourceImagePath?.trim();
  const link = expense.sourceLink?.trim();
  const hasImage = !!imagePath;
  const hasLink = !!link;

  if (!hasImage && !hasLink) return null;

  const href = hasLink ? normalizeSourceUrl(link) : imagePath!;
  const host = hasLink ? displaySourceHost(link) : "View product image";

  if (compact) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2.5 p-2.5 rounded-xl border border-sky-100 bg-sky-50/80 hover:border-sky-200 hover:bg-sky-50 transition group"
      >
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imagePath}
            alt={expense.sourceImageName || "Source reference"}
            className="w-10 h-10 rounded-lg object-cover shrink-0 ring-1 ring-white"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center shrink-0">
            <Globe className="h-4 w-4 text-sky-600" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-sky-900 truncate">Source reference</p>
          <p className="text-[11px] text-sky-600 truncate">{host}</p>
        </div>
        <ExternalLink className="h-3.5 w-3.5 text-sky-400 group-hover:text-sky-600 shrink-0" />
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-2xl overflow-hidden border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-indigo-50 shadow-sm hover:shadow-md hover:border-sky-200 transition-all duration-300"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imagePath}
            alt={expense.sourceImageName || "Product or item reference"}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-sky-100 to-indigo-100">
            <Globe className="h-10 w-10 text-sky-500/70" />
            <p className="text-xs font-medium text-sky-700/80">Website reference</p>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/75 via-gray-900/10 to-transparent opacity-90" />
        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/90 text-sky-700 backdrop-blur-sm shadow-sm">
            <Link2 className="h-3 w-3" />
            Source
          </span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <p className="text-sm font-semibold text-white truncate">
            {hasLink ? host : expense.sourceImageName || "Product reference"}
          </p>
          <p className="text-xs text-white/75 mt-0.5 flex items-center gap-1.5">
            {hasLink ? (
              <>
                <span className="truncate">{normalizeSourceUrl(link)}</span>
                <ExternalLink className="h-3 w-3 shrink-0 opacity-80 group-hover:opacity-100" />
              </>
            ) : (
              <>Tap to view full image</>
            )}
          </p>
        </div>
      </div>
    </a>
  );
}

function SourceReferenceToggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-orange-100 bg-gradient-to-r from-orange-50/80 to-amber-50/50">
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
          <Link2 className="h-5 w-5 text-orange-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">Source reference</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
            Share the product image and/or store link so the whole team can verify the expense.
          </p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={`relative shrink-0 w-12 h-7 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 ${
          enabled ? "bg-orange-500" : "bg-gray-200"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200 ${
            enabled ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

// ── Expense Status Badge ─────────────────────────────────
function ExpenseStatusBadge({ status }: { status: Expense["status"] }) {
  if (status === "paid")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700">
        <CheckCircle2 className="h-3 w-3" />
        Paid
      </span>
    );
  if (status === "declined")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-600">
        <XCircle className="h-3 w-3" />
        Declined
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
      <ShoppingBag className="h-3 w-3" />
      Planned
    </span>
  );
}

// ── New Deposit Modal ────────────────────────────────────
function NewDepositModal({
  onClose,
  onDone,
  userName,
  userId,
}: {
  onClose: () => void;
  onDone: () => void;
  userName: string;
  userId: string;
}) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) {
      setError("Please enter a valid amount.");
      return;
    }
    if (!file) {
      setError("Please attach a proof of payment document.");
      return;
    }
    if (!isSupportedProofImage(file)) {
      setError("Unsupported proof of payment file. Only image screenshots are supported, such as JPG, JPEG, PNG, HEIC, or other images.");
      return;
    }
    setSaving(true);
    try {
      // Upload file first
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Upload failed");
      }
      const { path, name } = await res.json();

      await createDeposit({
        userId,
        userName,
        amount: parsed,
        description: description.trim(),
        documentName: name,
        documentPath: path,
        status: "pending",
        cashierId: null,
        cashierName: null,
        comment: null,
        submittedAt: new Date().toISOString(),
        reviewedAt: null,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
    >
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-base font-semibold text-gray-900">New Deposit</h2>
            <p className="text-xs text-gray-400 mt-0.5">Submit your monthly contribution</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Amount (ZAR) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">R</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. April monthly contribution"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Proof of Payment <span className="text-red-500">*</span>
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.heic"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <div className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                <FileText className="h-4 w-4 text-indigo-600 shrink-0" />
                <span className="text-sm text-indigo-700 truncate flex-1">{file.name}</span>
                <button
                  type="button"
                  onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                  className="text-indigo-400 hover:text-indigo-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full flex flex-col items-center gap-2 p-5 border-2 border-dashed border-gray-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition text-gray-400 hover:text-indigo-500"
              >
                <Upload className="h-6 w-6" />
                <span className="text-sm">Click to attach payment image</span>
                <span className="text-xs">Images only — JPG, PNG, HEIC, WEBP supported; max 10 MB</span>
              </button>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
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
            Submit Deposit
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Review Modal (cashier only) ──────────────────────────
function ReviewModal({
  deposit,
  onClose,
  onDone,
  cashierName,
  cashierId,
}: {
  deposit: Deposit;
  onClose: () => void;
  onDone: () => void;
  cashierName: string;
  cashierId: string;
}) {
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [reviewError, setReviewError] = useState("");

  async function decide(status: "approved" | "declined") {
    if (status === "declined" && !comment.trim()) return;
    setReviewError("");
    setSaving(true);
    try {
      await updateDeposit(deposit.id, {
        status,
        cashierId,
        cashierName,
        comment: comment.trim() || null,
        reviewedAt: new Date().toISOString(),
      });
      onDone();
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Failed to save review. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Review Deposit</h2>
            <p className="text-xs text-gray-400 mt-0.5">by {deposit.userName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Deposit info */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Amount</span>
              <span className="text-lg font-bold text-gray-900">{fmt(deposit.amount)}</span>
            </div>
            {deposit.description && (
              <div className="flex items-start justify-between gap-4">
                <span className="text-sm text-gray-500">Description</span>
                <span className="text-sm text-gray-700 text-right">{deposit.description}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Submitted</span>
              <span className="text-sm text-gray-600">
                {deposit.submittedAt
                  ? new Date(deposit.submittedAt).toLocaleDateString("en-ZA", {
                      day: "numeric", month: "short", year: "numeric",
                    })
                  : "—"}
              </span>
            </div>
          </div>

          {/* Proof of payment */}
          {deposit.documentPath ? (
            <a
              href={deposit.documentPath}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-100 rounded-xl hover:border-indigo-300 transition"
            >
              <FileText className="h-4 w-4 text-indigo-600 shrink-0" />
              <span className="text-sm text-indigo-700 truncate flex-1">{deposit.documentName || "View document"}</span>
              <ExternalLink className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
            </a>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
              <FileText className="h-4 w-4 text-gray-400 shrink-0" />
              <span className="text-sm text-gray-400">No document attached</span>
            </div>
          )}

          {/* Comment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Comment <span className="text-gray-400 font-normal">(required for decline)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Leave a note for the member..."
              rows={3}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
          {reviewError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{reviewError}</p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
          <button
            onClick={() => decide("declined")}
            disabled={saving || !comment.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 disabled:opacity-50 transition"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            <AlertTriangle className="h-4 w-4" />
            Decline
          </button>
          <button
            onClick={() => decide("approved")}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            <CheckCircle2 className="h-4 w-4" />
            Approve
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Change Passkey Modal (cashier only) ──────────────────────────────────────
function ChangePasskeyModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (key: string) => Promise<void>;
}) {
  const [newKey, setNewKey] = useState("");
  const [confirmKey, setConfirmKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (newKey.length < 6) { setError("Passkey must be at least 6 characters."); return; }
    if (newKey !== confirmKey) { setError("Passkeys do not match."); return; }
    setSaving(true);
    await onSave(newKey);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
    >
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Change Passkey</h2>
            <p className="text-xs text-gray-400 mt-0.5">Update your cashier login passkey</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">New Passkey</label>
            <input
              type="password"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="Min. 6 characters"
              autoFocus
              required
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Confirm Passkey</label>
            <input
              type="password"
              value={confirmKey}
              onChange={(e) => setConfirmKey(e.target.value)}
              onPaste={(e) => e.preventDefault()}
              placeholder="Re-enter new passkey"
              required
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 transition flex items-center gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Passkey
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Edit Banking Details Modal ──────────────────────────────
function EditBankingModal({
  current,
  onClose,
  onSave,
}: {
  current: BankingDetails;
  onClose: () => void;
  onSave: (d: BankingDetails) => Promise<void>;
}) {
  const [holder, setHolder] = useState(current.accountHolder);
  const [number, setNumber] = useState(current.accountNumber);
  const [bank, setBank] = useState(current.bankName);
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!holder.trim() || !number.trim() || !bank.trim()) return;
    setSaving(true);
    await onSave({ accountHolder: holder.trim(), accountNumber: number.trim(), bankName: bank.trim() });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
    >
      <form
        onSubmit={handleSave}
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Edit Banking Details</h2>
            <p className="text-xs text-gray-400 mt-0.5">Only you (cashier) can update this</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Account Holder
            </label>
            <input
              value={holder}
              onChange={(e) => setHolder(e.target.value)}
              placeholder="Full name"
              required
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Account Number
            </label>
            <input
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="e.g. 1308531273"
              required
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Bank Name
            </label>
            <input
              value={bank}
              onChange={(e) => setBank(e.target.value)}
              placeholder="e.g. Nedbank"
              required
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
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
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Deposit Card ─────────────────────────────────────────
function DepositCard({
  deposit,
  isCashier,
  currentUserId,
  onReview,
  onDelete,
}: {
  deposit: Deposit;
  isCashier: boolean;
  currentUserId?: string;
  onReview: (d: Deposit) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canDelete =
    deposit.status === "pending" && deposit.userId === currentUserId;

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteDeposit(deposit.id);
      onDelete(deposit.id);
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div
      className={`bg-white border rounded-2xl overflow-hidden transition-all ${
        deposit.status === "approved"
          ? "border-green-200"
          : deposit.status === "declined"
          ? "border-red-200"
          : "border-gray-200"
      }`}
    >
      <div className="px-5 py-4 space-y-3">
        {/* Comment banner */}
        {deposit.status === "declined" && deposit.comment && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{deposit.comment}</p>
          </div>
        )}
        {deposit.status === "approved" && deposit.comment && (
          <div className="p-3 bg-green-50 border border-green-100 rounded-xl flex items-start gap-2">
            <MessageSquare className="h-3.5 w-3.5 text-green-600 shrink-0 mt-0.5" />
            <p className="text-sm text-green-700">{deposit.comment}</p>
          </div>
        )}

        {/* Main row */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-bold text-gray-900">{fmt(deposit.amount)}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {deposit.userName} ·{" "}
              {deposit.submittedAt
                ? new Date(deposit.submittedAt).toLocaleDateString("en-ZA", {
                    day: "numeric", month: "short", year: "numeric",
                  })
                : "—"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={deposit.status} />
            {canDelete && !confirmDelete && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
                title="Delete deposit"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Inline delete confirmation */}
        {confirmDelete && (
          <div className="flex items-center justify-between gap-2 p-2.5 bg-red-50 border border-red-100 rounded-xl">
            <span className="text-xs text-red-700 font-medium">Delete this deposit?</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs px-2.5 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        )}

        {deposit.description && (
          <p className="text-sm text-gray-500">{deposit.description}</p>
        )}
      </div>

      {/* Expandable details */}
      <div className="px-5 pb-4">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-600 transition"
        >
          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
          {expanded ? "Hide details" : "Show details"}
        </button>

        {expanded && (
          <div className="mt-3 space-y-3">
            {deposit.documentPath ? (
              <a
                href={deposit.documentPath!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 p-2.5 bg-gray-50 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition"
              >
                <FileText className="h-4 w-4 text-indigo-500 shrink-0" />
                <span className="text-xs text-indigo-600 truncate flex-1">{deposit.documentName || "View document"}</span>
                <ExternalLink className="h-3 w-3 text-gray-400 shrink-0" />
              </a>
            ) : (
              <div className="flex items-center gap-2.5 p-2.5 bg-gray-50 border border-gray-200 rounded-lg">
                <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                <span className="text-xs text-gray-400">No document attached</span>
              </div>
            )}
            {deposit.cashierName && (
              <p className="text-xs text-gray-400">
                {deposit.status === "approved" ? "Approved" : "Reviewed"} by {deposit.cashierName}
                {deposit.reviewedAt && (
                  <> · {new Date(deposit.reviewedAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}</>
                )}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Cashier action */}
      {isCashier && deposit.status === "pending" && (
        <div className="px-5 pb-4">
          <button
            onClick={() => onReview(deposit)}
            className="w-full text-center text-xs font-semibold text-indigo-600 hover:text-indigo-700 py-2 rounded-xl hover:bg-indigo-50 border border-indigo-100 transition"
          >
            Review this deposit
          </button>
        </div>
      )}
    </div>
  );
}

// ── New Expense Modal ────────────────────────────────────
function NewExpenseModal({
  onClose,
  onDone,
  userName,
  userId,
}: {
  onClose: () => void;
  onDone: () => void;
  userName: string;
  userId: string;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [hasSourceReference, setHasSourceReference] = useState(false);
  const [sourceLink, setSourceLink] = useState("");
  const [sourceImage, setSourceImage] = useState<File | null>(null);
  const [sourceImagePreview, setSourceImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const sourceImageRef = useRef<HTMLInputElement>(null);

  const handleSourceImageChange = useCallback((file: File | null) => {
    setSourceImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
    setSourceImage(file);
  }, []);

  const handleSourceImagePaste = useCallback(
    (e: React.ClipboardEvent | ClipboardEvent) => {
      const file = imageFileFromClipboard(e.clipboardData);
      if (!file) return false;
      e.preventDefault();
      if (applyPastedSourceImage(file, handleSourceImageChange, setError)) {
        setError("");
      }
      return true;
    },
    [handleSourceImageChange]
  );

  useEffect(() => {
    if (!hasSourceReference) return;

    function onWindowPaste(e: ClipboardEvent) {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "TEXTAREA" ||
          (target.tagName === "INPUT" &&
            (target as HTMLInputElement).type !== "file" &&
            !(target as HTMLInputElement).type.startsWith("hidden")))
      ) {
        const text = e.clipboardData?.getData("text/plain")?.trim();
        if (text && !imageFileFromClipboard(e.clipboardData)) return;
      }

      handleSourceImagePaste(e);
    }

    window.addEventListener("paste", onWindowPaste);
    return () => window.removeEventListener("paste", onWindowPaste);
  }, [hasSourceReference, handleSourceImagePaste]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const parsed = parseFloat(amount);
    if (!title.trim()) { setError("Please enter a title."); return; }
    if (!parsed || parsed <= 0) { setError("Please enter a valid amount."); return; }

    if (hasSourceReference) {
      const link = sourceLink.trim();
      if (!link && !sourceImage) {
        setError("Add a product image and/or website link for the source reference.");
        return;
      }
      if (link) {
        try {
          new URL(normalizeSourceUrl(link));
        } catch {
          setError("Please enter a valid website link (e.g. https://store.example.com/item).");
          return;
        }
      }
      if (sourceImage && !isSupportedProofImage(sourceImage)) {
        setError("Unsupported image. Use JPG, PNG, WEBP, or other common image formats.");
        return;
      }
    }

    setSaving(true);
    try {
      let sourceImageName: string | null = null;
      let sourceImagePath: string | null = null;

      if (hasSourceReference && sourceImage) {
        const uploaded = await uploadProofImage(sourceImage);
        sourceImageName = uploaded.name;
        sourceImagePath = uploaded.path;
      }

      await createExpense({
        title: title.trim(),
        category,
        amount: parsed,
        description: description.trim() || null,
        submittedBy: userId,
        submittedByName: userName,
        submittedAt: new Date().toISOString(),
        status: "planned",
        reviewedBy: null,
        reviewedByName: null,
        reviewedAt: null,
        declineReason: null,
        proofDocumentName: null,
        proofDocumentPath: null,
        paidAt: null,
        hasSourceReference,
        sourceLink: hasSourceReference && sourceLink.trim() ? normalizeSourceUrl(sourceLink) : null,
        sourceImageName,
        sourceImagePath,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
    >
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Plan New Expense</h2>
            <p className="text-xs text-gray-400 mt-0.5">Submit an expense request for approval</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Domain registration fee"
              autoFocus
              required
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Amount (ZAR) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">R</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className="w-full pl-8 pr-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide context or justification for this expense..."
              rows={3}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
            />
          </div>

          <SourceReferenceToggle
            enabled={hasSourceReference}
            onChange={(v) => {
              setHasSourceReference(v);
              if (!v) {
                setSourceLink("");
                handleSourceImageChange(null);
                if (sourceImageRef.current) sourceImageRef.current.value = "";
              }
            }}
          />

          {hasSourceReference && (
            <div
              onPaste={handleSourceImagePaste}
              className="space-y-4 p-4 rounded-2xl border border-dashed border-orange-200 bg-orange-50/30 outline-none focus-within:ring-2 focus-within:ring-orange-300/60 focus-within:border-orange-300"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Website link <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="url"
                    value={sourceLink}
                    onChange={(e) => setSourceLink(e.target.value)}
                    placeholder="https://store.example.com/product"
                    className="w-full pl-10 pr-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Product image <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  ref={sourceImageRef}
                  type="file"
                  accept="image/*,.heic"
                  className="hidden"
                  onChange={(e) => handleSourceImageChange(e.target.files?.[0] ?? null)}
                />
                {sourceImage && sourceImagePreview ? (
                  <div className="relative rounded-2xl overflow-hidden border border-orange-200 bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={sourceImagePreview}
                      alt="Source preview"
                      className="w-full aspect-[16/10] object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
                      <p className="text-xs text-white truncate">{sourceImage.name}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        handleSourceImageChange(null);
                        if (sourceImageRef.current) sourceImageRef.current.value = "";
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => sourceImageRef.current?.click()}
                    className="w-full flex flex-col items-center gap-2 p-5 border-2 border-dashed border-orange-200 rounded-2xl hover:border-orange-300 hover:bg-orange-50/50 transition text-gray-400 hover:text-orange-600 group bg-white"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <ImageIcon className="h-6 w-6 text-orange-500" />
                    </div>
                    <span className="text-sm font-medium">Upload product or item photo</span>
                    <span className="text-xs text-center px-4">
                      Click to browse, or press{" "}
                      <kbd className="px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-700 font-mono text-[10px]">
                        Ctrl+V
                      </kbd>{" "}
                      to paste a screenshot
                    </span>
                    <span className="text-xs text-center px-4 text-gray-400">
                      Visible to all members · JPG, PNG, WEBP · max 10 MB
                    </span>
                  </button>
                )}
              </div>

              <p className="text-xs text-orange-700/80 bg-orange-50 rounded-xl px-3 py-2 border border-orange-100">
                Provide at least a link or an image. Paste a screenshot with Ctrl+V anywhere in this section, or from elsewhere in the form.
              </p>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-white border border-gray-200 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl text-sm font-medium bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 transition flex items-center gap-2 shadow-sm"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            <ShoppingBag className="h-4 w-4" />
            Submit Expense
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Review Expense Modal ─────────────────────────────────
function ReviewExpenseModal({
  expense,
  onClose,
  onDone,
  reviewerName,
  reviewerId,
}: {
  expense: Expense;
  onClose: () => void;
  onDone: () => void;
  reviewerName: string;
  reviewerId: string;
}) {
  const [action, setAction] = useState<"approve" | "decline" | null>(null);
  const [comment, setComment] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const catStyle = CATEGORY_COLORS[expense.category] ?? { bg: "bg-gray-100", text: "text-gray-600" };

  async function handleApprove() {
    setError("");
    if (!proofFile) { setError("Please attach the payment proof or receipt before approving."); return; }
    if (!isSupportedProofImage(proofFile)) {
      setError("Unsupported proof of payment file. Only image screenshots are supported, such as JPG, JPEG, PNG, HEIC, or other images.");
      return;
    }
    setSaving(true);
    try {
      const { path, name } = await uploadProofImage(proofFile);
      const now = new Date().toISOString();
      await updateExpense(expense.id, {
        status: "paid",
        reviewedBy: reviewerId,
        reviewedByName: reviewerName,
        reviewedAt: now,
        declineReason: null,
        proofDocumentName: name,
        proofDocumentPath: path,
        paidAt: now,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve. Please try again.");
      setSaving(false);
    }
  }

  async function handleDecline() {
    setError("");
    if (!comment.trim()) { setError("Please provide a reason for declining."); return; }
    setSaving(true);
    try {
      await updateExpense(expense.id, {
        status: "declined",
        reviewedBy: reviewerId,
        reviewedByName: reviewerName,
        reviewedAt: new Date().toISOString(),
        declineReason: comment.trim(),
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to decline. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Review Expense Request</h2>
            <p className="text-xs text-gray-400 mt-0.5">Submitted by {expense.submittedByName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Expense summary card */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-5 border border-gray-200 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="font-bold text-gray-900 text-base">{expense.title}</p>
                <span className={`inline-flex items-center gap-1.5 mt-2 text-xs font-medium px-2.5 py-1 rounded-full ${catStyle.bg} ${catStyle.text}`}>
                  <Tag className="h-2.5 w-2.5" />
                  {expense.category}
                </span>
              </div>
              <div className="text-right shrink-0">
                <p className="text-2xl font-bold text-gray-900">{fmt(expense.amount)}</p>
                <p className="text-xs text-gray-400 mt-0.5">Requested amount</p>
              </div>
            </div>
            {expense.description && (
              <p className="text-sm text-gray-600 pt-3 border-t border-gray-200 leading-relaxed">{expense.description}</p>
            )}
            <div className="flex items-center gap-4 pt-1 text-xs text-gray-400 border-t border-gray-200">
              <span>Submitted {expense.submittedAt
                ? new Date(expense.submittedAt).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })
                : "—"}</span>
            </div>
          </div>

          {expense.hasSourceReference && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5 text-sky-500" />
                Source reference · visible to all members
              </p>
              <ExpenseSourceReference expense={expense} />
            </div>
          )}

          {/* Action selection */}
          {!action && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Choose an action</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setAction("approve")}
                  className="group flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-green-100 bg-green-50 hover:border-green-400 hover:bg-green-100 transition"
                >
                  <div className="w-10 h-10 rounded-xl bg-green-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-green-800">Approve & Pay</p>
                    <p className="text-xs text-green-600 mt-0.5 leading-tight">Attach receipt · deducts from balance</p>
                  </div>
                </button>
                <button
                  onClick={() => setAction("decline")}
                  className="group flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-red-100 bg-red-50 hover:border-red-400 hover:bg-red-100 transition"
                >
                  <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                    <XCircle className="h-5 w-5" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-red-800">Decline</p>
                    <p className="text-xs text-red-600 mt-0.5 leading-tight">Reject with a reason</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Approve flow */}
          {action === "approve" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <button
                  onClick={() => { setAction(null); setError(""); setProofFile(null); }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
                  title="Go back"
                >
                  <ChevronDown className="h-4 w-4 rotate-90" />
                </button>
                <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center">
                  <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                </div>
                <h3 className="text-sm font-semibold text-gray-800">Approve &amp; Mark as Paid</h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Proof / Receipt <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-400 mb-2.5">
                  Attach the bank receipt, invoice, or proof confirming the payment was made.
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,.heic"
                  className="hidden"
                  onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                />
                {proofFile ? (
                  <div className="flex items-center gap-3 p-3.5 bg-green-50 border border-green-200 rounded-xl">
                    <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm text-green-800 font-medium truncate flex-1">{proofFile.name}</span>
                    <button
                      type="button"
                      onClick={() => { setProofFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                      className="text-green-400 hover:text-green-700 transition"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-full flex flex-col items-center gap-2 p-5 border-2 border-dashed border-gray-200 rounded-xl hover:border-green-300 hover:bg-green-50 transition text-gray-400 hover:text-green-600 group"
                  >
                    <Upload className="h-6 w-6 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium">Click to attach receipt or proof</span>
                    <span className="text-xs">Images only — JPG, PNG, HEIC, WEBP supported; max 10 MB</span>
                  </button>
                )}
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2.5 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {error}
                </p>
              )}

              <button
                onClick={handleApprove}
                disabled={saving || !proofFile}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition shadow-sm"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Approve &amp; Mark as Paid
              </button>
            </div>
          )}

          {/* Decline flow */}
          {action === "decline" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <button
                  onClick={() => { setAction(null); setError(""); setComment(""); }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
                  title="Go back"
                >
                  <ChevronDown className="h-4 w-4 rotate-90" />
                </button>
                <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center">
                  <XCircle className="h-3.5 w-3.5 text-white" />
                </div>
                <h3 className="text-sm font-semibold text-gray-800">Decline this expense</h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Reason for declining <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Explain why this expense is being declined so the requester understands..."
                  rows={4}
                  autoFocus
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2.5 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {error}
                </p>
              )}

              <button
                onClick={handleDecline}
                disabled={saving || !comment.trim()}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition shadow-sm"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                Decline Expense
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Expense Card ─────────────────────────────────────────
function ExpenseCard({
  expense,
  canReview,
  canDelete,
  onReview,
  onDelete,
}: {
  expense: Expense;
  canReview: boolean;
  canDelete: boolean;
  onReview: (e: Expense) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const catStyle = CATEGORY_COLORS[expense.category] ?? { bg: "bg-gray-100", text: "text-gray-600" };

  const borderColor =
    expense.status === "paid" ? "border-green-200" :
    expense.status === "declined" ? "border-red-200" :
    "border-amber-200";

  const topGradient =
    expense.status === "paid" ? "from-green-500 to-emerald-400" :
    expense.status === "declined" ? "from-red-500 to-rose-400" :
    "from-amber-400 to-orange-400";

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteExpense(expense.id);
      onDelete(expense.id);
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div className={`bg-white border rounded-2xl overflow-hidden transition-shadow hover:shadow-md ${borderColor}`}>
      {/* Thin color accent */}
      <div className={`h-0.5 bg-gradient-to-r ${topGradient}`} />

      <div className="px-5 py-4 space-y-3">
        {/* Decline reason banner */}
        {expense.status === "declined" && expense.declineReason && (
          <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-100 rounded-xl">
            <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 leading-relaxed">{expense.declineReason}</p>
          </div>
        )}

        {/* Category + status row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${catStyle.bg} ${catStyle.text}`}>
            <Tag className="h-2.5 w-2.5" />
            {expense.category}
          </span>
          <ExpenseStatusBadge status={expense.status} />
        </div>

        {/* Title + amount */}
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-semibold text-gray-900 leading-snug flex-1">{expense.title}</p>
          <div className="shrink-0 flex items-center gap-2">
            <p className="text-lg font-bold text-gray-900">{fmt(expense.amount)}</p>
            {canDelete && expense.status === "planned" && !confirmDelete && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
                title="Delete expense"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Submitter + date */}
        <p className="text-xs text-gray-400">
          Submitted by <span className="font-medium text-gray-600">{expense.submittedByName}</span>
          {expense.submittedAt && (
            <> · {new Date(expense.submittedAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}</>
          )}
        </p>

        {/* Description */}
        {expense.description && (
          <p className="text-sm text-gray-500 leading-relaxed">{expense.description}</p>
        )}

        {/* Source reference — always visible for team transparency */}
        <ExpenseSourceReference expense={expense} />

        {/* Inline delete confirmation */}
        {confirmDelete && (
          <div className="flex items-center justify-between gap-2 p-2.5 bg-red-50 border border-red-100 rounded-xl">
            <span className="text-xs text-red-700 font-medium">Delete this expense?</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs px-2.5 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Expandable details */}
      <div className="px-5 pb-4">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-600 transition"
        >
          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
          {expanded ? "Hide details" : "Show details"}
        </button>

        {expanded && (
          <div className="mt-3 space-y-2.5">
            {expense.status === "paid" && (
              expense.proofDocumentPath ? (
                <a
                  href={expense.proofDocumentPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 p-2.5 bg-green-50 border border-green-200 rounded-xl hover:border-green-300 transition"
                >
                  <ReceiptText className="h-4 w-4 text-green-600 shrink-0" />
                  <span className="text-xs text-green-700 font-medium truncate flex-1">
                    {expense.proofDocumentName || "View payment proof"}
                  </span>
                  <ExternalLink className="h-3 w-3 text-green-500 shrink-0" />
                </a>
              ) : (
                <div className="flex items-center gap-2.5 p-2.5 bg-gray-50 border border-gray-200 rounded-xl">
                  <ReceiptText className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className="text-xs text-gray-400">No receipt attached</span>
                </div>
              )
            )}
            {expense.reviewedByName && expense.status !== "planned" && (
              <p className="text-xs text-gray-400">
                {expense.status === "paid" ? "Approved" : "Declined"} by{" "}
                <span className="font-medium text-gray-600">{expense.reviewedByName}</span>
                {expense.reviewedAt && (
                  <> · {new Date(expense.reviewedAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}</>
                )}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Review action (for reviewer only) */}
      {canReview && expense.status === "planned" && (
        <div className="px-5 pb-4">
          <button
            onClick={() => onReview(expense)}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700 py-2.5 rounded-xl hover:bg-orange-50 border border-orange-100 hover:border-orange-200 transition"
          >
            <ReceiptText className="h-3.5 w-3.5" />
            Review this expense
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────
export default function FinancePage() {
  const { user } = useAuth();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cashier, setCashierState] = useState<CashierSetting | null>(null);
  const [banking, setBanking] = useState<BankingDetails>({
    accountHolder: "Natalie Khensani Mashele",
    accountNumber: "1308531273",
    bankName: "Nedbank",
  });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"deposits" | "breakdown" | "expenses">("deposits");
  const [showNew, setShowNew] = useState(false);
  const [showNewExpense, setShowNewExpense] = useState(false);
  const [showEditBanking, setShowEditBanking] = useState(false);
  const [showChangePasskey, setShowChangePasskey] = useState(false);
  const [reviewDeposit, setReviewDeposit] = useState<Deposit | null>(null);
  const [reviewExpense, setReviewExpense] = useState<Expense | null>(null);
  const [filterUser, setFilterUser] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [expenseFilterCat, setExpenseFilterCat] = useState<string>("all");
  const [expenseFilterStatus, setExpenseFilterStatus] = useState<string>("all");

  const isCashier = !!cashier && cashier.userId === user?.id;
  const isManager = user?.role === "manager";

  // Determine if current user can review a given expense
  function canReviewExpense(e: Expense): boolean {
    if (e.submittedBy === user?.id) return false; // cannot review own expense
    if (e.submittedBy === cashier?.userId) return isManager; // cashier submitted → PM reviews
    return isCashier; // anyone else submitted → cashier reviews
  }

  async function saveBanking(details: BankingDetails) {
    await setBankingDetails(details);
    setBanking(details);
    setShowEditBanking(false);
  }

  async function load() {
    try {
      const [deps, cas, bank, exps] = await Promise.all([
        getDeposits(), getCashier(), getBankingDetails(), getExpenses(),
      ]);
      setDeposits(deps);
      setCashierState(cas);
      setBanking(bank);
      setExpenses(exps);
    } catch (err) {
      console.error("Failed to load finance data:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // ── Budget stats (approved deposits only) ──
  const approvedDeposits = deposits.filter((d) => d.status === "approved");
  const totalBudget = approvedDeposits.reduce((s, d) => s + d.amount, 0);
  const pendingTotal = deposits
    .filter((d) => d.status === "pending")
    .reduce((s, d) => s + d.amount, 0);

  // ── Expense stats ──
  const paidExpenses = expenses.filter((e) => e.status === "paid");
  const plannedExpenses = expenses.filter((e) => e.status === "planned");
  const totalExpended = paidExpenses.reduce((s, e) => s + e.amount, 0);
  const plannedTotal = plannedExpenses.reduce((s, e) => s + e.amount, 0);
  const availableBalance = totalBudget - totalExpended;

  const pendingExpenseCount = plannedExpenses.filter((e) => canReviewExpense(e)).length;

  // Unique members who have deposited
  const memberIds = [...new Set(deposits.map((d) => d.userId))];

  // Per-member totals
  const memberTotals = memberIds.map((id) => {
    const name = deposits.find((d) => d.userId === id)?.userName ?? id;
    const total = approvedDeposits.filter((d) => d.userId === id).reduce((s, d) => s + d.amount, 0);
    const count = approvedDeposits.filter((d) => d.userId === id).length;
    return { id, name, total, count };
  }).sort((a, b) => b.total - a.total);

  // Filter deposits
  const filtered = deposits.filter((d) => {
    if (filterUser !== "all" && d.userId !== filterUser) return false;
    if (filterStatus !== "all" && d.status !== filterStatus) return false;
    return true;
  });

  // Filter expenses
  const filteredExpenses = expenses.filter((e) => {
    if (expenseFilterCat !== "all" && e.category !== expenseFilterCat) return false;
    if (expenseFilterStatus !== "all" && e.status !== expenseFilterStatus) return false;
    return true;
  });

  const pendingCashierReview = deposits.filter((d) => d.status === "pending");

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
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance &amp; Budget</h1>
          <p className="text-gray-500 text-sm mt-1">
            Contributions, expenses, and project budget overview
          </p>
        </div>
        <div className="flex items-center gap-2">
          {tab === "expenses" && (isManager || isCashier) && (
            <button
              onClick={() => setShowNewExpense(true)}
              className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-orange-700 transition shadow-sm shrink-0"
            >
              <Plus className="h-4 w-4" />
              New Expense
            </button>
          )}
          {tab === "deposits" && (
            <button
              onClick={() => setShowNew(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition shadow-sm shrink-0"
            >
              <Plus className="h-4 w-4" />
              New Deposit
            </button>
          )}
        </div>
      </div>

      {/* Cashier notice */}
      {cashier ? (
        <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-sm flex-wrap">
          <Wallet className="h-4 w-4 text-indigo-600 shrink-0" />
          <span className="text-indigo-700">
            Cashier: <strong>{cashier.userName}</strong>
            {isCashier && (
              <span className="ml-2 text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                That&apos;s you
              </span>
            )}
          </span>
          {isCashier && (
            <button
              onClick={() => setShowChangePasskey(true)}
              title="Change your login passkey"
              className="ml-auto flex items-center gap-1.5 text-xs font-medium text-indigo-500 hover:text-indigo-700 transition"
            >
              <KeyRound className="h-3.5 w-3.5" />
              Change Passkey
            </button>
          )}
          {isCashier && pendingCashierReview.length > 0 && (
            <span className={`${!isCashier ? "ml-auto" : ""} text-xs font-semibold bg-amber-500 text-white px-2.5 py-1 rounded-full`}>
              {pendingCashierReview.length} deposit{pendingCashierReview.length > 1 ? "s" : ""} pending
            </span>
          )}
          {pendingExpenseCount > 0 && (
            <span className="text-xs font-semibold bg-orange-500 text-white px-2.5 py-1 rounded-full">
              {pendingExpenseCount} expense{pendingExpenseCount > 1 ? "s" : ""} to review
            </span>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          No cashier assigned yet. The Project Manager can assign one from the Team page.
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1 text-sm w-fit">
        <button
          onClick={() => setTab("deposits")}
          className={`px-5 py-2 rounded-lg transition font-medium ${
            tab === "deposits" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Deposits
        </button>
        <button
          onClick={() => setTab("breakdown")}
          className={`px-5 py-2 rounded-lg transition font-medium ${
            tab === "breakdown" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Contribution Breakdown
        </button>
        <button
          onClick={() => setTab("expenses")}
          className={`relative px-5 py-2 rounded-lg transition font-medium ${
            tab === "expenses" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Expenses
          {pendingExpenseCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">
              {pendingExpenseCount > 9 ? "9+" : pendingExpenseCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Deposits Tab ── */}
      {tab === "deposits" && (
        <div className="space-y-6">
          {/* Budget overview cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-5 text-white">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 opacity-80" />
                <p className="text-sm font-medium opacity-80">Total Budget</p>
              </div>
              <p className="text-3xl font-bold">{fmt(totalBudget)}</p>
              <p className="text-xs opacity-60 mt-1">
                {approvedDeposits.length} approved deposit{approvedDeposits.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="bg-white border border-amber-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-amber-500" />
                <p className="text-sm font-medium text-gray-600">Pending</p>
              </div>
              <p className="text-3xl font-bold text-gray-900">{fmt(pendingTotal)}</p>
              <p className="text-xs text-gray-400 mt-1">
                {deposits.filter((d) => d.status === "pending").length} awaiting approval
              </p>
            </div>
            {/* Banking Details card */}
            <div className="relative bg-white border border-gray-200 rounded-2xl p-5 overflow-hidden">
              {/* Nedbank green top accent */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-600 to-emerald-400 rounded-t-2xl" />
              {isCashier && (
                <button
                  onClick={() => setShowEditBanking(true)}
                  title="Edit banking details"
                  className="absolute top-3.5 right-3.5 p-1.5 rounded-lg text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 transition"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="h-4 w-4 text-green-600" />
                <p className="text-sm font-medium text-gray-600">Banking Details</p>
              </div>
              <p className="text-sm font-semibold text-gray-900 leading-snug pr-6">{banking.accountHolder}</p>
              <p className="text-lg font-mono font-bold text-gray-800 tracking-widest mt-1.5">
                {banking.accountNumber.replace(/(.{4})(.{3})(.+)/, "$1 $2 $3")}
              </p>
              <div className="flex items-center gap-1.5 mt-2">
                <Building2 className="h-3 w-3 text-green-600" />
                <p className="text-xs font-semibold text-green-700">{banking.bankName}</p>
              </div>
            </div>
          </div>

          {/* Deposit list */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-gray-800">
                All Deposits ({deposits.length})
              </h2>
              <div className="flex gap-2">
                <select
                  value={filterUser}
                  onChange={(e) => setFilterUser(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Members</option>
                  {memberTotals.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="declined">Declined</option>
                </select>
              </div>
            </div>
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-200 rounded-2xl">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                  <Wallet className="h-7 w-7 text-gray-300" />
                </div>
                <p className="text-gray-500 font-medium">No deposits yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  {filterUser !== "all" || filterStatus !== "all"
                    ? "Try adjusting the filters"
                    : "Be the first to make a contribution"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map((d) => (
                  <DepositCard
                    key={d.id}
                    deposit={d}
                    isCashier={isCashier}
                    currentUserId={user?.id}
                    onReview={setReviewDeposit}
                    onDelete={(id) => setDeposits((prev) => prev.filter((x) => x.id !== id))}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Contribution Breakdown Tab ── */}
      {tab === "breakdown" && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-5 text-white">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 opacity-80" />
                <p className="text-sm font-medium opacity-80">Total Approved Budget</p>
              </div>
              <p className="text-3xl font-bold">{fmt(totalBudget)}</p>
              <p className="text-xs opacity-60 mt-1">{approvedDeposits.length} approved payments</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Wallet className="h-4 w-4 text-gray-400" />
                <p className="text-sm font-medium text-gray-600">Contributors</p>
              </div>
              <p className="text-3xl font-bold text-gray-900">{memberIds.length}</p>
              <p className="text-xs text-gray-400 mt-1">members with approved deposits</p>
            </div>
          </div>

          {memberTotals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-200 rounded-2xl">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <TrendingUp className="h-7 w-7 text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium">No contributions yet</p>
              <p className="text-sm text-gray-400 mt-1">Approved deposits will appear here</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-800">Per-Member Breakdown</h2>
                <span className="text-xs text-gray-400">{memberTotals.length} contributor{memberTotals.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="divide-y divide-gray-100">
                {memberTotals.map((m, i) => {
                  const pct = totalBudget > 0 ? Math.round((m.total / totalBudget) * 100) : 0;
                  const colors = [
                    "bg-indigo-500", "bg-violet-500", "bg-sky-500",
                    "bg-emerald-500", "bg-amber-500", "bg-rose-500",
                  ];
                  const bar = colors[i % colors.length];
                  return (
                    <div key={m.id} className="px-5 py-4 flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-sm font-semibold text-gray-800 truncate">{m.name}</p>
                          <div className="flex items-center gap-2 shrink-0 ml-3">
                            <span className="text-sm font-bold text-gray-900">{fmt(m.total)}</span>
                            <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{pct}%</span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${bar}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{m.count} approved payment{m.count !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Total row */}
              <div className="px-5 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">Total</span>
                <span className="text-base font-bold text-indigo-700">{fmt(totalBudget)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Expenses Tab ── */}
      {tab === "expenses" && (
        <div className="space-y-6">
          {/* Balance summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Available Balance — most prominent */}
            <div className={`col-span-2 lg:col-span-1 rounded-2xl p-5 text-white ${
              availableBalance <= 0
                ? "bg-gradient-to-br from-red-600 to-red-700"
                : availableBalance < totalBudget * 0.2
                ? "bg-gradient-to-br from-amber-500 to-orange-600"
                : "bg-gradient-to-br from-emerald-600 to-green-700"
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <Banknote className="h-4 w-4 opacity-80" />
                <p className="text-sm font-medium opacity-80">Available Balance</p>
              </div>
              <p className="text-3xl font-bold">{fmt(availableBalance)}</p>
              <p className="text-xs opacity-70 mt-1">
                {availableBalance <= 0 ? "Budget exhausted" : `${totalBudget > 0 ? Math.round((availableBalance / totalBudget) * 100) : 0}% of total income`}
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-indigo-500" />
                <p className="text-sm font-medium text-gray-600">Total Income</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{fmt(totalBudget)}</p>
              <p className="text-xs text-gray-400 mt-1">{approvedDeposits.length} approved deposit{approvedDeposits.length !== 1 ? "s" : ""}</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown className="h-4 w-4 text-green-600" />
                <p className="text-sm font-medium text-gray-600">Total Spent</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{fmt(totalExpended)}</p>
              <p className="text-xs text-gray-400 mt-1">{paidExpenses.length} paid expense{paidExpenses.length !== 1 ? "s" : ""}</p>
            </div>

            <div className="bg-white border border-amber-100 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <ShoppingBag className="h-4 w-4 text-amber-500" />
                <p className="text-sm font-medium text-gray-600">Planned</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{fmt(plannedTotal)}</p>
              <p className="text-xs text-gray-400 mt-1">{plannedExpenses.length} awaiting approval</p>
            </div>
          </div>

          {/* Budget bar visualisation */}
          {totalBudget > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-gray-400" />
                  Budget Utilisation
                </h3>
                <span className="text-xs text-gray-400">
                  {fmt(totalExpended + plannedTotal)} committed of {fmt(totalBudget)}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div className="h-full flex rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-green-500 to-emerald-400 transition-all"
                    style={{ width: `${Math.min((totalExpended / totalBudget) * 100, 100)}%` }}
                  />
                  <div
                    className="bg-gradient-to-r from-amber-400 to-orange-400 transition-all"
                    style={{ width: `${Math.min((plannedTotal / totalBudget) * 100, 100 - (totalExpended / totalBudget) * 100)}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-5 mt-2.5">
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                  Spent {fmt(totalExpended)}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                  Planned {fmt(plannedTotal)}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-gray-200 inline-block" />
                  Available {fmt(availableBalance)}
                </span>
              </div>
            </div>
          )}

          {/* Expense list */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <ReceiptText className="h-4 w-4 text-gray-400" />
                All Expenses ({expenses.length})
              </h2>
              <div className="flex gap-2 flex-wrap">
                <select
                  value={expenseFilterCat}
                  onChange={(e) => setExpenseFilterCat(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="all">All Categories</option>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <select
                  value={expenseFilterStatus}
                  onChange={(e) => setExpenseFilterStatus(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="all">All Status</option>
                  <option value="planned">Planned</option>
                  <option value="paid">Paid</option>
                  <option value="declined">Declined</option>
                </select>
              </div>
            </div>

            {filteredExpenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-200 rounded-2xl">
                <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center mb-4">
                  <ReceiptText className="h-7 w-7 text-orange-200" />
                </div>
                <p className="text-gray-500 font-medium">No expenses yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  {expenseFilterCat !== "all" || expenseFilterStatus !== "all"
                    ? "Try adjusting the filters"
                    : (isManager || isCashier)
                    ? "Plan your first expense using the button above"
                    : "Expenses submitted by the team will appear here"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredExpenses.map((e) => (
                  <ExpenseCard
                    key={e.id}
                    expense={e}
                    canReview={canReviewExpense(e)}
                    canDelete={e.submittedBy === user?.id}
                    onReview={setReviewExpense}
                    onDelete={(id) => setExpenses((prev) => prev.filter((x) => x.id !== id))}
                  />
                ))}
              </div>
            )}

            {/* Records summary for paid expenses */}
            {paidExpenses.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-800">Payment History</h3>
                  <span className="text-xs text-gray-400">{paidExpenses.length} completed payment{paidExpenses.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {paidExpenses.map((e) => {
                    const catStyle = CATEGORY_COLORS[e.category] ?? { bg: "bg-gray-100", text: "text-gray-600" };
                    return (
                      <div key={e.id} className="px-5 py-3.5 flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${catStyle.bg}`}>
                          <ReceiptText className={`h-4 w-4 ${catStyle.text}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{e.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {e.category}
                            {e.paidAt && <> · {new Date(e.paidAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}</>}
                            {e.reviewedByName && <> · Approved by {e.reviewedByName}</>}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-bold text-gray-900">{fmt(e.amount)}</p>
                          {e.proofDocumentPath && (
                            <a
                              href={e.proofDocumentPath}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-indigo-500 hover:text-indigo-700 transition flex items-center gap-1 justify-end mt-0.5"
                            >
                              <ExternalLink className="h-2.5 w-2.5" /> Receipt
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">Total Spent</span>
                  <span className="text-base font-bold text-red-600">− {fmt(totalExpended)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {showNew && user && (
        <NewDepositModal
          onClose={() => setShowNew(false)}
          onDone={async () => { setShowNew(false); await load(); }}
          userName={user.name}
          userId={user.id}
        />
      )}

      {reviewDeposit && cashier && user && (
        <ReviewModal
          deposit={reviewDeposit}
          onClose={() => setReviewDeposit(null)}
          onDone={async () => { setReviewDeposit(null); await load(); }}
          cashierName={user.name}
          cashierId={user.id}
        />
      )}

      {showEditBanking && (
        <EditBankingModal
          current={banking}
          onClose={() => setShowEditBanking(false)}
          onSave={saveBanking}
        />
      )}

      {showChangePasskey && (
        <ChangePasskeyModal
          onClose={() => setShowChangePasskey(false)}
          onSave={async (key) => {
            await setCashierPasskey(key);
            setShowChangePasskey(false);
          }}
        />
      )}

      {showNewExpense && user && (
        <NewExpenseModal
          onClose={() => setShowNewExpense(false)}
          onDone={async () => { setShowNewExpense(false); await load(); }}
          userName={user.name}
          userId={user.id}
        />
      )}

      {reviewExpense && user && (
        <ReviewExpenseModal
          expense={reviewExpense}
          onClose={() => setReviewExpense(null)}
          onDone={async () => { setReviewExpense(null); await load(); }}
          reviewerName={user.name}
          reviewerId={user.id}
        />
      )}
    </div>
  );
}
