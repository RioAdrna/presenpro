import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar,
  CalendarCheck,
  Clock,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react'
import { DashboardSkeleton } from '../components/Skeleton'
import useSkeletonLoading from '../hooks/useSkeletonLoading'
import { dashboardApi } from '../lib/api'

function StatCard({ item, index }) {
  const Icon = item.icon
  const NoteIcon = item.type === 'clock' ? Clock : TrendingUp

  return (
    <div className="surface card-motion min-h-[118px] p-5" style={{ animationDelay: `${index * 24}ms` }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase text-zinc-500">{item.title}</p>
          <h3 className="mt-1 text-[28px] font-black leading-none text-zinc-900">{item.value}</h3>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fff7dc] text-[#a77c00]">
          <Icon size={18} strokeWidth={2.2} />
        </div>
      </div>
      <div className="mt-8 flex items-center gap-1.5 text-[11px] font-bold text-[#b58b00]">
        <NoteIcon size={12} />
        <span>{item.note}</span>
      </div>
    </div>
  )
}

function AttendanceChart({ period, data = [] }) {
  const [activePoint, setActivePoint] = useState(null)
  const max = Math.max(1, ...data.map((item) => item.hadir + item.izin + item.alpa))
  const step = data.length > 1 ? 460 / (data.length - 1) : 0
  const points = data
    .map((item, index) => {
      const x = 50 + index * step
      const total = item.hadir + item.izin + item.alpa
      const y = 198 - (total / max) * 148
      return `${x},${Math.round(y)}`
    })
    .join(' ')

  return (
    <div className="px-5 pb-5">
      <div className="relative h-[270px] overflow-hidden rounded-md bg-[#fdfcfb]">
        <div className="absolute inset-x-0 top-8 space-y-[44px] px-8">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-px bg-[#eee7dd]" />
          ))}
        </div>
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 560 250" preserveAspectRatio="none">
          {data.map((item, index) => {
            const x = 35 + index * step
            const bottom = 205
            const hadirHeight = (item.hadir / max) * 150
            const izinHeight = (item.izin / max) * 150
            const alpaHeight = (item.alpa / max) * 150
            return (
              <g
                key={item.label}
                onMouseEnter={() => setActivePoint({ ...item, x: Math.min(78, Math.max(8, (index / Math.max(1, data.length - 1)) * 82)), y: 18 })}
                onMouseLeave={() => setActivePoint(null)}
                onFocus={() => setActivePoint({ ...item, x: Math.min(78, Math.max(8, (index / Math.max(1, data.length - 1)) * 82)), y: 18 })}
                onBlur={() => setActivePoint(null)}
                tabIndex="0"
              >
                <rect className="chart-bar" x={x} y={bottom - hadirHeight} width="14" height={Math.max(4, hadirHeight)} rx="3" fill="#c99b00" style={{ animationDelay: `${index * 18}ms` }} />
                <rect className="chart-bar" x={x + 17} y={bottom - izinHeight} width="10" height={Math.max(3, izinHeight)} rx="3" fill="#d7cbb8" style={{ animationDelay: `${40 + index * 18}ms` }} />
                <rect className="chart-bar" x={x + 30} y={bottom - alpaHeight} width="8" height={Math.max(3, alpaHeight)} rx="3" fill="#d95f5f" style={{ animationDelay: `${70 + index * 18}ms` }} />
                <rect x={x - 8} y="34" width="64" height="184" fill="transparent" />
              </g>
            )
          })}
          {points && <polyline className="chart-line" points={points} fill="none" stroke="#151515" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />}
          {points && points.split(' ').map((point, index) => {
            const [cx, cy] = point.split(',')
            return <circle key={`${period}-${point}`} cx={cx} cy={cy} r={activePoint?.label === data[index].label ? '5.5' : '4'} fill="#151515" />
          })}
        </svg>
        <div className={`absolute rounded-lg border border-[#e8dfd2] bg-white px-3 py-2 text-xs shadow-[0_12px_28px_rgba(34,25,6,0.12)] transition ${activePoint ? 'opacity-100' : 'pointer-events-none opacity-0'}`} style={{ left: `${activePoint?.x ?? 0}%`, top: `${activePoint?.y ?? 0}%` }}>
          {activePoint && (
            <>
              <p className="font-black text-zinc-900">{activePoint.label} - {period}</p>

              <p className="mt-1 text-[11px] font-semibold text-zinc-500">
                {activePoint.hadir} hadir, {activePoint.izin} izin, {activePoint.alpa} alpa
              </p>
            </>
          )}
        </div>
        <div className={`absolute inset-x-0 bottom-3 grid px-8 text-center text-[10px] font-bold text-zinc-500`} style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}>
          {data.map((item) => (
            <span key={item.label}>{item.label}</span>
          ))}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-[11px] font-bold text-zinc-500">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[#c99b00]" />Hadir</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[#d7cbb8]" />Izin</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[#d95f5f]" />Alpa</span>
        </div>
      </div>
    </div>
  )
}

