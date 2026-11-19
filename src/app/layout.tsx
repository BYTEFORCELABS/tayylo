import type { Metadata, Viewport } from "next";
import { urbanist } from "@/lib/fonts";
import { Toaster } from "@/components/ui/toast";
import { AuthSessionProvider } from "@/components/session-provider";
import { SplashScreen } from "@/components/splash-screen";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tayylo | The modern tailor\u2019s notebook",
  description:
    "Find any client in two seconds, record measurements at the speed of a tape, and keep every measurement as a dated version.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon_olive.png",
    apple: "/icon_beige.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F1E8" },
    { media: "(prefers-color-scheme: dark)", color: "#15170F" },
  ],
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
      <body>
        <AuthSessionProvider>
          <SplashScreen>{children}</SplashScreen>
          <Toaster />
        </AuthSessionProvider>
      </body>
    </html>
  );
}
