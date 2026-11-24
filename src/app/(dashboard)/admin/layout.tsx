import type { Metadata } from "next";

import { AdminSessionGuard } from "@/features/admin/components/admin-session-guard";
import { AdminLayout } from "@/features/admin/components/admin-layout";

export const instant = false;

export const metadata: Metadata = {
  title: "Admin",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AdminSessionGuard>
      <AdminLayout>{children}</AdminLayout>
    </AdminSessionGuard>
  );
}
