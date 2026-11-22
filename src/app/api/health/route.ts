import { prisma } from "@/lib/db";

// Uptime check for monitoring: 200 when the app can reach the database,
// 503 when it can't. Public and cheap; reveals nothing about the data.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ ok: true, db: "up" });
  } catch {
    return Response.json({ ok: false, db: "down" }, { status: 503 });
  }
}
