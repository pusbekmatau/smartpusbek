import { AuthGuard } from "@/components/layout/AuthGuard";

// Session-gated: never prerender.
export const dynamic = "force-dynamic";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
