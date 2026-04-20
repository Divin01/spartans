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
