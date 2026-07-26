export default function FulfillmentLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-56 rounded bg-[var(--shell-border)]/20" />
      <div className="h-4 w-80 rounded bg-[var(--shell-border)]/20" />
      <div className="grid grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-[var(--shell-border)]/10" />
        ))}
      </div>
      <div className="h-64 rounded-xl bg-[var(--shell-border)]/10" />
    </div>
  );
}