function ActivityCard({ activity }) {
  const styles = {
    AKTIF: 'bg-[#c99b00] text-black',
    SELESAI: 'bg-zinc-200 text-zinc-600',
    DRAFT: 'bg-zinc-100 text-zinc-500',
  }

  return (
    <article className="card-motion rounded-3xl border border-[#eee7dd] bg-white px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-[13px] font-black text-zinc-800">{activity.title}</h4>
        <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-black ${styles[activity.status] || styles['DRAFT']}`}>
          {activity.status}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] font-medium text-zinc-500">
        <span className="flex items-center gap-1.5">
          <Calendar size={12} />
          {activity.date}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock size={12} />
          {activity.time}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-[#eee7dd] pt-3 text-[11px]">
        <span className="font-semibold text-zinc-500">Attendees</span>
        <span className="font-black text-zinc-800">{activity.attendees}</span>
      </div>
    </article>
  )
}   

export default function Dashboard() {
  const isInitialLoading = useSkeletonLoading()
  const [data, setData] = useState({ stats: null, recentActivities: [], charts: { Mingguan: [] } })
  const [loading, setLoading] = useState(true)

  const [period, setPeriod] = useState('Mingguan')
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    dashboardApi.get()
      .then(res => {
        if (!cancelled) {
          setData({
            stats: res.stats,
            recentActivities: res.recentActivities || [],
            charts: res.charts || { Mingguan: [] }
          })
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const visibleActivities = useMemo(
    () => data.recentActivities.slice(0, 3),
    [data.recentActivities],
  )

  if (isInitialLoading || loading) return <DashboardSkeleton />

  const statsList = [
    { title: 'TOTAL ANGGOTA', value: data.stats?.totalMembers || '0', note: 'Anggota Aktif', icon: Users, type: 'trend' },
    { title: 'KEGIATAN AKTIF', value: data.stats?.activeEvents || '0', note: 'Berjalan/Akan Datang', icon: CalendarCheck, type: 'clock' },
    { title: 'HADIR HARI INI', value: data.stats?.presentToday || '0', note: 'Tercatat Hari Ini', icon: UserCheck, type: 'trend' },
  ]

  return (
    <div className="page-shell space-y-6 sm:space-y-8">
      <section>
        <h1 className="text-[30px] font-black leading-tight text-zinc-900 sm:text-[38px]">
          Selamat datang di PresenPRO
        </h1>
        <p className="mt-2 text-sm font-medium text-zinc-600">
          Kelola presensi dan kehadiran anggota PROBUMSIL.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {statsList.map((item, index) => (
          <StatCard key={item.title} item={item} index={index} />
        ))}
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_232px]">
        <div className="surface overflow-hidden">
          <div className="flex flex-col items-stretch justify-between gap-3 border-b border-[#eee7dd] px-4 py-4 sm:flex-row sm:items-center sm:px-5">
            <h2 className="text-lg font-black text-zinc-800">Attendance Overview</h2>
            <div className="flex overflow-x-auto rounded-full bg-[#f4f1ed] p-1">
              {Object.keys(data.charts).map((option) => (
                <button
                  key={option}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-black ${period === option ? 'bg-zinc-950 text-white' : 'text-zinc-500 hover:bg-white hover:text-zinc-900'}`}
                  onClick={() => setPeriod(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <AttendanceChart period={period} data={data.charts[period]} />
        </div>

        <aside className="surface p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-black text-zinc-800">Recent Activities</h2>
            <button
              className="text-[11px] font-black text-[#b58b00] hover:text-[#8b6800]"
              onClick={() => navigate('/kegiatan')}
            >
              View All
            </button>
          </div>
          <div className="space-y-3">
            {visibleActivities.map((activity, index) => (
              <ActivityCard key={index} activity={activity} />
            ))}
            {visibleActivities.length === 0 && (
              <p className="text-center text-xs font-semibold text-zinc-400 py-4">Belum ada kegiatan.</p>
            )}
          </div>
        </aside>
      </section>
    </div>
  )
}
