"use client";

import { useRouter } from "next/navigation";
import { ShieldAlert, ChevronLeft } from "lucide-react";

export default function ForbiddenPage() {
  const router = useRouter();

  return (
    <div className="relative flex min-h-screen w-full bg-[#1A1C21] overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(150,40,46,0.12)_0%,transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(203,160,82,0.06)_0%,transparent_50%)]" />

      <div className="relative z-10 m-auto flex w-full max-w-[420px] flex-col items-center px-6">
        <div className="mb-10 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-[#CBA052]/40 bg-[#CBA052]/10">
            <span className="font-[family-name:var(--font-montserrat)] text-xl font-bold text-[#CBA052] tracking-[0.05em]">
              D
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <h1 className="font-[family-name:var(--font-montserrat)] text-xl font-semibold text-white tracking-[0.05em]">
              DATAVEX
            </h1>
            <p className="text-sm text-white/50">Command Center</p>
          </div>
        </div>

        <div className="relative w-full rounded-lg border border-white/10 bg-[#272A30] p-8">
          <div className="pointer-events-none absolute -inset-px rounded-lg bg-[radial-gradient(ellipse_at_top_left,rgba(203,160,82,0.06)_0%,transparent_50%)]" />

          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#96282E]/10">
              <ShieldAlert className="h-7 w-7 text-[#C81D25]" />
            </div>

            <span className="font-[family-name:var(--font-montserrat)] text-6xl font-bold text-[#C81D25] tracking-tight">
              403
            </span>

            <div className="my-4 h-[2px] w-10 rounded-full bg-[#CBA052]/40" />

            <h2 className="font-[family-name:var(--font-montserrat)] text-lg font-semibold text-white">
              Access denied
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/50">
              You don&apos;t have permission to access this resource. Contact your administrator if you believe this is a
              mistake.
            </p>

            <button
              type="button"
              onClick={() => router.back()}
              className="mt-6 inline-flex h-10 items-center gap-2 rounded bg-[#C81D25] px-5 text-sm font-medium text-white transition-all hover:bg-[#A0171E] cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              Go Back
            </button>

            <div className="mt-8 border-t border-white/5 pt-5 w-full">
              <p className="text-center text-xs text-white/30">
                Verify your permissions with the system administrator
              </p>
              <div className="mt-3 flex items-center justify-center gap-2">
                <div className="h-[1px] w-8 bg-white/10" />
                <div className="flex gap-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#CBA052]/40" />
                  <div className="h-1.5 w-1.5 rounded-full bg-[#CBA052]/20" />
                  <div className="h-1.5 w-1.5 rounded-full bg-[#CBA052]/40" />
                </div>
                <div className="h-[1px] w-8 bg-white/10" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
