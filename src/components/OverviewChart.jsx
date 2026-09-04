export default function OverviewChart({ data }) {
  const max = Math.max(...data.map((d) => Math.max(d.hadir, d.izin, d.alpha)))

  return (
    <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-zinc-800">Attendance Overview</h3>
        <div className="flex items-center gap-4 text-xs font-medium text-zinc-500">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brand-500" />Hadir</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-amber-400" />Izin</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-rose-400" />Alpha</span>
        </div>
      </div>

      <div className="flex h-52 items-end gap-4 sm:gap-6">
        {data.map((d) => (
          <div key={d.day} className="group flex flex-1 flex-col items-center gap-2">
            <div className="flex w-full flex-1 items-end justify-center gap-1.5">
              {[['hadir', 'bg-brand-500'], ['izin', 'bg-amber-400'], ['alpha', 'bg-rose-400']].map(
                ([key, color]) => (
                  <div
                    key={key}
                    className={`w-3 rounded-t-sm ${color} transition-opacity group-hover:opacity-80 sm:w-4`}
                    style={{ height: Math.max(3, Math.round((d[key] / max) * 100) * 1.5) }}
                    title={`${d.day}: ${d[key]}`}
                  />
                ),
              )}
            </div>
            <span className="text-xs font-medium text-zinc-500">{d.day}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
