"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getUserByEmail, logLogin, getManagerPasskey, getCashier, getCashierPasskey } from "@/lib/firestore";
import { Shield, LogIn, Loader2, Lock, ArrowLeft } from "lucide-react";
import type { User } from "@/lib/types";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingManager, setPendingManager] = useState<User | null>(null);
  const [pendingCashier, setPendingCashier] = useState<User | null>(null);
  const [passkey, setPasskey] = useState("");
  const { login, user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  if (authLoading || user) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const found = await getUserByEmail(email.trim().toLowerCase());
      if (!found) {
        setError("No account found with this email. Contact your project manager.");
        setLoading(false);
        return;
      }
      if (found.role === "manager") {
        setPendingManager(found);
        setLoading(false);
        return;
      }
      // Check if this user is the current cashier
      const cashierSetting = await getCashier();
      if (cashierSetting && cashierSetting.userId === found.id) {
        const cashierKey = await getCashierPasskey();
        if (cashierKey) {
          setPendingCashier(found);
          setLoading(false);
          return;
        }
      }
      login(found);
      logLogin(found);
      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  async function handlePasskey(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const storedKey = await getManagerPasskey();
      if (!storedKey || passkey !== storedKey) {
        setError("Invalid passkey. Access denied.");
        setLoading(false);
        return;
      }
      login(pendingManager!);
      logLogin(pendingManager!);
      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  async function handleCashierPasskey(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const storedKey = await getCashierPasskey();
      if (!storedKey || passkey !== storedKey) {
        setError("Invalid passkey. Access denied.");
        setLoading(false);
        return;
      }
      login(pendingCashier!);
      logLogin(pendingCashier!);
      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 text-white mb-4">
            <Shield className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Spartans</h1>
          <p className="text-gray-500 mt-2">Project Management System</p>
        </div>

        <form
          onSubmit={pendingManager ? handlePasskey : pendingCashier ? handleCashierPasskey : handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6"
        >
          {!pendingManager && !pendingCashier ? (
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
              />
            </div>
          ) : pendingManager ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-indigo-50 rounded-lg p-3">
                <Lock className="h-5 w-5 text-indigo-600 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-indigo-900">Manager verification required</p>
                  <p className="text-indigo-700 mt-0.5">Enter your passkey to continue as <span className="font-medium">{pendingManager.name}</span></p>
                </div>
              </div>
              <div>
                <label
                  htmlFor="passkey"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  Passkey
                </label>
                <input
                  id="passkey"
                  type="password"
                  required
                  value={passkey}
                  onChange={(e) => setPasskey(e.target.value)}
                  placeholder="Enter manager passkey"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                  autoFocus
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-amber-50 rounded-lg p-3">
                <Lock className="h-5 w-5 text-amber-600 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-amber-900">Cashier verification required</p>
                  <p className="text-amber-700 mt-0.5">Enter your passkey to continue as <span className="font-medium">{pendingCashier!.name}</span></p>
                </div>
              </div>
              <div>
                <label
                  htmlFor="passkey"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  Passkey
                </label>
                <input
                  id="passkey"
                  type="password"
                  required
                  value={passkey}
                  onChange={(e) => setPasskey(e.target.value)}
                  placeholder="Enter cashier passkey"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                  autoFocus
                />
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : pendingManager || pendingCashier ? (
              <Lock className="h-4 w-4" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            {pendingManager || pendingCashier ? "Verify & Sign In" : "Sign In"}
          </button>

          {(pendingManager || pendingCashier) && (
            <button
              type="button"
              onClick={() => {
                setPendingManager(null);
                setPendingCashier(null);
                setPasskey("");
                setError("");
              }}
              className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to email
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
