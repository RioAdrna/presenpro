import Icon from './Icon'

const tones = {
  blue: { ring: 'bg-brand-100 text-brand-700', icon: 'anggota' },
  green: { ring: 'bg-emerald-100 text-emerald-700', icon: 'check' },
  amber: { ring: 'bg-amber-100 text-amber-700', icon: 'calendar' },
  rose: { ring: 'bg-rose-100 text-rose-700', icon: 'clock' },
  violet: { ring: 'bg-violet-100 text-violet-700', icon: 'chart' },
  sky: { ring: 'bg-sky-100 text-sky-700', icon: 'anggota' },
}

export default function StatCard({ label, value, change, icon, tone }) {
  const t = tones[tone] || tones.blue
  return (
    <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-500">{label}</p>
        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${t.ring}`}>
          <Icon name={icon || t.icon} size={18} />
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold text-zinc-800 sm:text-3xl">{value}</p>
      {change && <p className="mt-1.5 text-xs font-medium text-emerald-600">{change}</p>}
    </div>
  )
}
