import type { Metadata, Viewport } from "next";
import { urbanist } from "@/lib/fonts";
import { Toaster } from "@/components/ui/toast";
import { AuthSessionProvider } from "@/components/session-provider";
import { SplashScreen } from "@/components/splash-screen";
import { NavigationTracker } from "@/components/navigation-tracker";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Tayylo | The modern tailor\u2019s notebook", template: "%s · Tayylo" },
  description:
    "Find any client in two seconds, record measurements at the speed of a tape, and keep every measurement as a dated version.",
  manifest: "/manifest.json",
  // Favicons come from src/app/favicon.ico, icon.png and apple-icon.png.
};

export const viewport: Viewport = {
  themeColor: "#F4F2EC",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={urbanist.variable}
      suppressHydrationWarning
    >
      <body className="bg-canvas text-ink">
        <AuthSessionProvider>
          <SplashScreen>{children}</SplashScreen>
          <Toaster />
          <NavigationTracker />
        </AuthSessionProvider>
      </body>
    </html>
  );
}
