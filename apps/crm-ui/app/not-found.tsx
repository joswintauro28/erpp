import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="font-heading text-2xl font-bold text-foreground">Page not found</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        The page you are looking for does not exist.
      </p>
      <Link
        href="/dashboard"
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
