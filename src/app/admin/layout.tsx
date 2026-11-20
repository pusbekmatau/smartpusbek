import { AuthGuard } from "@/components/layout/AuthGuard";

// Session-gated: never prerender.
export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard roles={["ADMIN"]}>{children}</AuthGuard>;
}
