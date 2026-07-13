import Link from "next/link";
import { FileSearch, Home } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="relative flex min-h-screen w-full bg-background overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(150,40,46,0.12)_0%,transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(203,160,82,0.06)_0%,transparent_50%)]" />
      <div className="relative z-10 m-auto flex w-full max-w-[420px] flex-col items-center px-6">
        <div className="mb-10 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-accent-foreground/20 bg-accent/10">
            <span className="font-[family-name:var(--font-montserrat)] text-xl font-bold text-accent-foreground tracking-[0.05em]">D</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <h1 className="font-[family-name:var(--font-montserrat)] text-xl font-semibold text-foreground tracking-[0.05em]">DATAVEX</h1>
            <p className="text-sm text-muted-foreground">Inventory Center</p>
          </div>
        </div>

        <div className="relative w-full rounded-lg border border bg-card p-8">
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <FileSearch className="h-7 w-7 text-destructive" />
            </div>
            <span className="font-[family-name:var(--font-montserrat)] text-6xl font-bold text-destructive tracking-tight">404</span>
            <div className="my-4 h-[2px] w-10 rounded-full bg-accent-foreground/40" />
            <h2 className="font-[family-name:var(--font-montserrat)] text-lg font-semibold text-foreground">Page not found</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">The page you are looking for doesn&apos;t exist or has been moved.</p>
            <Link href="/dashboard" className="mt-6 inline-flex h-10 items-center gap-2 rounded bg-action px-5 text-sm font-medium text-foreground transition-all hover:bg-action/90">
              <Home className="h-4 w-4" /> Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
