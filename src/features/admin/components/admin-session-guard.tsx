"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { refreshSession } from "@/features/auth/api/auth-api";
import {
  getCurrentUserRole,
  type WorkspaceRole,
} from "@/features/auth/api/current-user-api";
import {
  clearAccessToken,
  setAccessToken,
  subscribeToSessionExpiry,
} from "@/features/auth/auth-session";
import { AdminRoleProvider } from "@/features/admin/components/admin-role-context";

type SessionState =
  | { status: "checking" }
  | { status: "authenticated"; role: WorkspaceRole }
  | { status: "error"; message: string };

export function AdminSessionGuard({
  children,
}: Readonly<{ children: ReactNode }>) {
  const router = useRouter();
  const [session, setSession] = useState<SessionState>({ status: "checking" });
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeToSessionExpiry(() => {
      router.replace("/admin/login");
    });

    async function restoreSession() {
      setSession({ status: "checking" });
      try {
        const result = await refreshSession();
        if (!active) return;
        if (!result) {
          clearAccessToken();
          router.replace("/admin/login");
          return;
        }
        setAccessToken(result.access_token);
        const role = await getCurrentUserRole();
        if (!active) return;
        setSession({ status: "authenticated", role });
      } catch (error) {
        if (!active) return;
        clearAccessToken();
        setSession({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Unable to restore your session. Please try again.",
        });
      }
    }

    void restoreSession();
    return () => {
      active = false;
      unsubscribe();
    };
  }, [retry, router]);

  if (session.status === "authenticated") {
    return (
      <AdminRoleProvider value={session.role}>{children}</AdminRoleProvider>
    );
  }

  if (session.status === "error") {
    return (
      <main className="grid min-h-screen place-items-center p-6">
        <div className="max-w-md text-center">
          <p className="text-sm text-red-600" role="alert">
            {session.message}
          </p>
          <button
            className="mt-4 rounded-full border border-border px-5 py-3 text-sm font-medium"
            type="button"
            onClick={() => setRetry((current) => current + 1)}
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative grid min-h-[100svh] place-items-center overflow-hidden bg-background px-5 py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-28 -top-32 h-72 w-72 rounded-full bg-accent/10 blur-3xl"
      />
      <section
        aria-label="Restoring admin session"
        className="relative w-full max-w-md rounded-3xl border border-border bg-surface p-6 shadow-xl shadow-black/5 sm:p-8"
      >
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-accent text-lg font-semibold text-foreground">
            J
          </span>
          <div>
            <p className="font-semibold">Portfolio</p>
            <p className="text-xs text-muted">Admin workspace</p>
          </div>
        </div>
        <div className="mt-9 flex items-start gap-4" role="status">
          <span
            aria-hidden="true"
            className="mt-0.5 size-6 shrink-0 animate-spin rounded-full border-2 border-border border-t-foreground"
          />
          <div>
            <p className="font-medium">Restoring your workspace</p>
            <p className="mt-1 text-sm leading-6 text-muted">
              Checking your sign-in and preparing your dashboard.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
