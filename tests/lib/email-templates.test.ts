import { describe, expect, it } from "vitest";
import { adminCodeEmail, campaignEmail, passwordResetEmail, planActivatedEmail, welcomeEmail } from "@/lib/email-templates";

describe("email templates", () => {
  it("escape anything people typed", () => {
    const e = campaignEmail({ subject: "<script>x</script>", body: "Hi <b>Ada</b>,\n\nPrice: 5 < 6", ctaLabel: null, ctaUrl: null }, { unsubscribe: "https://a/u" });
    expect(e.html).not.toContain("<script>x");
    expect(e.html).toContain("&lt;script&gt;");
    expect(e.html).toContain("5 &lt; 6");
  });

  it("campaigns turn '- ' lines into a list, **bold** into bold, and carry an unsubscribe link", () => {
    const e = campaignEmail({ subject: "New", body: "Hi Ada,\n\nWhat's new:\n\n- One\n- **Two**", ctaLabel: "Open", ctaUrl: "https://app.tayylo.com" }, { unsubscribe: "https://app/unsub?u=1" });
    expect(e.html).toContain("check.png");
    expect(e.html).toContain("<strong");
    expect(e.html).toContain("https://app/unsub?u=1");
    expect(e.text).toContain("- One");
    expect(e.text).toContain("Unsubscribe: https://app/unsub?u=1");
  });

  it("transactional emails have the essentials and no unsubscribe link", () => {
    const code = adminCodeEmail("482913");
    expect(code.subject).toBe("482913 is your Tayylo Admin sign-in code");
    expect(code.html).toContain("482913");
    expect(code.html).not.toContain("Unsubscribe");
    const reset = passwordResetEmail("https://app.tayylo.com/auth/reset?token=abc", "ada@x.com");
    expect(reset.html.match(/token=abc/g)?.length).toBeGreaterThanOrEqual(2); // button + fallback link
    expect(welcomeEmail({ role: "tailor", name: "Ada Obi" }).html).toContain("Hi Ada,");
    expect(planActivatedEmail({ planName: "Pro", features: ["Unlimited clients"], renews: null, gifted: true }).subject).toContain("on us");
  });
});
