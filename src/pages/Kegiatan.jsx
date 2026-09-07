import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Calendar, Check, Clock, MapPin, Plus, Search, Trash2, Users, X } from 'lucide-react'
import Swal from 'sweetalert2'
import Modal from '../components/Modal'
import SelectMenu from '../components/SelectMenu'
import { PageSkeleton } from '../components/Skeleton'
import TablePagination from '../components/TablePagination'
import { eventsApi, membersApi, divisionTemplatesApi } from '../lib/api'
import useSkeletonLoading from '../hooks/useSkeletonLoading'

const filters = ['Semua', 'Aktif', 'Akan Datang', 'Selesai']
function EventCard({ event, onOpen }) {
  const inactive = event.status === 'Selesai'

  return (
    <article className="surface card-motion relative min-h-[250px] cursor-pointer overflow-hidden p-5" onClick={() => onOpen(event)}>
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-black leading-tight text-zinc-800">{event.title}</h2>
          <p className="mt-2 inline-flex rounded-full bg-[#f5efe3] px-2.5 py-1 text-[10px] font-black text-[#8b6800]">{event.category}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-[10px] font-black ${inactive ? 'bg-zinc-100 text-zinc-500' : 'bg-[#d1a100] text-zinc-950'}`}>
          {event.status}
        </span>
      </div>

      <div className="relative mt-5 space-y-3 text-xs font-semibold text-zinc-600">
        <p className="flex items-center gap-2"><Calendar size={15} className="text-[#9f7500]" />{event.date}</p>
        <p className="flex items-center gap-2"><Clock size={15} className="text-[#9f7500]" />{event.time}</p>
        <p className="flex items-center gap-2"><MapPin size={15} className="text-[#9f7500]" />{event.place}</p>
      </div>

      <div className="relative mt-6 flex items-end justify-between border-t border-[#eee7dd] pt-4">
        <div>
          <p className="text-xs font-semibold text-zinc-500">{event.label}</p>
          <p className="mt-1 text-base font-semibold text-zinc-700">{event.value || `${event.participantCount} Peserta`}</p>
        </div>
        <button className="button-soft h-9 shrink-0 px-4" onClick={(click) => {
          click.stopPropagation()
          onOpen(event)
        }} aria-label={`Buka ${event.title}`}>
          Detail
          <ArrowRight size={15} />
        </button>
      </div>
    </article>
  )
}

export default function Kegiatan() {
  const loading = useSkeletonLoading()
  const navigate = useNavigate()
  
  // App State
  const [events, setEvents] = useState([])
  const [members, setMembers] = useState([])
  const [templates, setTemplates] = useState([])
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('Semua')
  
  // Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    title: '',
    category: 'Rapat',
    status: 'Aktif',
    eventDate: '',
    startTime: '',
    endTime: '',
    attendanceMode: 'offline',
    place: '',
    lateTolerance: 15,
    participantLimit: 0,
  })
  
  // Event Divisions State
  // [{ id: 'temp-1', name: 'Acara', members: [1, 2] }]
  const [eventDivisions, setEventDivisions] = useState([])
  
  // Modal sub-states
  const [divisionModalOpen, setDivisionModalOpen] = useState(false)
  const [newDivisionName, setNewDivisionName] = useState('')
  const [memberModalOpen, setMemberModalOpen] = useState(null) // holds division id being edited
  const [memberSearch, setMemberSearch] = useState('')
  const [memberCohort, setMemberCohort] = useState('Semua Angkatan')
  const [memberPage, setMemberPage] = useState(1)
  const memberPageSize = 8

  useEffect(() => {
    let cancelled = false
    setFetching(true)
    Promise.all([
      eventsApi.list(),
      membersApi.list(),
      divisionTemplatesApi.list()
    ])
      .then(([eventsData, membersData, templatesData]) => {
        if (!cancelled) {
          setEvents(eventsData.events || [])
          setMembers(membersData.members || [])
          setTemplates(templatesData.divisionTemplates || [])
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setFetching(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const filteredEvents = useMemo(() =>
    events.filter((event) => {
      const matchesQuery = `${event.title} ${event.place} ${event.category}`.toLowerCase().includes(query.toLowerCase())
      const matchesFilter = activeFilter === 'Semua' || event.status === activeFilter
      return matchesQuery && matchesFilter
    }),
  [events, query, activeFilter])

  const totalAssignedMembers = useMemo(() => 
    eventDivisions.reduce((sum, div) => sum + div.members.length, 0),
  [eventDivisions])

  const isLimitReached = totalAssignedMembers >= Number(form.participantLimit)

  const memberCohortOptions = useMemo(() => {
    const values = members.map((member) => member.angkatanProbumsil).filter((value) => value && value !== '-')
    return ['Semua Angkatan', ...Array.from(new Set(values)).sort()]
  }, [members])

  // Derived members data for picker
  const filteredMembersForPicker = useMemo(() => {
    let list = members
    if (memberSearch) {
      const term = memberSearch.toLowerCase()
      list = list.filter(m => `${m.name} ${m.nim} ${m.angkatanProbumsil || ''}`.toLowerCase().includes(term))
    }
    if (memberCohort !== 'Semua Angkatan') {
      list = list.filter((member) => member.angkatanProbumsil === memberCohort)
    }
    return list
  }, [members, memberSearch, memberCohort])

  useEffect(() => {
    setMemberPage(1)
  }, [memberSearch, memberCohort, memberModalOpen])

  const paginatedMembersForPicker = useMemo(
    () => filteredMembersForPicker.slice((memberPage - 1) * memberPageSize, memberPage * memberPageSize),
    [filteredMembersForPicker, memberPage],
  )

  // Helpers for Event Divisions
  function addDivision(name) {
    if (!name.trim()) return;
    setEventDivisions(prev => [...prev, { id: `div-${Date.now()}`, name: name.trim(), members: [] }])
    setDivisionModalOpen(false)
    setNewDivisionName('')
  }

  function removeDivision(divId) {
    setEventDivisions(prev => prev.filter(d => d.id !== divId))
  }

  async function removeTemplate(template, event) {
    event.stopPropagation()
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Hapus Template?',
      text: `Template divisi "${template.name}" akan dihapus.`,
      showCancelButton: true,
      confirmButtonText: 'Hapus',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#a1a1aa',
    })
    if (!result.isConfirmed) return

    try {
      const data = await divisionTemplatesApi.remove(template.id)
      setTemplates(data.divisionTemplates || [])
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: error.message, confirmButtonColor: '#f6bd16' })
    }
  }

  function toggleMemberInDivision(divId, memberId) {
    // Check if member is in another division
    const existingDiv = eventDivisions.find(d => d.id !== divId && d.members.includes(memberId))
    if (existingDiv) {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: `Anggota ini sudah berada di Divisi ${existingDiv.name}.`,
        confirmButtonColor: '#f6bd16'
      })
      return
    }

    setEventDivisions(prev => prev.map(div => {
      if (div.id !== divId) return div
      const isSelected = div.members.includes(memberId)
      if (isSelected) {
        return { ...div, members: div.members.filter(id => id !== memberId) }
      } else {
        if (totalAssignedMembers >= Number(form.participantLimit)) {
          alert(`Batas peserta (${form.participantLimit} orang) sudah tercapai.`)
          return div
        }
        return { ...div, members: [...div.members, memberId] }
      }
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!form.title.trim()) return
    
    if (Number(form.participantLimit) <= 0) {
      setError('Jumlah peserta harus lebih dari 0.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      // Map eventDivisions to the format backend expects
      const payloadDivisions = eventDivisions.map(div => ({
        name: div.name,
        members: div.members
      })).filter(div => div.members.length > 0) // only send divisions that have members

      const data = await eventsApi.create({
        ...form,
        title: form.title.trim(),
        eventDate: form.eventDate || new Date().toISOString().slice(0, 10),
        startTime: form.startTime || '09:00',
        endTime: form.endTime || '12:00',
        lateTolerance: Number(form.lateTolerance) || 0,
        participantLimit: Number(form.participantLimit) || 0,
        divisions: payloadDivisions,
      })

      setEvents((current) => [data.event, ...current])
      resetForm()
      setModalOpen(false)
      navigate(`/kegiatan/${data.event.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  function resetForm() {
    setForm({ title: '', category: 'Rapat', status: 'Aktif', eventDate: '', startTime: '', endTime: '', attendanceMode: 'offline', place: '', lateTolerance: 15, participantLimit: 0 })
    setEventDivisions([])
    setError('')
  }

  if (loading || fetching) return <PageSkeleton cards={4} />

  return (
    <div className="page-shell space-y-6">
      <section className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <h1 className="text-[24px] font-black text-zinc-900">Manajemen Kegiatan</h1>
          <p className="mt-1 text-sm font-medium text-zinc-600">Kelola dan pantau seluruh kegiatan PROBUMSIL.</p>
        </div>
        <button className="button-primary w-full sm:w-auto" onClick={() => { resetForm(); setModalOpen(true) }}>
          <Plus size={15} />
          Buat Kegiatan Baru
        </button>
      </section>

      <section className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <label className="relative block w-full sm:max-w-[336px]">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari kegiatan..."
            className="h-10 w-full rounded-full border border-[#e8dfd2] bg-white pl-11 pr-4 text-xs font-semibold outline-none placeholder:text-zinc-400 focus:border-[#d8b149]"
          />
        </label>
        <div className="flex w-full gap-2 overflow-x-auto pb-1 sm:w-auto sm:flex-wrap sm:overflow-visible sm:pb-0">
          {filters.map((filter) => (
            <button
              key={filter}
              className={activeFilter === filter ? 'button-dark h-10 shrink-0 px-5' : 'button-soft h-10 shrink-0 px-5'}
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>
      </section>

      {error && !modalOpen && <div className="surface border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">{error}</div>}

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filteredEvents.map((event) => (
          <EventCard key={event.id} event={{ ...event, label: event.status === 'Selesai' ? 'Total Hadir' : 'Target Peserta' }} onOpen={(item) => navigate(`/kegiatan/${item.id}`)} />
        ))}
      </section>

      {filteredEvents.length === 0 && (
        <div className="surface p-8 text-center text-sm font-semibold text-zinc-500">Tidak ada kegiatan sesuai filter.</div>
      )}

      {/* Main Form Modal */}
      <Modal open={modalOpen} title="Buat Kegiatan Baru" description="Penyusunan kegiatan dan pembagian divisi." onClose={() => setModalOpen(false)}>
        <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600">{error}</div>}
          
          <div className="space-y-4">
            <h3 className="text-sm font-black text-zinc-800">1. Informasi Kegiatan</h3>
            <label className="block space-y-2">
              <span className="text-xs font-black uppercase text-zinc-600">Nama Kegiatan</span>
              <input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="h-11 w-full rounded-lg border border-[#e8dfd2] px-4 text-sm font-semibold outline-none focus:border-[#d8b149]" />
            </label>
            <div className="grid gap-4 sm:grid-cols-1">
              <label className="block space-y-2">
                <span className="text-xs font-black uppercase text-zinc-600">Status Awal</span>
                <SelectMenu value={form.status} options={filters.slice(1)} onChange={(value) => setForm({ ...form, status: value })} buttonClassName="h-11 rounded-lg text-sm" />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block space-y-2">
                <span className="text-xs font-black uppercase text-zinc-600">Tanggal</span>
                <input required type="date" value={form.eventDate} onChange={(event) => setForm({ ...form, eventDate: event.target.value })} className="h-11 w-full rounded-lg border border-[#e8dfd2] px-4 text-sm font-semibold outline-none focus:border-[#d8b149]" />
              </label>
              <label className="block space-y-2">
                <span className="text-xs font-black uppercase text-zinc-600">Jam Mulai</span>
                <input required type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} className="h-11 w-full rounded-lg border border-[#e8dfd2] px-4 text-sm font-semibold outline-none focus:border-[#d8b149]" />
              </label>
              <label className="block space-y-2">
                <span className="text-xs font-black uppercase text-zinc-600">Jam Selesai</span>
                <input required type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} className="h-11 w-full rounded-lg border border-[#e8dfd2] px-4 text-sm font-semibold outline-none focus:border-[#d8b149]" />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-xs font-black uppercase text-zinc-600">Mode Pertemuan</span>
                <select value={form.attendanceMode} onChange={(event) => setForm({ ...form, attendanceMode: event.target.value })} className="h-11 w-full rounded-lg border border-[#e8dfd2] bg-white px-4 text-sm font-semibold outline-none focus:border-[#d8b149]"><option value="offline">Offline</option><option value="online">Online</option></select>
              </label>
              <label className="block space-y-2">
                <span className="text-xs font-black uppercase text-zinc-600">{form.attendanceMode === 'online' ? 'Link Zoom / Meet' : 'Lokasi Rapat'}</span>
                <input required type={form.attendanceMode === 'online' ? 'url' : 'text'} value={form.place} onChange={(event) => setForm({ ...form, place: event.target.value })} placeholder={form.attendanceMode === 'online' ? 'https://zoom.us/j/...' : 'Contoh: Ruang Rapat Utama'} className="h-11 w-full rounded-lg border border-[#e8dfd2] px-4 text-sm font-semibold outline-none focus:border-[#d8b149]" />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-xs font-black uppercase text-zinc-600">Kapasitas / Target Peserta</span>
                <input required type="number" min="1" value={form.participantLimit} onChange={(event) => setForm({ ...form, participantLimit: event.target.value })} className="h-11 w-full rounded-lg border border-[#e8dfd2] px-4 text-sm font-semibold outline-none focus:border-[#d8b149]" />
              </label>
              <label className="block space-y-2">
                <span className="text-xs font-black uppercase text-zinc-600">Toleransi Telat (menit)</span>
                <input required type="number" min="0" value={form.lateTolerance} onChange={(event) => setForm({ ...form, lateTolerance: event.target.value })} className="h-11 w-full rounded-lg border border-[#e8dfd2] px-4 text-sm font-semibold outline-none focus:border-[#d8b149]" />
              </label>
            </div>
          </div>
          
          {Number(form.participantLimit) > 0 && (
            <div className="space-y-4 pt-4 border-t border-[#eee7dd]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-zinc-800">2. Susunan Kepanitiaan</h3>
                  <p className={`text-xs font-semibold mt-1 ${isLimitReached ? 'text-green-600' : 'text-zinc-500'}`}>
                    Terpilih: {totalAssignedMembers} dari {form.participantLimit} kuota anggota
                  </p>
                </div>
                <button type="button" className="button-soft h-8 px-3 text-xs" onClick={() => setDivisionModalOpen(true)}>
                  <Plus size={13} /> Tambah Divisi
                </button>
              </div>

              {eventDivisions.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[#d1c5b4] bg-[#fbf9f6] p-6 text-center text-sm font-semibold text-zinc-500">
                  Belum ada divisi kegiatan. Tambahkan divisi terlebih dahulu.
                </div>
              ) : (
                <div className="space-y-3">
                  {eventDivisions.map((div) => (
                    <div key={div.id} className="rounded-xl border border-[#e8dfd2] bg-white p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="text-sm font-bold text-zinc-800">{div.name}</h4>
                          <p className="text-[11px] font-semibold text-zinc-500">{div.members.length} anggota</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="button" className="button-soft h-7 px-3 text-[11px]" onClick={() => setMemberModalOpen(div.id)}>
                            <Users size={12} /> Kelola Anggota
                          </button>
                          <button type="button" className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100" onClick={() => removeDivision(div.id)}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      
                      {div.members.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {div.members.map(mid => {
                            const member = members.find(m => m.id === mid)
                            if (!member) return null
                            return (
                              <span key={mid} className="inline-flex items-center rounded bg-[#f2eee6] px-2 py-1 text-xs font-semibold text-zinc-700">
                                {member.name}
                              </span>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-xs font-medium text-zinc-400 italic">Belum ada anggota.</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-4 border-t border-[#eee7dd]">
            <button type="button" className="button-soft w-full sm:w-auto" onClick={() => setModalOpen(false)}>Batal</button>
            <button type="submit" className="button-primary w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto" disabled={submitting}>
              {submitting ? 'Menyimpan...' : 'Simpan Kegiatan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Select Division Template Modal */}
      <Modal open={divisionModalOpen} title="Tambah Divisi Kegiatan" onClose={() => setDivisionModalOpen(false)}>
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-xs font-black uppercase text-zinc-600">Daftar Divisi Tersimpan</p>
            <div className="flex flex-wrap gap-2">
              {templates.map(t => (
                <div key={t.id} className="inline-flex overflow-hidden rounded-lg border border-[#e8dfd2] bg-white text-xs font-bold text-zinc-700">
                  <button type="button" className="px-3 py-1.5 hover:bg-[#fffaf0]" onClick={() => addDivision(t.name)}>
                    {t.name}
                  </button>
                  <button type="button" className="flex w-8 items-center justify-center border-l border-[#e8dfd2] text-zinc-400 hover:bg-red-50 hover:text-red-600" onClick={(event) => removeTemplate(t, event)} aria-label={`Hapus template ${t.name}`} title="Hapus template">
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-black uppercase text-zinc-600">Atau Buat Custom</p>
            <div className="flex items-center gap-2">
              <input 
                value={newDivisionName} 
                onChange={e => setNewDivisionName(e.target.value)} 
                placeholder="Nama Divisi..." 
                className="h-10 w-full rounded-lg border border-[#e8dfd2] px-3 text-sm font-semibold outline-none focus:border-[#d8b149]" 
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDivision(newDivisionName) } }}
              />
              <button type="button" className="button-primary h-10 px-4" onClick={() => addDivision(newDivisionName)}>Tambah</button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Manage Members in Division Modal */}
      <Modal open={memberModalOpen !== null} title={`Anggota: ${eventDivisions.find(d => d.id === memberModalOpen)?.name}`} onClose={() => { setMemberModalOpen(null); setMemberSearch('') }}>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
            <label className="relative block">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input 
                value={memberSearch} 
                onChange={e => setMemberSearch(e.target.value)} 
                placeholder="Cari anggota..." 
                className="h-10 w-full rounded-lg border border-[#e8dfd2] pl-9 pr-3 text-sm font-semibold outline-none focus:border-[#d8b149]" 
              />
            </label>
            <SelectMenu value={memberCohort} options={memberCohortOptions} onChange={setMemberCohort} buttonClassName="h-10 rounded-lg" />
          </div>

          <div className="rounded-xl border border-[#e8dfd2] bg-white">
            {paginatedMembersForPicker.map(member => {
              const currentDiv = eventDivisions.find(d => d.id === memberModalOpen)
              const isSelected = currentDiv?.members.includes(member.id)
              
              // Find if member is in another division
              const otherDiv = eventDivisions.find(d => d.id !== memberModalOpen && d.members.includes(member.id))
              const isDisabled = !!otherDiv

              return (
                <label key={member.id} className={`flex items-center gap-3 border-b border-[#eee7dd] px-4 py-3 last:border-0 ${isDisabled ? 'opacity-50' : 'cursor-pointer hover:bg-[#fffaf0]'}`}>
                  <div className="relative flex h-5 w-5 shrink-0 items-center justify-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isDisabled}
                      onChange={() => toggleMemberInDivision(memberModalOpen, member.id)}
                      className="peer h-5 w-5 appearance-none rounded border border-[#d1c5b4] bg-white checked:border-[#f6bd16] checked:bg-[#f6bd16] disabled:opacity-50"
                    />
                    <Check size={12} strokeWidth={4} className="pointer-events-none absolute text-white opacity-0 peer-checked:opacity-100" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-zinc-800 truncate">{member.name}</p>
                    <p className="text-[11px] font-semibold text-zinc-500 truncate">NIM-P: {member.nim} • {member.field_name || member.field}</p>
                  </div>
                  {isDisabled && <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded">Di {otherDiv.name}</span>}
                </label>
              )
            })}
            {filteredMembersForPicker.length === 0 && (
              <div className="p-4 text-center text-xs font-medium text-zinc-500">Tidak ada anggota ditemukan.</div>
            )}
            <TablePagination page={memberPage} total={filteredMembersForPicker.length} pageSize={memberPageSize} onPageChange={setMemberPage} itemLabel="anggota" />
          </div>
          
          <div className="flex justify-end pt-2">
            <button type="button" className="button-dark" onClick={() => { setMemberModalOpen(null); setMemberSearch('') }}>Selesai</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
