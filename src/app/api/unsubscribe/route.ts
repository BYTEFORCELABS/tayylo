import { prisma } from "@/lib/db";
import { verifyUnsubscribe } from "@/lib/marketing/unsubscribe";

// Linked from every marketing email. GET shows a confirm button (so link
// scanners can't unsubscribe people by visiting it); POST unsubscribes —
// also used by mail apps' one-click "Unsubscribe" (RFC 8058).
const page = (title: string, body: string, form = "") =>
  new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title} · Tayylo</title></head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#F4F2EC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1E2019;padding:16px;box-sizing:border-box">
<div style="max-width:400px;width:100%;background:#FBFAF7;border:1px solid #E3E0D6;border-radius:24px;padding:32px 28px">
<img src="/lockup_olive.png" width="120" alt="Tayylo" style="display:block;margin-bottom:24px">
<h1 style="margin:0 0 8px;font-size:22px">${title}</h1><p style="margin:0;font-size:15px;line-height:22px;color:#55574C">${body}</p>${form}</div></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );

export async function GET(request: Request) {
  const url = new URL(request.url);
  const u = url.searchParams.get("u");
  const t = url.searchParams.get("t");
  if (!verifyUnsubscribe(u, t)) return page("Link not valid", "This unsubscribe link is broken or incomplete. You can turn off updates in Tayylo → Settings.");
  return page(
    "Unsubscribe from updates?",
    "You'll stop getting product news and offers from Tayylo by email. Account emails (like password resets) still arrive.",
    `<form method="post" style="margin-top:24px"><button style="width:100%;padding:14px;border:0;border-radius:999px;background:#454F2C;color:#fff;font-size:15px;font-weight:600;cursor:pointer">Unsubscribe</button></form>`,
  );
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const u = url.searchParams.get("u");
  if (!verifyUnsubscribe(u, url.searchParams.get("t"))) return page("Link not valid", "This unsubscribe link is broken or incomplete.");
  await prisma.user.updateMany({ where: { id: u! }, data: { marketingEmails: false } });
  return page("You're unsubscribed", "You won't get product updates or offers by email any more. You can turn them back on in Tayylo → Settings.");
}
