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
import type { User, Task, Subtask, LoginLog } from "./types";

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
