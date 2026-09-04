import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Swal from 'sweetalert2'
import { ArrowLeft, Calendar, Check, Clock, Edit3, MapPin, Plus, Search, Trash2, Users, X } from 'lucide-react'
import useSkeletonLoading from '../hooks/useSkeletonLoading'
import { PageSkeleton } from '../components/Skeleton'
import AttendanceSession from '../components/AttendanceSession'
import Modal from '../components/Modal'
import SelectMenu from '../components/SelectMenu'
import { divisionTemplatesApi, eventsApi, membersApi } from '../lib/api'

const statusOptions = ['Aktif', 'Akan Datang', 'Selesai', 'Dibatalkan']
const meetingStatusOptions = ['Aktif', 'Akan Datang', 'Selesai']
const categories = ['Rapat', 'Pelatihan', 'Evaluasi', 'Penugasan', 'Lainnya']

function InfoCard({ icon: Icon, label, value }) {
  return (
    <article className="surface card-motion p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fff4cf] text-[#9f7500]">
          <Icon size={16} />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase text-zinc-500">{label}</p>
          <p className="mt-1 text-sm font-black text-zinc-900">{value}</p>
        </div>
      </div>
    </article>
  )
}

function groupParticipants(participants = []) {
  const grouped = new Map()

  participants.forEach((member) => {
    if (!member.id) return
    const name = member.eventDivision || 'Peserta'
    if (!grouped.has(name)) {
      grouped.set(name, { id: `div-${grouped.size + 1}`, name, members: [] })
    }
    grouped.get(name).members.push(member.id)
  })

  return Array.from(grouped.values())
}

