export default function ProductCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="aspect-square animate-pulse bg-slate-100" />
      <div className="space-y-2 p-4">
        <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
        <div className="flex items-center justify-between pt-2">
          <div className="h-6 w-20 animate-pulse rounded bg-slate-100" />
          <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-100" />
        </div>
      </div>
    </div>
  );
}
