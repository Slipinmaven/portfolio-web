import type { Metadata } from "next";

import { LoginPage } from "@/features/auth/components/login-page";

export const metadata: Metadata = {
  title: "Admin and editor sign in",
  robots: {
    index: false,
    follow: false,
  },
};

export default function Page() {
  return <LoginPage />;
}
