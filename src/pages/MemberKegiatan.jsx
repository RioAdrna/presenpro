import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Calendar, Clock, MapPin, Search } from 'lucide-react'
import { eventsApi, usersApi } from '../lib/api'
import { PageSkeleton } from '../components/Skeleton'
import useSkeletonLoading from '../hooks/useSkeletonLoading'

const filters = ['Semua', 'Aktif', 'Akan Datang', 'Selesai']

function MemberEventCard({ event, onOpen }) {
  return (
    <article className="rounded-lg border border-[#e8dfd2] bg-white p-4 shadow-[0_10px_24px_rgba(34,25,6,0.035)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="inline-flex rounded-full bg-[#fff4cf] px-2.5 py-1 text-[10px] font-black text-[#8b6800]">{event.category}</p>
          <h2 className="mt-3 text-lg font-black leading-tight text-zinc-900">{event.title}</h2>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${event.status === 'Selesai' ? 'bg-zinc-100 text-zinc-500' : 'bg-zinc-950 text-[#ffc400]'}`}>
          {event.status}
        </span>
      </div>

      <div className="mt-4 space-y-2 text-xs font-semibold text-zinc-600">
        <p className="flex items-center gap-2"><Calendar size={14} className="text-[#9f7500]" />{event.date}</p>
        <p className="flex items-center gap-2"><Clock size={14} className="text-[#9f7500]" />{event.time}</p>
        <p className="flex items-center gap-2"><MapPin size={14} className="text-[#9f7500]" />{event.place}</p>
      </div>

      <button className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#ffc400] text-xs font-black text-zinc-950 hover:bg-[#ffd451]" onClick={() => onOpen(event)}>
        Buka Detail
        <ArrowRight size={15} />
      </button>
    </article>
  )
}

export default function MemberKegiatan() {
  const initialLoading = useSkeletonLoading()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('Semua')

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

  const filteredEvents = useMemo(
    () =>
      myEvents.filter((event) => {
        const text = `${event.title} ${event.place} ${event.category}`.toLowerCase()
        const matchesQuery = text.includes(query.toLowerCase())
        const matchesFilter = activeFilter === 'Semua' || event.status === activeFilter
        return matchesQuery && matchesFilter
      }),
    [myEvents, query, activeFilter],
  )

  if (initialLoading || loading) return <PageSkeleton cards={4} />

  return (
    <div className="page-shell space-y-5">
      <section>
        <h1 className="text-[26px] font-black leading-tight text-zinc-900">Kegiatan Saya</h1>
      </section>

      <section className="rounded-lg border border-[#e8dfd2] bg-white p-3">
        <label className="relative block">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari kegiatan..."
            className="h-11 w-full rounded-full border border-[#e8dfd2] bg-[#fbfaf8] pl-11 pr-4 text-sm font-semibold outline-none placeholder:text-zinc-400 focus:border-[#d8b149] focus:bg-white"
          />
        </label>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {filters.map((filter) => (
            <button
              key={filter}
              className={`h-9 shrink-0 rounded-full px-4 text-[11px] font-black ${activeFilter === filter ? 'bg-zinc-950 text-white' : 'bg-[#f4f1ed] text-zinc-600 hover:bg-[#fff4cf]'}`}
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>
      </section>

      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">{error}</div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filteredEvents.map((event) => (
          <MemberEventCard key={event.id} event={event} onOpen={(item) => navigate(`/kegiatan/${item.id}`)} />
        ))}
      </section>

      {filteredEvents.length === 0 && (
        <div className="rounded-lg border border-[#e8dfd2] bg-white p-8 text-center text-sm font-semibold text-zinc-500">
          Tidak ada kegiatan sesuai filter.
        </div>
      )}
    </div>
  )
}
