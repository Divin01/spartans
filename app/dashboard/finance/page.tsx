"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  getDeposits,
  createDeposit,
  updateDeposit,
  getCashier,
  getBankingDetails,
  setBankingDetails,
  setCashierPasskey,
} from "@/lib/firestore";
import type { Deposit, CashierSetting, BankingDetails } from "@/lib/types";
import {
  Loader2,
  Plus,
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingUp,
  Wallet,
  FileText,
  Upload,
  ChevronDown,
  MessageSquare,
  ExternalLink,
  Pencil,
  CreditCard,
  Building2,
  KeyRound,
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
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
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
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
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
                <span className="text-sm">Click to attach document</span>
                <span className="text-xs">PDF, image, or Word — max 10 MB</span>
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

  async function decide(status: "approved" | "declined") {
    if (status === "declined" && !comment.trim()) return;
    setSaving(true);
    await updateDeposit(deposit.id, {
      status,
      cashierId,
      cashierName,
      comment: comment.trim() || null,
      reviewedAt: new Date().toISOString(),
    });
    onDone();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
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
                {new Date(deposit.submittedAt).toLocaleDateString("en-ZA", {
                  day: "numeric", month: "short", year: "numeric",
                })}
              </span>
            </div>
          </div>

          {/* Proof of payment */}
          <a
            href={deposit.documentPath}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-100 rounded-xl hover:border-indigo-300 transition"
          >
            <FileText className="h-4 w-4 text-indigo-600 shrink-0" />
            <span className="text-sm text-indigo-700 truncate flex-1">{deposit.documentName}</span>
            <ExternalLink className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
          </a>

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
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
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
      onClick={onClose}
    >
      <form
        onSubmit={handleSave}
        onClick={(e) => e.stopPropagation()}
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
  onReview,
}: {
  deposit: Deposit;
  isCashier: boolean;
  onReview: (d: Deposit) => void;
}) {
  const [expanded, setExpanded] = useState(false);

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
              {new Date(deposit.submittedAt).toLocaleDateString("en-ZA", {
                day: "numeric", month: "short", year: "numeric",
              })}
            </p>
          </div>
          <StatusBadge status={deposit.status} />
        </div>

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
            <a
              href={deposit.documentPath}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 p-2.5 bg-gray-50 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition"
            >
              <FileText className="h-4 w-4 text-indigo-500 shrink-0" />
              <span className="text-xs text-indigo-600 truncate flex-1">{deposit.documentName}</span>
              <ExternalLink className="h-3 w-3 text-gray-400 shrink-0" />
            </a>
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

// ── Main Page ────────────────────────────────────────────
export default function FinancePage() {
  const { user } = useAuth();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [cashier, setCashierState] = useState<CashierSetting | null>(null);
  const [banking, setBanking] = useState<BankingDetails>({
    accountHolder: "Natalie Khensani Mashele",
    accountNumber: "1308531273",
    bankName: "Nedbank",
  });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"deposits" | "breakdown">("deposits");
  const [showNew, setShowNew] = useState(false);
  const [showEditBanking, setShowEditBanking] = useState(false);
  const [showChangePasskey, setShowChangePasskey] = useState(false);
  const [reviewDeposit, setReviewDeposit] = useState<Deposit | null>(null);
  const [filterUser, setFilterUser] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const isCashier = !!cashier && cashier.userId === user?.id;

  async function saveBanking(details: BankingDetails) {
    await setBankingDetails(details);
    setBanking(details);
    setShowEditBanking(false);
  }

  async function load() {
    const [deps, cas, bank] = await Promise.all([getDeposits(), getCashier(), getBankingDetails()]);
    setDeposits(deps);
    setCashierState(cas);
    setBanking(bank);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // ── Budget stats (approved deposits only) ──
  const approvedDeposits = deposits.filter((d) => d.status === "approved");
  const totalBudget = approvedDeposits.reduce((s, d) => s + d.amount, 0);
  const pendingTotal = deposits
    .filter((d) => d.status === "pending")
    .reduce((s, d) => s + d.amount, 0);

  // Unique members who have deposited
  const memberIds = [...new Set(deposits.map((d) => d.userId))];

  // Per-member totals
  const memberTotals = memberIds.map((id) => {
    const name = deposits.find((d) => d.userId === id)?.userName ?? id;
    const total = approvedDeposits.filter((d) => d.userId === id).reduce((s, d) => s + d.amount, 0);
    const count = approvedDeposits.filter((d) => d.userId === id).length;
    return { id, name, total, count };
  }).sort((a, b) => b.total - a.total);

  // Filter
  const filtered = deposits.filter((d) => {
    if (filterUser !== "all" && d.userId !== filterUser) return false;
    if (filterStatus !== "all" && d.status !== filterStatus) return false;
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance & Budget</h1>
          <p className="text-gray-500 text-sm mt-1">
            Monthly contributions and project budget overview
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition shadow-sm shrink-0"
        >
          <Plus className="h-4 w-4" />
          New Deposit
        </button>
      </div>

      {/* Cashier notice */}
      {cashier ? (
        <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-sm">
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
              {pendingCashierReview.length} pending review{pendingCashierReview.length > 1 ? "s" : ""}
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
                    onReview={setReviewDeposit}
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

      {/* Modals */}
      {showNew && user && (
        <NewDepositModal
          onClose={() => setShowNew(false)}
          onDone={async () => { setShowNew(false); await load(); }}
          userName={user.name}
          userId={user.id}
        />
      )}

      {reviewDeposit && cashier && (
        <ReviewModal
          deposit={reviewDeposit}
          onClose={() => setReviewDeposit(null)}
          onDone={async () => { setReviewDeposit(null); await load(); }}
          cashierName={cashier.userName}
          cashierId={cashier.userId}
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
    </div>
  );
}
