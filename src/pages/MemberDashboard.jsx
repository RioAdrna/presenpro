import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarCheck, CheckCircle2, ClipboardList, Clock, MapPin, XCircle } from 'lucide-react'
import { eventsApi, usersApi } from '../lib/api'
import { PageSkeleton } from '../components/Skeleton'
import useSkeletonLoading from '../hooks/useSkeletonLoading'
import MemberQrCard from '../components/MemberQrCard'
import useAuth from '../hooks/useAuth'

function StatTile({ icon: Icon, label, value, tone = 'dark' }) {
  const tones = {
    dark: 'bg-zinc-950 text-white',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-[#fff4cf] text-[#8b6800]',
    red: 'bg-red-50 text-red-600',
  }

  return (
    <article className="rounded-lg border border-[#e8dfd2] bg-white p-4">
      <div className={`flex h-9 w-9 items-center justify-center rounded-full ${tones[tone]}`}>
        <Icon size={17} />
      </div>
      <p className="mt-4 text-[24px] font-black leading-none text-zinc-900">{value}</p>
      <p className="mt-1 text-[11px] font-black uppercase text-zinc-500">{label}</p>
    </article>
  )
}

function EventRow({ event }) {
  const firstMeeting = event.meetings?.[0]

  return (
    <Link to={`/kegiatan/${event.id}`} className="block rounded-lg border border-[#e8dfd2] bg-white p-4 hover:border-[#d8b149] hover:bg-[#fffaf0]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-zinc-900">{event.title}</p>
          <p className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500">
            <MapPin size={12} />
            <span className="truncate">{event.place}</span>
          </p>
        </div>
        <ArrowRight size={16} className="mt-0.5 shrink-0 text-zinc-400" />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold text-zinc-500">
        <span className="inline-flex items-center gap-1 rounded-full bg-[#f5efe3] px-2.5 py-1">
          <Clock size={12} />
          {firstMeeting?.time || event.time}
        </span>
        <span className="rounded-full bg-zinc-100 px-2.5 py-1">{event.meetings?.length || 0} pertemuan</span>
      </div>
    </Link>
  )
}

export default function MemberDashboard() {
  const initialLoading = useSkeletonLoading()
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([usersApi.getProfile(), eventsApi.list()])
      .then(([profileData, eventsData]) => {
        if (cancelled) return
        setProfile(profileData)
        setEvents(eventsData.events || [])
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const myEvents = useMemo(() => {
    const nim = profile?.nim
    if (!nim || nim === '-') return []
    return events.filter((event) => event.participantDetails?.some((member) => member.nim === nim))
  }, [events, profile])

  const nextEvents = useMemo(
    () => myEvents.filter((event) => event.status !== 'Selesai').slice(0, 3),
    [myEvents],
  )

  if (initialLoading || loading) return <PageSkeleton cards={4} />

  const stats = profile?.stats || { present: 0, permit: 0, absent: 0 }
  const displayName = profile?.name || user?.name || 'Anggota'

  return (
    <div className="page-shell space-y-5">
      <section className="surface px-5 py-6">
        <h1 className="text-[26px] font-black leading-tight text-zinc-900">Halo, {displayName}</h1>
        <p className="mt-2 text-sm font-semibold text-zinc-500">Pantau kegiatan dan akses QR absensi dari akun ini.</p>
      </section>

      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">{error}</div>
      )}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={CheckCircle2} label="Hadir" value={stats.present} tone="green" />
        <StatTile icon={ClipboardList} label="Izin" value={stats.permit} tone="amber" />
        <StatTile icon={XCircle} label="Alpa" value={stats.absent} tone="red" />
        <StatTile icon={CalendarCheck} label="Kegiatan" value={myEvents.length} />
      </section>

      {profile?.profileComplete ? <MemberQrCard profile={profile} /> : (
        <section className="rounded-lg border border-[#e8dfd2] bg-white p-5">
          <p className="text-sm font-black text-zinc-900">QR ABSENSI belum tersedia</p>
          <p className="mt-1 text-xs font-semibold text-zinc-500">Lengkapi nomor HP, fakultas, tahun masuk, dan angkatan PROBUMSIL di Profil.</p>
          <Link to="/profil" className="mt-4 inline-flex rounded-full bg-zinc-950 px-4 py-2 text-xs font-black text-white">Lengkapi Profil</Link>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-zinc-900">Kegiatan Saya</h2>
          <Link to="/kegiatan" className="text-xs font-black text-[#9f7500] hover:text-zinc-900">Lihat Semua</Link>
        </div>
        <div className="space-y-3">
          {nextEvents.map((event) => (
            <EventRow key={event.id} event={event} />
          ))}
          {nextEvents.length === 0 && (
            <div className="rounded-lg border border-[#e8dfd2] bg-white p-5 text-center text-sm font-semibold text-zinc-500">
              Belum ada kegiatan aktif untuk akun ini.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}