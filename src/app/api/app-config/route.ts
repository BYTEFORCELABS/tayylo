import { getAppSettings, publicConfig } from "@/lib/app-settings";

// Public, no sign-in: the web app and the mobile app read this on launch to
// show the maintenance screen, the announcement banner, or a forced-update
// prompt. Shape: see publicConfig() in src/lib/app-settings.ts.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(publicConfig(await getAppSettings()), {
      headers: { "Cache-Control": "public, max-age=30" },
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
