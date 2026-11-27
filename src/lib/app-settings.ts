import { z } from "zod";
import { prisma } from "@/lib/db";

/**
 * Platform-wide switches, set from the admin portal and enforced by the
 * shared API — so they apply to the web app and the mobile app alike.
 * Public parts are served to both clients by GET /api/app-config.
 */
const versionString = z
  .string()
  .trim()
  .max(20)
  .regex(/^(\d+(\.\d+){0,2})?$/, "Use a version like 1.4.0");

export const appSettingsSchema = z.object({
  /** Every non-staff API request answers 503 and the apps show a maintenance screen. */
  maintenanceMode: z.boolean(),
  maintenanceMessage: z.string().trim().max(280),
  /** New accounts (email, Apple, Google) can be created. */
  signupsEnabled: z.boolean(),
  /** Tailors can publish new Explore posts. Browsing is unaffected. */
  explorePostingEnabled: z.boolean(),
  /** Banner shown at the top of the web and mobile apps. Empty = none. */
  announcement: z.string().trim().max(280),
  announcementTone: z.enum(["info", "warning"]),
  /** Mobile builds older than this are asked to update. Empty = no minimum. */
  minIosVersion: versionString,
  minAndroidVersion: versionString,
});

export type AppSettings = z.infer<typeof appSettingsSchema>;

export const DEFAULT_SETTINGS: AppSettings = {
  maintenanceMode: false,
  maintenanceMessage: "Tayylo is getting an upgrade. We'll be back shortly.",
  signupsEnabled: true,
  explorePostingEnabled: true,
  announcement: "",
  announcementTone: "info",
  minIosVersion: "",
  minAndroidVersion: "",
};

// Read on every API request, so cache briefly per server instance. A change
// made in the portal reaches every instance within this window.
const TTL_MS = 15_000;
let cache: { at: number; value: AppSettings } | null = null;

export async function getAppSettings(): Promise<AppSettings> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  const rows = await prisma.appSetting.findMany();
  const merged: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    const field = appSettingsSchema.shape[row.key as keyof AppSettings];
    // Ignore unknown keys and values that no longer validate.
    if (field?.safeParse(row.value).success) merged[row.key] = row.value;
  }
  const value = merged as AppSettings;
  cache = { at: Date.now(), value };
  return value;
}

export async function updateAppSettings(patch: Partial<AppSettings>, updatedBy: string): Promise<AppSettings> {
  const entries = Object.entries(patch).filter(([, v]) => v !== undefined);
  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.appSetting.upsert({
        where: { key },
        create: { key, value: value as never, updatedBy },
        update: { value: value as never, updatedBy },
      }),
    ),
  );
  clearAppSettingsCache();
  return getAppSettings();
}

export function clearAppSettingsCache() {
  cache = null;
}

/** What the web and mobile apps may read without signing in. */
export function publicConfig(s: AppSettings) {
  return {
    maintenance: s.maintenanceMode ? { message: s.maintenanceMessage } : null,
    announcement: s.announcement ? { message: s.announcement, tone: s.announcementTone } : null,
    signupsEnabled: s.signupsEnabled,
    explorePostingEnabled: s.explorePostingEnabled,
    minAppVersion: { ios: s.minIosVersion || null, android: s.minAndroidVersion || null },
  };
}
