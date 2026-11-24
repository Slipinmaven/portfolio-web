import Link from "next/link";
import type { ReactNode } from "react";

import { AdminNavigation } from "@/features/admin/components/admin-navigation";
import { LogoutButton } from "@/features/auth/components/logout-button";

export function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-surface p-6 md:flex md:flex-col">
        <Link href="/admin" className="text-sm font-semibold tracking-tight">
          PORTFOLIO ADMIN
        </Link>
        <AdminNavigation />
        <Link
          href="/"
          className="mt-auto text-sm text-muted transition-colors hover:text-foreground"
        >
          View public portfolio
        </Link>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="hidden min-h-16 items-center justify-between gap-3 border-b border-border bg-surface px-6 md:flex">
          <div className="ml-auto flex min-w-0 items-center gap-6">
            <p className="hidden text-sm text-muted sm:block">
              Admin/editor workspace
            </p>
            <LogoutButton />
          </div>
        </header>
        <div className="md:hidden">
          <AdminNavigation mobile />
        </div>
        <main className="min-w-0 flex-1 pb-24 p-4 sm:p-6 md:pb-6 lg:p-10">
          {children}
        </main>
      </div>
    </div>
  );
}
