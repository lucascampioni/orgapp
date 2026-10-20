import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="min-h-full md:flex">
      <div className="hidden border-r border-border bg-surface px-4 py-6 md:flex md:h-screen md:w-60 md:shrink-0 md:flex-col">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="mt-2 h-3 w-20" />
        <div className="mt-6 flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg" />
          ))}
        </div>
      </div>

      <main className="min-w-0 flex-1 bg-bg px-6 py-7 md:px-8">
        <div className="mx-auto max-w-[1280px]">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <Skeleton className="h-7 w-48" />
              <Skeleton className="mt-2 h-4 w-36" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-32 rounded-lg" />
              <Skeleton className="h-9 w-28 rounded-lg" />
            </div>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-surface p-4">
                <Skeleton className="mb-3 h-9 w-9 rounded-lg" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-2 h-6 w-12" />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="overflow-hidden rounded-xl border border-border bg-surface lg:col-span-2">
              <div className="border-b border-border px-4 py-3">
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="divide-y divide-border">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <Skeleton className="h-10 w-12 shrink-0 rounded-lg" />
                    <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                    <div className="min-w-0 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="mt-1.5 h-3 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-surface">
              <div className="border-b border-border px-4 py-3">
                <Skeleton className="h-4 w-28" />
              </div>
              <div className="divide-y divide-border">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                    <div className="min-w-0 flex-1">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="mt-1.5 h-3 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
