"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { logout } from "@/features/auth/api/logout";
import { clearAccessToken } from "@/features/auth/auth-session";

export function LogoutButton() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    if (isSubmitting) return;

    setError(null);
    setIsSubmitting(true);
    try {
      await logout();
      clearAccessToken();
      router.replace("/admin/login");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong while signing you out.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
      {error && (
        <p className="max-w-40 text-xs leading-5 text-red-600" role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        className="min-h-11 shrink-0 whitespace-nowrap rounded-lg px-2 text-sm font-medium text-muted transition-colors hover:bg-soft-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] disabled:cursor-wait disabled:opacity-60"
        onClick={handleLogout}
        disabled={isSubmitting}
      >
        {isSubmitting ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );
}
