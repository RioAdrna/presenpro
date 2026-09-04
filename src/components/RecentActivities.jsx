const avatarColors = {
  green: 'bg-emerald-100 text-emerald-700',
  rose: 'bg-rose-100 text-rose-700',
  amber: 'bg-amber-100 text-amber-700',
  blue: 'bg-brand-100 text-brand-700',
  violet: 'bg-violet-100 text-violet-700',
}

export default function RecentActivities({ activities }) {
  return (
    <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-zinc-800">Recent Activity</h3>
        <button className="text-sm font-medium text-brand-600 hover:text-brand-700">See all</button>
      </div>
      <ul className="divide-y divide-zinc-50">
        {activities.map((a, i) => (
          <li key={i} className="flex items-center gap-3 py-3.5">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatarColors[a.color]}`}>
              {a.initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-zinc-800">
                <span className="font-semibold">{a.name}</span> {a.action}
              </p>
              <p className="text-xs text-zinc-400">{a.at} · {a.time}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
