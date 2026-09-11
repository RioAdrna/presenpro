import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Swal from 'sweetalert2'
import { ArrowLeft, Calendar, CheckCircle2, Clock, MapPin, QrCode, Users } from 'lucide-react'
import { eventsApi, usersApi } from '../lib/api'
import { PageSkeleton } from '../components/Skeleton'
import useSkeletonLoading from '../hooks/useSkeletonLoading'

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg border border-[#e8dfd2] bg-white p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fff4cf] text-[#9f7500]">
          <Icon size={16} />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase text-zinc-500">{label}</p>
          <p className="mt-1 truncate text-sm font-black text-zinc-900">{value}</p>
        </div>
      </div>
    </div>
  )
}

function MeetingCard({ meeting, attendanceStatus, sessionOpen, onAttend, onPermit, submitting, profileComplete }) {
  const [permitOpen, setPermitOpen] = useState(false)
  const [permitNote, setPermitNote] = useState('')
  const attended = Boolean(attendanceStatus)
  const canAttend = profileComplete && sessionOpen && !attended && !submitting

  async function submitPermit(event) {
    event.preventDefault()
    if (!permitNote.trim()) return
    await onPermit(meeting, permitNote)
    setPermitNote('')
    setPermitOpen(false)
  }

  return (
    <article className="rounded-lg border border-[#e8dfd2] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-black text-zinc-900">{meeting.title}</h3>
          <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-zinc-500">
            <Calendar size={13} />
            {meeting.date}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-zinc-500">
            <Clock size={13} />
            {meeting.time}
          </p>
          <p className="mt-1 text-xs font-bold text-[#8b6800]">{meeting.attendanceMode === 'online' ? 'Online' : 'Offline'}{meeting.place ? ` - ${meeting.place}` : ''}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${attended ? 'bg-emerald-50 text-emerald-700' : 'bg-[#fff4cf] text-[#8b6800]'}`}>
          {attendanceStatus === 'IZIN' ? 'Izin Tercatat' : attended ? 'Presensi Tercatat' : meeting.status}
        </span>
      </div>

      <button
        className={`mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-black ${
          attended
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-zinc-950 text-[#ffc400] hover:bg-zinc-800'
        } disabled:cursor-not-allowed disabled:opacity-65`}
        onClick={() => onAttend(meeting)}
        disabled={!canAttend}
      >
        {attended ? <CheckCircle2 size={17} /> : <QrCode size={17} />}
        {attended ? (attendanceStatus === 'IZIN' ? 'Izin Tercatat' : 'Presensi Tercatat') : submitting ? 'Mencatat...' : 'Hadir Saya'}
      </button>
      {!attended && !profileComplete && (
        <p className="mt-2 text-center text-xs font-semibold text-zinc-500">Lengkapi profil terlebih dahulu untuk melakukan absensi.</p>
      )}
      {!attended && profileComplete && !sessionOpen && (
        <p className="mt-2 text-center text-xs font-semibold text-zinc-500">Absensi belum dibuka oleh Sekre atau Ketua Bidang.</p>
      )}
      {!attended && (
        <button
          type="button"
          className="mt-2 h-10 w-full rounded-full border border-[#e8dfd2] bg-white text-xs font-black text-zinc-700 hover:border-[#d8b149]"
          onClick={() => setPermitOpen((value) => !value)}
          disabled={submitting}
        >
          Ajukan Izin
        </button>
      )}
      {permitOpen && !attended && (
        <form className="mt-3 space-y-2" onSubmit={submitPermit}>
          <textarea
            value={permitNote}
            onChange={(event) => setPermitNote(event.target.value)}
            placeholder="Tulis alasan izin"
            maxLength={255}
            required
            className="min-h-20 w-full rounded-lg border border-[#e8dfd2] bg-[#fbfaf8] p-3 text-xs font-semibold outline-none focus:border-[#d8b149]"
          />
          <button type="submit" className="h-10 w-full rounded-full bg-[#ffc400] text-xs font-black text-zinc-950" disabled={submitting || !permitNote.trim()}>
            {submitting ? 'Mengirim...' : 'Kirim Pengajuan Izin'}
          </button>
        </form>
      )}
    </article>
  )
}

export default function MemberKegiatanDetail() {
  const initialLoading = useSkeletonLoading()
  const navigate = useNavigate()
  const { eventId } = useParams()
  const [event, setEvent] = useState(null)
  const [profile, setProfile] = useState(null)
  const [attendanceStatuses, setAttendanceStatuses] = useState({})
  const [sessionStatuses, setSessionStatuses] = useState({})
  const [loading, setLoading] = useState(true)
  const [submittingId, setSubmittingId] = useState(null)
  const [error, setError] = useState('')

  const meetings = useMemo(() => event?.meetings || [], [event])

  useEffect(() => {
    let cancelled = false

    Promise.all([usersApi.getProfile(), eventsApi.detail(eventId)])
      .then(async ([profileData, eventData]) => {
        if (cancelled) return
        const nextEvent = eventData.event
        setProfile(profileData)
        setEvent(nextEvent)

        const attendanceResults = await Promise.all(
          (nextEvent.meetings || []).map((meeting) =>
            eventsApi
              .meetingAttendance(nextEvent.id, meeting.id)
              .then((res) => ({ meetingId: meeting.id, rows: res.attendances || [], sessionOpen: Boolean(res.session?.active) }))
              .catch(() => ({ meetingId: meeting.id, rows: [], sessionOpen: false })),
          ),
        )

        if (cancelled) return
        const statuses = {}
        const sessions = {}
        attendanceResults.forEach((result) => {
          const ownAttendance = result.rows.find((row) => row.nim === profileData.nim)
          if (ownAttendance) {
            statuses[result.meetingId] = ownAttendance.status
          }
          sessions[result.meetingId] = result.sessionOpen
        })
        setAttendanceStatuses(statuses)
        setSessionStatuses(sessions)
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
  }, [eventId])

  useEffect(() => {
    if (!event?.meetings?.length) return undefined

    let cancelled = false
    const refreshSessions = async () => {
      if (document.visibilityState !== 'visible') return
      const results = await Promise.all(event.meetings.map((meeting) => eventsApi.meetingAttendance(event.id, meeting.id).catch(() => null)))
      if (cancelled) return
      const nextSessions = {}
      const nextStatuses = {}
      results.forEach((result, index) => {
        const meeting = event.meetings[index]
        if (!result) return
        nextSessions[meeting.id] = Boolean(result.session?.active)
        const ownAttendance = (result.attendances || []).find((row) => row.nim === profile?.nim)
        if (ownAttendance) nextStatuses[meeting.id] = ownAttendance.status
      })
      setSessionStatuses(nextSessions)
      setAttendanceStatuses(nextStatuses)
    }
    const timer = window.setInterval(refreshSessions, 15000)
    document.addEventListener('visibilitychange', refreshSessions)
    return () => {
      cancelled = true
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', refreshSessions)
    }
  }, [event, profile?.nim])

  const participant = useMemo(
    () => event?.participantDetails?.find((member) => member.nim === profile?.nim),
    [event, profile],
  )

  async function handleAttend(meeting) {
    if (!sessionStatuses[meeting.id]) {
      Swal.fire({ icon: 'info', title: 'Absensi belum dibuka', text: 'Tunggu Sekre atau Ketua Bidang membuka sesi absensi.', confirmButtonColor: '#f6bd16' })
      return
    }

    setSubmittingId(meeting.id)
    try {
      const data = await eventsApi.scanSelfMeeting(event.id, meeting.id)
      setAttendanceStatuses((current) => ({ ...current, [meeting.id]: 'HADIR' }))
      Swal.fire({
        icon: 'success',
        title: 'Berhasil',
        text: data.message || 'Absensi Anda berhasil dicatat.',
        confirmButtonColor: '#10b981',
      })
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: err.message,
        confirmButtonColor: '#f6bd16',
      })
    } finally {
      setSubmittingId(null)
    }
  }

  async function handlePermit(meeting, note) {
    setSubmittingId(meeting.id)
    try {
      const data = await eventsApi.requestPermit(event.id, meeting.id, note)
      setAttendanceStatuses((current) => ({ ...current, [meeting.id]: 'IZIN' }))
      Swal.fire({
        icon: 'success',
        title: 'Berhasil',
        text: data.message || 'Pengajuan izin berhasil dicatat.',
        confirmButtonColor: '#10b981',
      })
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: err.message, confirmButtonColor: '#f6bd16' })
      throw err
    } finally {
      setSubmittingId(null)
    }
  }

  if (initialLoading || loading) return <PageSkeleton cards={4} />

  if (!event || error) {
    return (
      <div className="page-shell space-y-5">
        <button className="button-soft" onClick={() => navigate('/kegiatan')}>
          <ArrowLeft size={15} />
          Kembali
        </button>
        <div className="rounded-lg border border-[#e8dfd2] bg-white p-8 text-center text-sm font-semibold text-zinc-500">{error || 'Kegiatan tidak ditemukan.'}</div>
      </div>
    )
  }

  return (
    <div className="page-shell space-y-5">
      <button className="inline-flex items-center gap-2 text-xs font-black text-zinc-500 hover:text-zinc-900" onClick={() => navigate('/kegiatan')}>
        <ArrowLeft size={14} />
        Kembali ke Kegiatan
      </button>

      <section className="rounded-lg bg-zinc-950 px-5 py-6 text-white">
        <span className="rounded-full bg-[#ffc400] px-3 py-1 text-[10px] font-black text-zinc-950">{event.category}</span>
        <h1 className="mt-4 text-[26px] font-black leading-tight">{event.title}</h1>
        <p className="mt-2 text-sm font-medium text-zinc-300">{participant?.eventDivision || 'Peserta kegiatan'}</p>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <InfoItem icon={Calendar} label="Tanggal" value={event.date} />
        <InfoItem icon={Clock} label="Waktu" value={event.time} />
        <InfoItem icon={MapPin} label="Lokasi" value={event.place} />
        <InfoItem icon={Users} label="Peserta" value={`${event.participantCount} orang`} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-black text-zinc-900">Pertemuan</h2>
        {meetings.map((meeting) => (
          <MeetingCard
            key={meeting.id}
            meeting={meeting}
            attendanceStatus={attendanceStatuses[meeting.id]}
            sessionOpen={sessionStatuses[meeting.id]}
            onAttend={handleAttend}
            onPermit={handlePermit}
            submitting={submittingId === meeting.id}
            profileComplete={profile?.profileComplete}
            />
        ))}
        {meetings.length === 0 && (
          <div className="rounded-lg border border-[#e8dfd2] bg-white p-8 text-center text-sm font-semibold text-zinc-500">
            Belum ada pertemuan untuk kegiatan ini.
          </div>
        )}
      </section>
    </div>
  )
}


