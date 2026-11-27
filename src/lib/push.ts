import { prisma } from "@/lib/db";

/**
 * Push notifications to the mobile app through Expo's push service
 * (https://docs.expo.dev/push-notifications/sending-notifications/).
 * The app registers its Expo push token with POST /api/me/push-tokens.
 */
export interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

const EXPO_URL = "https://exp.host/--/api/v2/push/send";
const CHUNK = 100;

export const isExpoToken = (t: string) => /^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/.test(t);

/** Sends messages; returns how many were accepted. Tokens Expo says are dead are deleted. */
export async function sendPush(messages: PushMessage[]): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < messages.length; i += CHUNK) {
    const chunk = messages.slice(i, i + CHUNK);
    try {
      const res = await fetch(EXPO_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(process.env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}),
        },
        body: JSON.stringify(chunk.map(m => ({ ...m, sound: "default" }))),
      });
      const json = (await res.json().catch(() => ({}))) as { data?: { status: string; details?: { error?: string } }[] };
      if (!res.ok || !Array.isArray(json.data)) {
        failed += chunk.length;
        continue;
      }
      const dead: string[] = [];
      json.data.forEach((ticket, j) => {
        if (ticket.status === "ok") sent++;
        else {
          failed++;
          if (ticket.details?.error === "DeviceNotRegistered") dead.push(chunk[j].to);
        }
      });
      if (dead.length) await prisma.pushToken.deleteMany({ where: { token: { in: dead } } });
    } catch (e) {
      console.error("[push] send failed:", (e as Error).message);
      failed += chunk.length;
    }
  }
  return { sent, failed };
}
