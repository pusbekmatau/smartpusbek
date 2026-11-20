import type { Metadata } from "next";
import { UserManagementPanel } from "@/components/auth/UserManagementPanel";

export const metadata: Metadata = { title: "Manajemen Pengguna" };

export default function UsersPage() {
  return <UserManagementPanel />;
}
