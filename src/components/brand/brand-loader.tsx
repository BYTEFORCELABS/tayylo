"use client";

import dynamic from "next/dynamic";
import loadingMark from "../../../public/tayylo-logo-lottie-pack/tayylo-symbol-olive.json";

const Lottie = dynamic(() => import("lottie-react").then(mod => mod.Lottie), { ssr: false });

/** Full-screen branded wait state (auth/session checks). */
export function BrandLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" className="flex min-h-[100dvh] flex-col items-center justify-center bg-canvas">
      <div className="size-14">
        <Lottie src={loadingMark} loop autoplay />
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
