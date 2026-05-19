export interface User {
  id: string;
  name: string;
  email: string;
  role: "manager" | "member";
  createdAt: string;
}

export interface Subtask {
  id: string;
  title: string;
  assigneeId: string;
  assigneeName: string;
  completed: boolean;
  completedAt?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  milestone: string;
  subtasks: Subtask[];
  createdAt: string;
  createdBy: string;
  dueDate?: string;
}

export interface LoginLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: "manager" | "member";
  loginAt: string;
  action?: "login" | "task-view";
}

export interface Review {
  id: string;
  taskId: string;
  taskTitle: string;
  taskDescription: string;
  milestone: string;
  requesterId: string;
  requesterName: string;
  reviewerId: string;
  reviewerName: string;
  status: "pending" | "approved" | "not-approved";
  comment: string | null;
  requestedAt: string;
  reviewedAt: string | null;
}

export interface ActivityLog {
  id: string;
  type: "submitted" | "approved";
  taskId: string;
  taskTitle: string;
  milestone: string;
  userId: string;
  userName: string;
  reviewerId: string;
  reviewerName: string;
  timestamp: string;
}

export interface Deposit {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  description?: string | null;
  documentName?: string | null;
  documentPath?: string | null;
  status: "pending" | "approved" | "declined";
  cashierId?: string | null;
  cashierName?: string | null;
  comment?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
}

export interface CashierSetting {
  userId: string;
  userName: string;
  userEmail: string;
  assignedBy: string;
  assignedAt: string;
}

export interface BankingDetails {
  accountHolder: string;
  accountNumber: string;
  bankName: string;
}

export interface Expense {
  id: string;
  title: string;
  category: string;
  amount: number;
  description?: string | null;
  submittedBy: string;
  submittedByName: string;
  submittedAt: string;
  status: "planned" | "paid" | "declined";
  reviewedBy?: string | null;
  reviewedByName?: string | null;
  reviewedAt?: string | null;
  declineReason?: string | null;
  proofDocumentName?: string | null;
  proofDocumentPath?: string | null;
  paidAt?: string | null;
}

// ── Project / Timeline ───────────────────────────────────
export interface PhaseTask {
  id: string;          // e.g. "4.1"
  title: string;
  start: string;       // ISO date string
  end: string;         // ISO date string
  owners: string[];
}

export interface Phase {
  id: string;          // e.g. "4"
  title: string;       // e.g. "Phase 4: Platform Development"
  start: string;
  end: string;
  tasks: PhaseTask[];
}

export interface KeyMilestone {
  title: string;
  date: string;        // ISO date string (YYYY-MM-DD)
  status: "done" | "active" | "upcoming" | "target";
}

export interface ProjectConfig {
  projectStart: string;   // ISO date — fixed project start
  projectEnd: string;     // ISO date — investor pitch / final target
  totalPlannedTasks: number; // total subtasks at project start
  phases: Phase[];
  keyMilestones: KeyMilestone[];
  updatedAt: string;
  updatedBy: string;
}
