import type { Metadata } from "next";
import { atLeast, requireStaffPage } from "@/lib/admin/auth";
import { getAppSettings } from "@/lib/app-settings";
import { PageHeader } from "@/components/admin/ui";
import { SettingsForm } from "@/components/admin/settings-form";

export const metadata: Metadata = { title: "App controls" };

export default async function SettingsPage() {
  const staff = await requireStaffPage();
  const settings = await getAppSettings();
  const canEdit = atLeast(staff.staffRole, "admin");
  return (
    <>
      <PageHeader
        title="App controls"
        description="Switches that apply to the web app and the mobile app at once. They're enforced by the shared API, so they hold even on older app builds."
      />
      {!canEdit && <p className="mb-6 rounded-[var(--radius-card)] bg-info-bg px-4 py-3 text-label text-info">Moderators can view these. Ask an admin to change them.</p>}
      <div className="max-w-3xl">
        <SettingsForm initial={settings} canEdit={canEdit} />
      </div>
    </>
  );
}
