export function BalanceSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="card p-5 sm:p-6">
        <div className="h-4 w-32 bg-bg rounded mb-3" />
        <div className="h-10 w-48 bg-bg rounded" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-3 sm:p-4">
            <div className="h-3 w-20 bg-bg rounded mb-2" />
            <div className="h-6 w-24 bg-bg rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
