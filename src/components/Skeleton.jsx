function SkeletonBlock({ className = '' }) {
  return <div className={`skeleton ${className}`} />
}

export function DashboardSkeleton() {
  return (
    <div className="page-shell space-y-8">
      <section className="space-y-3">
        <SkeletonBlock className="h-10 w-full max-w-[520px]" />
        <SkeletonBlock className="h-4 w-full max-w-[360px]" />
      </section>

      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="surface min-h-[118px] p-5">
            <div className="flex justify-between gap-4">
              <div className="space-y-3">
                <SkeletonBlock className="h-3 w-24" />
                <SkeletonBlock className="h-8 w-16" />
              </div>
              <SkeletonBlock className="h-10 w-10 rounded-full" />
            </div>
            <SkeletonBlock className="mt-8 h-2 w-full" />
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_232px]">
        <div className="surface h-[365px] p-5">
          <SkeletonBlock className="h-5 w-48" />
          <SkeletonBlock className="mt-8 h-[260px] w-full" />
        </div>
        <div className="surface h-[365px] p-4">
          <SkeletonBlock className="h-5 w-36" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-[84px] w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export function PageSkeleton({ cards = 3, table = false }) {
  return (
    <div className="page-shell space-y-6">
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <SkeletonBlock className="h-8 w-64" />
          <SkeletonBlock className="h-4 w-80 max-w-full" />
        </div>
        <SkeletonBlock className="h-10 w-40 rounded-full" />
      </section>
      <SkeletonBlock className="h-11 w-full max-w-[380px] rounded-full" />
      {table ? (
        <div className="surface h-[300px] p-5">
          <SkeletonBlock className="h-8 w-full" />
          <div className="mt-5 space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-9 w-full" />
            ))}
          </div>
        </div>
      ) : (
        <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: cards }).map((_, index) => (
            <SkeletonBlock key={index} className="h-56 w-full rounded-lg" />
          ))}
        </section>
      )}
    </div>
  )
}

export { SkeletonBlock }
