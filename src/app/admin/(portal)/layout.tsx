import { prisma } from "@/lib/db";
import { requireStaffPage } from "@/lib/admin/auth";
import { AdminShell } from "@/components/admin/shell";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaffPage();
  const openReports = await prisma.stylePost.count({ where: { reports: { some: {} } } });
  return (
    <AdminShell staff={staff} openReports={openReports}>
      {children}
    </AdminShell>
  );
}
