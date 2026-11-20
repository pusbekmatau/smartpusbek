import type { Metadata } from "next";
import { AuditLogTable } from "@/components/auth/AuditLogTable";

export const metadata: Metadata = { title: "Log Audit Aktivitas" };

export default function AuditLogsPage() {
  return <AuditLogTable />;
}
