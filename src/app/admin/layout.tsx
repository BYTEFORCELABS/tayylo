import type { Metadata } from "next";

// Served on admin.tayylo.com (see src/proxy.ts). Never indexed.
export const metadata: Metadata = {
  title: { default: "Tayylo Admin", template: "%s · Tayylo Admin" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