function CreateMeetingModal({ isOpen, onClose, onSubmit, isSubmitting, error }) {
  const [form, setForm] = useState({ title: '', meetingDate: '', startTime: '', endTime: '', attendanceMode: 'offline', place: '', lateTolerance: 15 })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm" onClick={onClose} />
      <div className="surface relative w-full max-w-lg overflow-hidden" style={{ animation: 'modal-enter 200ms ease-out' }}>
        <div className="flex items-center justify-between border-b border-[#eee7dd] px-6 py-4">
          <h2 className="text-lg font-black text-zinc-900">Tambah Pertemuan</h2>
          <button className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSubmit(form) }} className="p-6">
          {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs font-bold text-red-600">{error}</div>}

          <div className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-zinc-700">Judul Pertemuan</span>
              <input type="text" className="h-10 w-full rounded-lg border border-[#e8dfd2] bg-[#fbfaf8] px-3 text-sm focus:border-[#f6bd16] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#f6bd16]/10" placeholder="Contoh: Rapat Evaluasi 1" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </label>

            <div className="grid grid-cols-2 gap-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-bold text-zinc-700">Tanggal Pertemuan</span>
                <input type="date" className="h-10 w-full rounded-lg border border-[#e8dfd2] bg-[#fbfaf8] px-3 text-sm focus:border-[#f6bd16] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#f6bd16]/10" value={form.meetingDate} onChange={(e) => setForm({ ...form, meetingDate: e.target.value })} required />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-bold text-zinc-700">Toleransi Telat</span>
                <input type="number" min="0" className="h-10 w-full rounded-lg border border-[#e8dfd2] bg-[#fbfaf8] px-3 text-sm focus:border-[#f6bd16] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#f6bd16]/10" value={form.lateTolerance} onChange={(e) => setForm({ ...form, lateTolerance: e.target.value })} required />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-bold text-zinc-700">Jam Mulai</span>
                <input type="time" className="h-10 w-full rounded-lg border border-[#e8dfd2] bg-[#fbfaf8] px-3 text-sm focus:border-[#f6bd16] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#f6bd16]/10" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-bold text-zinc-700">Jam Selesai</span>
                <input type="time" className="h-10 w-full rounded-lg border border-[#e8dfd2] bg-[#fbfaf8] px-3 text-sm focus:border-[#f6bd16] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#f6bd16]/10" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} required />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-bold text-zinc-700">Mode Pertemuan</span>
                <select value={form.attendanceMode} onChange={(e) => setForm({ ...form, attendanceMode: e.target.value })} className="h-10 w-full rounded-lg border border-[#e8dfd2] bg-white px-3 text-sm focus:border-[#f6bd16] focus:outline-none"><option value="offline">Offline</option><option value="online">Online</option></select>
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-bold text-zinc-700">{form.attendanceMode === 'online' ? 'Link Zoom / Meet' : 'Lokasi Rapat'}</span>
                <input required type={form.attendanceMode === 'online' ? 'url' : 'text'} className="h-10 w-full rounded-lg border border-[#e8dfd2] bg-[#fbfaf8] px-3 text-sm focus:border-[#f6bd16] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#f6bd16]/10" placeholder={form.attendanceMode === 'online' ? 'https://meet.google.com/...' : 'Ruang rapat'} value={form.place} onChange={(e) => setForm({ ...form, place: e.target.value })} />
              </label>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#eee7dd] pt-4">
            <button type="button" className="button-soft" onClick={onClose} disabled={isSubmitting}>Batal</button>
            <button type="submit" className="button-dark" disabled={isSubmitting}>{isSubmitting ? 'Menyimpan...' : 'Simpan Pertemuan'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function KegiatanDetail() {
  const loading = useSkeletonLoading()
  const navigate = useNavigate()
  const { eventId } = useParams()
  const [event, setEvent] = useState(null)
  const [members, setMembers] = useState([])
  const [templates, setTemplates] = useState([])
  const [activeMeeting, setActiveMeeting] = useState(null)
  const [fetching, setFetching] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [modalError, setModalError] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [editForm, setEditForm] = useState({ title: '', category: 'Rapat', status: 'Aktif', eventDate: '', startTime: '', endTime: '', attendanceMode: 'offline', place: '', lateTolerance: 15, participantLimit: 0 })
  const [editDivisions, setEditDivisions] = useState([])
  const [divisionModalOpen, setDivisionModalOpen] = useState(false)
  const [newDivisionName, setNewDivisionName] = useState('')
  const [memberModalOpen, setMemberModalOpen] = useState(null)
  const [memberSearch, setMemberSearch] = useState('')
  const [meetingEditOpen, setMeetingEditOpen] = useState(false)
  const [meetingSaving, setMeetingSaving] = useState(false)
  const [meetingError, setMeetingError] = useState('')
  const [selectedMeeting, setSelectedMeeting] = useState(null)
  const [meetingForm, setMeetingForm] = useState({ title: '', meetingDate: '', startTime: '', endTime: '', attendanceMode: 'offline', place: '', lateTolerance: 15, status: 'Aktif' })

  const participants = useMemo(() => event?.participantDetails || [], [event])
  const meetings = useMemo(() => event?.meetings || [], [event])
  const totalEditParticipants = useMemo(() => editDivisions.reduce((sum, div) => sum + div.members.length, 0), [editDivisions])
  const editLimit = Number(editForm.participantLimit) || 0
  const isEditLimitReached = editLimit > 0 && totalEditParticipants >= editLimit

  const filteredMembersForPicker = useMemo(() => {
    const term = memberSearch.toLowerCase()
    if (!term) return members
    return members.filter((member) => `${member.name} ${member.nim}`.toLowerCase().includes(term))
  }, [members, memberSearch])

  useEffect(() => {
    let cancelled = false
    setFetching(true)
    setFetchError('')
    setActiveMeeting(null)

    Promise.all([eventsApi.detail(eventId), membersApi.list(), divisionTemplatesApi.list()])
      .then(([eventData, membersData, templatesData]) => {
        if (cancelled) return
        setEvent(eventData.event)
        setMembers(membersData.members || [])
        setTemplates(templatesData.divisionTemplates || [])
      })
      .catch((err) => {
        if (!cancelled) setFetchError(err.message)
      })
      .finally(() => {
        if (!cancelled) setFetching(false)
      })

    return () => {
      cancelled = true
    }
  }, [eventId])

  async function refreshEvent() {
    const data = await eventsApi.detail(eventId)
    setEvent(data.event)
  }

  function openEditEvent() {
    if (!event) return
    setEditForm({
      title: event.title || '',
      category: event.category || 'Rapat',
      status: event.status || 'Aktif',
      eventDate: event.eventDate || '',
      startTime: event.startTime || '',
      endTime: event.endTime || '',
      attendanceMode: event.meetings?.[0]?.attendanceMode || 'offline',
      place: event.place || '',
      lateTolerance: event.lateTolerance || 15,
      participantLimit: event.participantCount || 0,
    })
    setEditDivisions(groupParticipants(event.participantDetails))
    setEditError('')
    setMemberSearch('')
    setEditOpen(true)
  }

  function addEditDivision(name) {
    const cleanName = name.trim()
    if (!cleanName) return
    setEditDivisions((current) => [...current, { id: `div-${Date.now()}`, name: cleanName, members: [] }])
    setDivisionModalOpen(false)
    setNewDivisionName('')
  }

  function removeEditDivision(divisionId) {
    setEditDivisions((current) => current.filter((division) => division.id !== divisionId))
  }

  function toggleMemberInDivision(divisionId, memberId) {
    const existingDivision = editDivisions.find((division) => division.id !== divisionId && division.members.includes(memberId))
    if (existingDivision) {
      Swal.fire({
        icon: 'error',
        title: 'Tidak Bisa Dipilih',
        text: `Anggota ini sudah berada di divisi ${existingDivision.name}.`,
        confirmButtonColor: '#f6bd16',
      })
      return
    }

    setEditDivisions((current) => current.map((division) => {
      if (division.id !== divisionId) return division
      const selected = division.members.includes(memberId)
      if (selected) return { ...division, members: division.members.filter((id) => id !== memberId) }
      if (isEditLimitReached) {
        Swal.fire({
          icon: 'warning',
          title: 'Kuota Penuh',
          text: `Batas peserta (${editLimit} orang) sudah tercapai.`,
          confirmButtonColor: '#f6bd16',
        })
        return division
      }
      return { ...division, members: [...division.members, memberId] }
    }))
  }

  async function handleUpdateEvent(submitEvent) {
    submitEvent.preventDefault()
    if (!editForm.title.trim()) {
      setEditError('Nama kegiatan wajib diisi.')
      return
    }
    if (editLimit <= 0) {
      setEditError('Kapasitas peserta harus lebih dari 0.')
      return
    }
    if (totalEditParticipants > editLimit) {
      setEditError('Jumlah personel terpilih melebihi kapasitas peserta.')
      return
    }

    setEditSaving(true)
    setEditError('')

    try {
      const payload = {
        ...editForm,
        title: editForm.title.trim(),
        lateTolerance: Number(editForm.lateTolerance) || 0,
        participantLimit: editLimit,
        divisions: editDivisions
          .map((division) => ({ name: division.name, members: division.members }))
          .filter((division) => division.members.length > 0),
      }
      const data = await eventsApi.update(event.id, payload)
      setEvent(data.event)
      setEditOpen(false)
      Swal.fire({ icon: 'success', title: 'Berhasil', text: data.message, confirmButtonColor: '#10b981' })
    } catch (err) {
      setEditError(err.message)
    } finally {
      setEditSaving(false)
    }
  }

  async function handleDeleteEvent() {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Hapus kegiatan?',
      text: 'Semua peserta, pertemuan, sesi, dan log absensi kegiatan ini akan ikut dihapus.',
      showCancelButton: true,
      confirmButtonText: 'Ya, hapus',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#a1a1aa',
    })

    if (!result.isConfirmed) return

    try {
      await eventsApi.remove(event.id)
      navigate('/kegiatan')
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: err.message, confirmButtonColor: '#f6bd16' })
    }
  }

  async function handleCreateMeeting(form) {
    setSubmitting(true)
    setModalError('')
    try {
      const data = await eventsApi.createMeeting(event.id, form)
      setEvent({ ...event, meetings: data.meetings })
      setModalOpen(false)
    } catch (err) {
      setModalError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  function openMeetingEdit(meeting) {
    setSelectedMeeting(meeting)
    setMeetingForm({
      title: meeting.title || '',
      meetingDate: meeting.meetingDate || '',
      startTime: meeting.startTime || '',
      endTime: meeting.endTime || '',
      attendanceMode: meeting.attendanceMode || 'offline',
      place: meeting.place || '',
      lateTolerance: meeting.lateTolerance || 15,
      status: meeting.status || 'Aktif',
    })
    setMeetingError('')
    setMeetingEditOpen(true)
  }

  async function handleUpdateMeeting(submitEvent) {
    submitEvent.preventDefault()
    if (!selectedMeeting) return

    setMeetingSaving(true)
    setMeetingError('')

    try {
      const data = await eventsApi.updateMeeting(event.id, selectedMeeting.id, meetingForm)
      setEvent({ ...event, meetings: data.meetings })
      setMeetingEditOpen(false)
      Swal.fire({ icon: 'success', title: 'Berhasil', text: data.message, confirmButtonColor: '#10b981' })
    } catch (err) {
      setMeetingError(err.message)
    } finally {
      setMeetingSaving(false)
    }
  }

  async function handleDeleteMeeting(meeting) {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Hapus pertemuan?',
      text: 'Sesi dan log absensi pada pertemuan ini akan ikut dihapus.',
      showCancelButton: true,
      confirmButtonText: 'Ya, hapus',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#a1a1aa',
    })

    if (!result.isConfirmed) return

    try {
      const data = await eventsApi.removeMeeting(event.id, meeting.id)
      setEvent({ ...event, meetings: data.meetings })
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: err.message, confirmButtonColor: '#f6bd16' })
    }
  }

  if (loading || fetching) return <PageSkeleton cards={4} />

  if (!event || fetchError) {
    return (
      <div className="page-shell space-y-5">
        <button className="button-soft" onClick={() => navigate('/kegiatan')}>
          <ArrowLeft size={15} />
          Kembali
        </button>
        <div className="surface p-8 text-center text-sm font-semibold text-zinc-500">{fetchError || 'Kegiatan tidak ditemukan.'}</div>
      </div>
    )
  }

  if (activeMeeting) {
    return (
      <AttendanceSession
        event={event}
        meeting={activeMeeting}
        onBack={() => {
          setActiveMeeting(null)
          refreshEvent()
        }}
      />
    )
  }

  return (
    <>
      <div className="page-shell space-y-6">
        <section className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-start">
          <div className="min-w-0">
            <button className="mb-4 inline-flex items-center gap-2 text-xs font-black text-zinc-500 hover:text-zinc-900" onClick={() => navigate('/kegiatan')}>
              <ArrowLeft size={14} />
              Kembali ke Kegiatan
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#fff4cf] px-3 py-1 text-[10px] font-black text-[#8b6800]">{event.category}</span>
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-[10px] font-black text-zinc-500">
                {event.status}
              </span>
            </div>
            <h1 className="mt-3 text-[28px] font-black leading-tight text-zinc-900">{event.title}</h1>
            <p className="mt-2 text-sm font-semibold text-zinc-600">Kegiatan Proker Utama</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <button className="button-soft w-full sm:w-auto" onClick={openEditEvent}>
              <Edit3 size={15} />
              Edit
            </button>
            <button className="flex h-10 w-full items-center justify-center gap-2 rounded-full bg-red-50 px-5 text-xs font-black text-red-600 hover:bg-red-100 sm:w-auto" onClick={handleDeleteEvent}>
              <Trash2 size={15} />
              Hapus
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <InfoCard icon={Calendar} label="Tanggal Mulai" value={event.date} />
          <InfoCard icon={Clock} label="Jam Mulai" value={event.time} />
          <InfoCard icon={MapPin} label="Lokasi Utama" value={event.place} />
          <InfoCard icon={Users} label="Total Peserta" value={`${event.participantCount} orang`} />
        </section>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-black text-zinc-900">Daftar Pertemuan</h2>
          <button className="button-dark w-full sm:w-auto" onClick={() => setModalOpen(true)}>
            <Plus size={14} />
            Tambah Pertemuan
          </button>
        </div>

        {meetings.length === 0 ? (
          <div className="surface p-12 text-center text-sm font-bold text-zinc-400">Belum ada pertemuan yang dibuat untuk kegiatan ini.</div>
        ) : (
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {meetings.map((meeting) => (
              <article key={meeting.id} className="surface flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-black text-zinc-900">{meeting.title}</h3>
                    <div className="mt-2 flex flex-col gap-1 text-xs font-semibold text-zinc-500 sm:flex-row sm:items-center sm:gap-3">
                      <div className="flex items-center gap-1.5"><Calendar size={13} /> {meeting.date}</div>
                      <div className="flex items-center gap-1.5"><Clock size={13} /> {meeting.time}</div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="block text-xl font-black text-zinc-900">{meeting.presentCount} <span className="text-xs font-semibold text-zinc-400">/ {event.participantCount}</span></span>
                    <span className="text-[10px] font-bold uppercase text-[#8b6800]">Hadir</span>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-1 gap-2 border-t border-[#eee7dd] pt-4 sm:grid-cols-[1fr_auto_auto]">
                  <button className="button-primary w-full" onClick={() => setActiveMeeting(meeting)}>
                    Buka Absensi
                  </button>
                  <button className="button-soft h-10 px-4" onClick={() => openMeetingEdit(meeting)} aria-label={`Edit ${meeting.title}`}>
                    <Edit3 size={14} />
                  </button>
                  <button className="flex h-10 items-center justify-center rounded-full bg-red-50 px-4 text-red-600 hover:bg-red-100" onClick={() => handleDeleteMeeting(meeting)} aria-label={`Hapus ${meeting.title}`}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}

        <section className="mt-8">
          <div className="surface overflow-hidden">
            <div className="border-b border-[#eee7dd] px-5 py-4">
              <h2 className="text-lg font-black text-zinc-900">Peserta Kegiatan</h2>
              <p className="mt-1 text-xs font-semibold text-zinc-500">Anggota yang terdaftar pada kegiatan.</p>
            </div>
            <div className="divide-y divide-[#eee7dd]">
              {participants.map((member) => (
                <div key={member.nim} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eadfcb] text-xs font-black text-[#8b6800]">{member.initial}</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-zinc-800">{member.name}</p>
                      <p className="text-xs font-semibold text-zinc-500">{member.nim} - <span className="font-bold text-[#8b6800]">{member.eventDivision || 'Peserta'}</span></p>
                    </div>
                  </div>
                  <span className="rounded-full bg-[#f4f1ed] px-2.5 py-1 text-[10px] font-black text-zinc-500">Terdaftar</span>
                </div>
              ))}
              {participants.length === 0 && (
                <div className="px-5 py-10 text-center text-sm font-semibold text-zinc-500">Belum ada peserta.</div>
              )}
            </div>
          </div>
        </section>
      </div>

      <CreateMeetingModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleCreateMeeting} isSubmitting={submitting} error={modalError} />

      <Modal open={editOpen} title="Edit Kegiatan" description="Ubah data kegiatan dan susunan personel." onClose={() => setEditOpen(false)}>
        <form className="flex flex-col gap-6" onSubmit={handleUpdateEvent}>
          {editError && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600">{editError}</div>}

          <div className="space-y-4">
            <h3 className="text-sm font-black text-zinc-800">1. Informasi Kegiatan</h3>
            <label className="block space-y-2">
              <span className="text-xs font-black uppercase text-zinc-600">Nama Kegiatan</span>
              <input required value={editForm.title} onChange={(input) => setEditForm({ ...editForm, title: input.target.value })} className="h-11 w-full rounded-lg border border-[#e8dfd2] px-4 text-sm font-semibold outline-none focus:border-[#d8b149]" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-xs font-black uppercase text-zinc-600">Kategori</span>
                <SelectMenu value={editForm.category} options={categories} onChange={(value) => setEditForm({ ...editForm, category: value })} buttonClassName="h-11 rounded-lg text-sm" />
              </label>
              <label className="block space-y-2">
                <span className="text-xs font-black uppercase text-zinc-600">Status</span>
                <SelectMenu value={editForm.status} options={statusOptions} onChange={(value) => setEditForm({ ...editForm, status: value })} buttonClassName="h-11 rounded-lg text-sm" />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block space-y-2">
                <span className="text-xs font-black uppercase text-zinc-600">Tanggal</span>
                <input required type="date" value={editForm.eventDate} onChange={(input) => setEditForm({ ...editForm, eventDate: input.target.value })} className="h-11 w-full rounded-lg border border-[#e8dfd2] px-4 text-sm font-semibold outline-none focus:border-[#d8b149]" />
              </label>
              <label className="block space-y-2">
                <span className="text-xs font-black uppercase text-zinc-600">Jam Mulai</span>
                <input required type="time" value={editForm.startTime} onChange={(input) => setEditForm({ ...editForm, startTime: input.target.value })} className="h-11 w-full rounded-lg border border-[#e8dfd2] px-4 text-sm font-semibold outline-none focus:border-[#d8b149]" />
              </label>
              <label className="block space-y-2">
                <span className="text-xs font-black uppercase text-zinc-600">Jam Selesai</span>
                <input required type="time" value={editForm.endTime} onChange={(input) => setEditForm({ ...editForm, endTime: input.target.value })} className="h-11 w-full rounded-lg border border-[#e8dfd2] px-4 text-sm font-semibold outline-none focus:border-[#d8b149]" />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-xs font-black uppercase text-zinc-600">Mode Pertemuan</span>
                <select value={editForm.attendanceMode} onChange={(input) => setEditForm({ ...editForm, attendanceMode: input.target.value })} className="h-11 w-full rounded-lg border border-[#e8dfd2] bg-white px-4 text-sm font-semibold outline-none focus:border-[#d8b149]"><option value="offline">Offline</option><option value="online">Online</option></select>
              </label>
              <label className="block space-y-2">
                <span className="text-xs font-black uppercase text-zinc-600">{editForm.attendanceMode === 'online' ? 'Link Zoom / Meet' : 'Lokasi Rapat'}</span>
                <input required type={editForm.attendanceMode === 'online' ? 'url' : 'text'} value={editForm.place} onChange={(input) => setEditForm({ ...editForm, place: input.target.value })} className="h-11 w-full rounded-lg border border-[#e8dfd2] px-4 text-sm font-semibold outline-none focus:border-[#d8b149]" />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-xs font-black uppercase text-zinc-600">Kapasitas Peserta</span>
                <input required type="number" min="1" value={editForm.participantLimit} onChange={(input) => setEditForm({ ...editForm, participantLimit: input.target.value })} className="h-11 w-full rounded-lg border border-[#e8dfd2] px-4 text-sm font-semibold outline-none focus:border-[#d8b149]" />
              </label>
              <label className="block space-y-2">
                <span className="text-xs font-black uppercase text-zinc-600">Toleransi Telat</span>
                <input required type="number" min="0" value={editForm.lateTolerance} onChange={(input) => setEditForm({ ...editForm, lateTolerance: input.target.value })} className="h-11 w-full rounded-lg border border-[#e8dfd2] px-4 text-sm font-semibold outline-none focus:border-[#d8b149]" />
              </label>
            </div>
          </div>

          <div className="space-y-4 border-t border-[#eee7dd] pt-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-zinc-800">2. Susunan Personel</h3>
                <p className={`mt-1 text-xs font-semibold ${isEditLimitReached ? 'text-green-600' : 'text-zinc-500'}`}>
                  Terpilih: {totalEditParticipants} dari {editForm.participantLimit} kuota anggota
                </p>
              </div>
              <button type="button" className="button-soft h-8 px-3 text-xs" onClick={() => setDivisionModalOpen(true)}>
                <Plus size={13} />
                Tambah Divisi
              </button>
            </div>

            {editDivisions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#d1c5b4] bg-[#fbf9f6] p-6 text-center text-sm font-semibold text-zinc-500">
                Belum ada divisi. Tambahkan divisi untuk memilih personel.
              </div>
            ) : (
              <div className="space-y-3">
                {editDivisions.map((division) => (
                  <div key={division.id} className="rounded-xl border border-[#e8dfd2] bg-white p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-bold text-zinc-800">{division.name}</h4>
                        <p className="text-[11px] font-semibold text-zinc-500">{division.members.length} anggota</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" className="button-soft h-8 px-3 text-[11px]" onClick={() => setMemberModalOpen(division.id)}>
                          <Users size={12} />
                          Kelola
                        </button>
                        <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100" onClick={() => removeEditDivision(division.id)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    {division.members.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {division.members.map((memberId) => {
                          const member = members.find((item) => item.id === memberId)
                          if (!member) return null
                          return (
                            <span key={memberId} className="inline-flex items-center rounded bg-[#f2eee6] px-2 py-1 text-xs font-semibold text-zinc-700">
                              {member.name}
                            </span>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-xs font-medium text-zinc-400">Belum ada anggota.</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-2 flex flex-col-reverse gap-2 border-t border-[#eee7dd] pt-4 sm:flex-row sm:justify-end">
            <button type="button" className="button-soft w-full sm:w-auto" onClick={() => setEditOpen(false)} disabled={editSaving}>Batal</button>
            <button type="submit" className="button-primary w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto" disabled={editSaving}>
              {editSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={divisionModalOpen} title="Tambah Divisi Kegiatan" onClose={() => setDivisionModalOpen(false)}>
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-xs font-black uppercase text-zinc-600">Pilih dari Template</p>
            <div className="flex flex-wrap gap-2">
              {templates.map((template) => (
                <button key={template.id} type="button" className="rounded-lg border border-[#e8dfd2] bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 hover:border-[#d8b149] hover:bg-[#fffaf0]" onClick={() => addEditDivision(template.name)}>
                  {template.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-black uppercase text-zinc-600">Atau Buat Custom</p>
            <div className="flex items-center gap-2">
              <input
                value={newDivisionName}
                onChange={(input) => setNewDivisionName(input.target.value)}
                placeholder="Nama Divisi..."
                className="h-10 w-full rounded-lg border border-[#e8dfd2] px-3 text-sm font-semibold outline-none focus:border-[#d8b149]"
                onKeyDown={(keyEvent) => {
                  if (keyEvent.key === 'Enter') {
                    keyEvent.preventDefault()
                    addEditDivision(newDivisionName)
                  }
                }}
              />
              <button type="button" className="button-primary h-10 px-4" onClick={() => addEditDivision(newDivisionName)}>Tambah</button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal open={memberModalOpen !== null} title={`Anggota: ${editDivisions.find((division) => division.id === memberModalOpen)?.name || ''}`} onClose={() => { setMemberModalOpen(null); setMemberSearch('') }}>
        <div className="space-y-4">
          <label className="relative block">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input value={memberSearch} onChange={(input) => setMemberSearch(input.target.value)} placeholder="Cari anggota..." className="h-10 w-full rounded-lg border border-[#e8dfd2] pl-9 pr-3 text-sm font-semibold outline-none focus:border-[#d8b149]" />
          </label>

          <div className="max-h-[300px] overflow-y-auto rounded-xl border border-[#e8dfd2] bg-white">
            {filteredMembersForPicker.map((member) => {
              const currentDivision = editDivisions.find((division) => division.id === memberModalOpen)
              const isSelected = currentDivision?.members.includes(member.id)
              const otherDivision = editDivisions.find((division) => division.id !== memberModalOpen && division.members.includes(member.id))
              const isDisabled = Boolean(otherDivision)

              return (
                <label key={member.id} className={`flex items-center gap-3 border-b border-[#eee7dd] px-4 py-3 last:border-0 ${isDisabled ? 'opacity-50' : 'cursor-pointer hover:bg-[#fffaf0]'}`}>
                  <div className="relative flex h-5 w-5 shrink-0 items-center justify-center">
                    <input type="checkbox" checked={Boolean(isSelected)} disabled={isDisabled} onChange={() => toggleMemberInDivision(memberModalOpen, member.id)} className="peer h-5 w-5 appearance-none rounded border border-[#d1c5b4] bg-white checked:border-[#f6bd16] checked:bg-[#f6bd16] disabled:opacity-50" />
                    <Check size={12} strokeWidth={4} className="pointer-events-none absolute text-white opacity-0 peer-checked:opacity-100" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-zinc-800">{member.name}</p>
                    <p className="truncate text-[11px] font-semibold text-zinc-500">{member.nim}</p>
                  </div>
                  {isDisabled && <span className="rounded bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-500">Di {otherDivision.name}</span>}
                </label>
              )
            })}
            {filteredMembersForPicker.length === 0 && (
              <div className="p-4 text-center text-xs font-medium text-zinc-500">Tidak ada anggota ditemukan.</div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button type="button" className="button-dark" onClick={() => { setMemberModalOpen(null); setMemberSearch('') }}>Selesai</button>
          </div>
        </div>
      </Modal>

      <Modal open={meetingEditOpen} title="Edit Pertemuan" onClose={() => setMeetingEditOpen(false)}>
        <form className="grid gap-4" onSubmit={handleUpdateMeeting}>
          {meetingError && <div className="rounded-lg bg-red-50 p-3 text-xs font-bold text-red-600">{meetingError}</div>}
          <label className="space-y-2">
            <span className="text-xs font-black uppercase text-zinc-600">Judul Pertemuan</span>
            <input required value={meetingForm.title} onChange={(input) => setMeetingForm({ ...meetingForm, title: input.target.value })} className="h-11 w-full rounded-lg border border-[#e8dfd2] px-4 text-sm font-semibold outline-none focus:border-[#d8b149]" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-black uppercase text-zinc-600">Tanggal</span>
              <input required type="date" value={meetingForm.meetingDate} onChange={(input) => setMeetingForm({ ...meetingForm, meetingDate: input.target.value })} className="h-11 w-full rounded-lg border border-[#e8dfd2] px-4 text-sm font-semibold outline-none focus:border-[#d8b149]" />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-black uppercase text-zinc-600">Status</span>
              <SelectMenu value={meetingForm.status} options={meetingStatusOptions} onChange={(value) => setMeetingForm({ ...meetingForm, status: value })} buttonClassName="h-11 rounded-lg text-sm" />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="space-y-2">
              <span className="text-xs font-black uppercase text-zinc-600">Jam Mulai</span>
              <input required type="time" value={meetingForm.startTime} onChange={(input) => setMeetingForm({ ...meetingForm, startTime: input.target.value })} className="h-11 w-full rounded-lg border border-[#e8dfd2] px-4 text-sm font-semibold outline-none focus:border-[#d8b149]" />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-black uppercase text-zinc-600">Jam Selesai</span>
              <input required type="time" value={meetingForm.endTime} onChange={(input) => setMeetingForm({ ...meetingForm, endTime: input.target.value })} className="h-11 w-full rounded-lg border border-[#e8dfd2] px-4 text-sm font-semibold outline-none focus:border-[#d8b149]" />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-black uppercase text-zinc-600">Toleransi</span>
              <input required type="number" min="0" value={meetingForm.lateTolerance} onChange={(input) => setMeetingForm({ ...meetingForm, lateTolerance: input.target.value })} className="h-11 w-full rounded-lg border border-[#e8dfd2] px-4 text-sm font-semibold outline-none focus:border-[#d8b149]" />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-black uppercase text-zinc-600">Mode Pertemuan</span>
              <select value={meetingForm.attendanceMode} onChange={(input) => setMeetingForm({ ...meetingForm, attendanceMode: input.target.value })} className="h-11 w-full rounded-lg border border-[#e8dfd2] bg-white px-4 text-sm font-semibold outline-none focus:border-[#d8b149]"><option value="offline">Offline</option><option value="online">Online</option></select>
            </label>
            <label className="space-y-2">
              <span className="text-xs font-black uppercase text-zinc-600">{meetingForm.attendanceMode === 'online' ? 'Link Zoom / Meet' : 'Lokasi Rapat'}</span>
              <input required type={meetingForm.attendanceMode === 'online' ? 'url' : 'text'} value={meetingForm.place} onChange={(input) => setMeetingForm({ ...meetingForm, place: input.target.value })} className="h-11 w-full rounded-lg border border-[#e8dfd2] px-4 text-sm font-semibold outline-none focus:border-[#d8b149]" />
            </label>
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" className="button-soft" onClick={() => setMeetingEditOpen(false)} disabled={meetingSaving}>Batal</button>
            <button type="submit" className="button-primary" disabled={meetingSaving}>{meetingSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
          </div>
        </form>
      </Modal>
    </>
  )
}
