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
  description: string;
  documentName: string;
  documentPath: string;
  status: "pending" | "approved" | "declined";
  cashierId: string | null;
  cashierName: string | null;
  comment: string | null;
  submittedAt: string;
  reviewedAt: string | null;
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
