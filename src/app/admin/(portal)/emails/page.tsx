import type { Metadata } from "next";
import { requireStaffPage } from "@/lib/admin/auth";
import {
  adminCodeEmail,
  campaignEmail,
  moderationAlertEmail,
  passwordResetEmail,
  paymentFailedEmail,
  planActivatedEmail,
  welcomeEmail,
  type RenderedEmail,
} from "@/lib/email-templates";
import { FilterTabs, PageHeader } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Emails" };

// Images load from this site ("" = same origin) so previews work before deploy.
const O = "";

function samples(): { key: string; name: string; when: string; email: RenderedEmail }[] {
  return [
    { key: "welcome-tailor", name: "Welcome (tailor)", when: "A tailor creates an account", email: welcomeEmail({ name: "Adaeze Okafor", role: "tailor" }, O) },
    { key: "welcome-customer", name: "Welcome (customer)", when: "A customer creates an account", email: welcomeEmail({ name: "Tunde", role: "customer" }, O) },
    { key: "reset", name: "Password reset", when: "Someone taps “Forgot password”", email: passwordResetEmail("https://app.tayylo.com/auth/reset?token=example", "adaeze@example.com", O) },
    { key: "code", name: "Admin sign-in code", when: "Staff sign in to this portal", email: adminCodeEmail("482913", O) },
    {
      key: "plan",
      name: "Plan upgraded",
      when: "A subscription starts (web or app)",
      email: planActivatedEmail({ name: "Adaeze", planName: "Pro", features: ["Unlimited clients", "Your studio logo on invoices and receipts", "Priority support"], renews: new Date(Date.now() + 30 * 864e5), gifted: false, amount: "₦5,000 / month" }, O),
    },
    {
      key: "gift",
      name: "Plan given free",
      when: "Staff give someone a plan",
      email: planActivatedEmail({ name: "Adaeze", planName: "Pro", features: ["Unlimited clients", "Your studio logo on invoices and receipts"], renews: new Date(Date.now() + 90 * 864e5), gifted: true }, O),
    },
    { key: "failed", name: "Payment failed", when: "A renewal payment fails", email: paymentFailedEmail({ name: "Adaeze", planName: "Pro" }, O) },
    {
      key: "campaign",
      name: "Campaign",
      when: "You send a campaign",
      email: campaignEmail(
        {
          subject: "New in Tayylo: Agbada measurements",
          body: "Hi Adaeze,\n\nThere's a new template in Tayylo: **Agbada**, with 14 measurements ready to go.\n\n- Shoulder to hem, sleeve drop and more\n- Ranges that catch typos as you measure\n- Works on the web and in the app\n\nOpen Record measurements and pick Agbada the next time you measure a client.",
          ctaLabel: "Record measurements",
          ctaUrl: "https://app.tayylo.com/measure",
        },
        { unsubscribe: "https://app.tayylo.com/api/unsubscribe?u=example" },
        O,
      ),
    },
    {
      key: "report",
      name: "Moderation alert",
      when: "Someone reports an Explore post (to the team)",
      email: moderationAlertEmail(
        { postId: "2f1c…", imageUrl: "/explore/denim-tailored-jacket.jpg", authorName: "Adewale Atelier", authorEmail: "studio@example.com", reason: "spam", details: "Posted the same photo five times", reporterEmail: "someone@example.com", reportCount: 3, hidden: true },
        "https://admin.tayylo.com/moderation",
        O,
      ),
    },
  ];
}

export default async function EmailsPage({ searchParams }: { searchParams: Promise<{ e?: string; w?: string }> }) {
  await requireStaffPage();
  const sp = await searchParams;
  const all = samples();
  const current = all.find(s => s.key === sp.e) ?? all[0];
  const phone = sp.w === "phone";
  const href = ({ e = current.key, w = phone ? "phone" : "desktop" }: { e?: string; w?: string }) =>
    `/emails?e=${e}${w === "phone" ? "&w=phone" : ""}`;

  return (
    <>
      <PageHeader title="Emails" description="Every email Tayylo sends, with example content. They all share one design." />
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <nav aria-label="Emails" className="space-y-1">
          {all.map(s => (
            <a
              key={s.key}
              href={href({ e: s.key })}
              aria-current={s.key === current.key ? "page" : undefined}
              className={
                s.key === current.key
                  ? "block rounded-[var(--radius-control)] bg-olive px-4 py-2.5 !text-text-inverse"
                  : "block rounded-[var(--radius-control)] px-4 py-2.5 !text-ink hover:bg-surface-sunken"
              }
            >
              <span className="block text-label font-semibold">{s.name}</span>
              <span className={s.key === current.key ? "block text-caption opacity-80" : "block text-caption text-text-tertiary"}>{s.when}</span>
            </a>
          ))}
        </nav>
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-caption uppercase tracking-wide text-text-tertiary">Subject</p>
              <p className="truncate text-[15px] font-semibold text-ink">{current.email.subject}</p>
            </div>
            <FilterTabs
              options={[{ key: "desktop", label: "Desktop" }, { key: "phone", label: "Phone" }]}
              value={phone ? "phone" : "desktop"}
              hrefFor={k => href({ w: k })}
            />
          </div>
          <div className="flex justify-center rounded-[var(--radius-card)] border border-border/70 bg-surface-sunken/60 p-3 sm:p-6">
            <iframe
              title={`${current.name} preview`}
              srcDoc={current.email.html}
              className="h-[1100px] rounded-[var(--radius-sm)] border-0 bg-white shadow-[var(--shadow-xs)]"
              style={{ width: phone ? 390 : "100%", maxWidth: 680 }}
            />
          </div>
          <details className="mt-4 rounded-[var(--radius-card)] border border-border/70 bg-surface p-4">
            <summary className="cursor-pointer text-label font-semibold text-ink">Plain-text version</summary>
            <pre className="mt-3 whitespace-pre-wrap text-caption text-text-secondary">{current.email.text}</pre>
          </details>
        </div>
      </div>
    </>
  );
}
