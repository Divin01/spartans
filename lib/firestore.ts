import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  setDoc,
} from "firebase/firestore";
import { db } from "@/firebase";
import type { User, Task, Subtask, LoginLog, Review, ActivityLog, Deposit, CashierSetting, BankingDetails } from "./types";

// ── Users ───────────────────────────────────────────────
export async function getUsers(): Promise<User[]> {
  const snap = await getDocs(
    query(collection(db, "users"), orderBy("name"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as User));
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const q = query(collection(db, "users"), where("email", "==", email));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as User;
}

export async function createUser(
  user: Omit<User, "id" | "createdAt">
): Promise<string> {
  const ref = await addDoc(collection(db, "users"), {
    ...user,
    createdAt: new Date().toISOString(),
  });
  return ref.id;
}

// ── Tasks ───────────────────────────────────────────────
export async function getTasks(): Promise<Task[]> {
  const snap = await getDocs(
    query(collection(db, "tasks"), orderBy("createdAt", "asc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Task));
}

export async function getTask(id: string): Promise<Task | null> {
  const ref = doc(db, "tasks", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Task;
}

export async function createTask(
  task: Omit<Task, "id" | "createdAt">
): Promise<string> {
  const ref = await addDoc(collection(db, "tasks"), {
    ...task,
    createdAt: new Date().toISOString(),
  });
  return ref.id;
}

export async function updateTask(
  id: string,
  data: Partial<Task>
): Promise<void> {
  await updateDoc(doc(db, "tasks", id), data as Record<string, unknown>);
}

export async function deleteTask(id: string): Promise<void> {
  await deleteDoc(doc(db, "tasks", id));
}

export async function toggleSubtask(
  taskId: string,
  subtaskId: string,
  completed: boolean,
  subtasks: Subtask[]
): Promise<void> {
  const updated = subtasks.map((s) =>
    s.id === subtaskId
      ? {
          ...s,
          completed,
          completedAt: completed ? new Date().toISOString() : null,
        }
      : s
  );
  await updateDoc(doc(db, "tasks", taskId), { subtasks: updated });
}

// ── Login Logs ──────────────────────────────────────────
export async function logLogin(user: User): Promise<void> {
  await addDoc(collection(db, "loginLogs"), {
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    userRole: user.role,
    loginAt: new Date().toISOString(),
    action: "login",
  });
}

export async function logTaskView(user: User): Promise<void> {
  await addDoc(collection(db, "loginLogs"), {
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    userRole: user.role,
    loginAt: new Date().toISOString(),
    action: "task-view",
  });
}

export async function getLoginLogs(): Promise<LoginLog[]> {
  const snap = await getDocs(
    query(collection(db, "loginLogs"), orderBy("loginAt", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as LoginLog));
}

// ── Manager Passkey ─────────────────────────────────────
export async function getManagerPasskey(): Promise<string | null> {
  const snap = await getDoc(doc(db, "settings", "managerPasskey"));
  if (!snap.exists()) return null;
  return (snap.data().key as string) ?? null;
}

// ── Cashier Passkey ─────────────────────────────────────
export async function getCashierPasskey(): Promise<string | null> {
  const snap = await getDoc(doc(db, "settings", "cashierPasskey"));
  if (!snap.exists()) return null;
  const key = (snap.data().key as string) ?? "";
  return key.length > 0 ? key : null;
}

export async function setCashierPasskey(key: string): Promise<void> {
  await setDoc(doc(db, "settings", "cashierPasskey"), { key });
}

// ── Reviews ─────────────────────────────────────────────
export async function getReviews(): Promise<Review[]> {
  const snap = await getDocs(
    query(collection(db, "reviews"), orderBy("requestedAt", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Review));
}

export async function createReview(
  review: Omit<Review, "id">
): Promise<string> {
  const ref = await addDoc(collection(db, "reviews"), review);
  return ref.id;
}

export async function updateReview(
  id: string,
  data: Partial<Review>
): Promise<void> {
  await updateDoc(doc(db, "reviews", id), data as Record<string, unknown>);
}

export async function resetSubtasksForUser(
  taskId: string,
  userId: string
): Promise<void> {
  const taskSnap = await getDoc(doc(db, "tasks", taskId));
  if (!taskSnap.exists()) return;
  const task = taskSnap.data() as Task;
  const updated = task.subtasks.map((s) =>
    s.assigneeId === userId
      ? { ...s, completed: false, completedAt: null }
      : s
  );
  await updateDoc(doc(db, "tasks", taskId), { subtasks: updated });
}

export async function completeSubtasksForUser(
  taskId: string,
  userId: string
): Promise<void> {
  const taskSnap = await getDoc(doc(db, "tasks", taskId));
  if (!taskSnap.exists()) return;
  const task = taskSnap.data() as Task;
  const updated = task.subtasks.map((s) =>
    s.assigneeId === userId
      ? { ...s, completed: true, completedAt: s.completedAt ?? new Date().toISOString() }
      : s
  );
  await updateDoc(doc(db, "tasks", taskId), { subtasks: updated });
}

// ── Activity Logs ───────────────────────────────────────
export async function createActivityLog(
  log: Omit<ActivityLog, "id">
): Promise<void> {
  await addDoc(collection(db, "activityLogs"), log);
}

export async function getActivityLogs(): Promise<ActivityLog[]> {
  const snap = await getDocs(
    query(collection(db, "activityLogs"), orderBy("timestamp", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ActivityLog));
}

// ── Task Read Tracking ──────────────────────────────────
export async function markTaskAsRead(
  userId: string,
  taskId: string
): Promise<void> {
  const ref = doc(db, "taskReads", userId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data();
    const readIds: string[] = data.readTaskIds ?? [];
    if (!readIds.includes(taskId)) {
      await updateDoc(ref, { readTaskIds: [...readIds, taskId] });
    }
  } else {
    await setDoc(ref, { readTaskIds: [taskId] });
  }
}

export async function getReadTaskIds(userId: string): Promise<string[]> {
  const ref = doc(db, "taskReads", userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return [];
  return (snap.data().readTaskIds as string[]) ?? [];
}

// ── Cashier Setting ─────────────────────────────────────
export async function getCashier(): Promise<CashierSetting | null> {
  const snap = await getDoc(doc(db, "settings", "cashier"));
  if (!snap.exists()) return null;
  return snap.data() as CashierSetting;
}

export async function setCashier(cashier: CashierSetting): Promise<void> {
  await setDoc(doc(db, "settings", "cashier"), cashier);
}

// ── Banking Details ─────────────────────────────────────
const DEFAULT_BANKING: BankingDetails = {
  accountHolder: "Natalie Khensani Mashele",
  accountNumber: "1308531273",
  bankName: "Nedbank",
};

export async function getBankingDetails(): Promise<BankingDetails> {
  const snap = await getDoc(doc(db, "settings", "bankingDetails"));
  if (!snap.exists()) return DEFAULT_BANKING;
  return snap.data() as BankingDetails;
}

export async function setBankingDetails(details: BankingDetails): Promise<void> {
  await setDoc(doc(db, "settings", "bankingDetails"), details);
}

// ── Deposits ────────────────────────────────────────────
export async function getDeposits(): Promise<Deposit[]> {
  // No orderBy — avoids Firestore index dependency; caller sorts client-side.
  const snap = await getDocs(collection(db, "deposits"));
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Deposit));
  // Sort by submittedAt descending (gracefully handles missing field)
  return docs.sort((a, b) => {
    const ta = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
    const tb = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
    return tb - ta;
  });
}

export async function createDeposit(
  deposit: Omit<Deposit, "id">
): Promise<string> {
  const ref = await addDoc(collection(db, "deposits"), deposit);
  return ref.id;
}

export async function updateDeposit(
  id: string,
  data: Partial<Deposit>
): Promise<void> {
  // Strip undefined values — Firestore updateDoc throws if any value is undefined.
  // null is intentional (clears a field); undefined means "field was missing in source doc".
  const clean = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined)
  );
  await updateDoc(doc(db, "deposits", id), clean);
}

export async function deleteDeposit(id: string): Promise<void> {
  await deleteDoc(doc(db, "deposits", id));
}
