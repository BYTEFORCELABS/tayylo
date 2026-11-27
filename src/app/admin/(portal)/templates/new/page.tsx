import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireStaffPage } from "@/lib/admin/auth";
import { templateCategories } from "@/lib/admin/template-categories";
import { PageHeader } from "@/components/admin/ui";
import { TemplateEditor } from "@/components/admin/template-editor";

export const metadata: Metadata = { title: "New template" };

export default async function NewTemplatePage() {
  await requireStaffPage("admin");
  return (
    <>
      <Link href="/templates" className="mb-4 inline-flex items-center gap-1.5 text-label font-semibold !text-text-secondary hover:!text-ink">
        <ArrowLeft size={16} aria-hidden /> Templates
      </Link>
      <PageHeader title="New template" description="Once published, every tailor can use it straight away." />
      <div className="max-w-4xl">
        <TemplateEditor initial={{ name: "", category: "", fields: [] }} categories={await templateCategories()} />
      </div>
    </>
  );
}
