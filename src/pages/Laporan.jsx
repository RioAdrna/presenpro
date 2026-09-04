import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronRight, Download, Filter, UserRoundCheck, UserRoundX, Users } from 'lucide-react'
import Swal from 'sweetalert2'
import { PageSkeleton } from '../components/Skeleton'
import useSkeletonLoading from '../hooks/useSkeletonLoading'
import { eventsApi, reportsApi } from '../lib/api'

function MetricCard({ metric }) {
  const Icon = metric.icon
  const valueColor = metric.tone === 'yellow' ? 'text-[#b58b00]' : 'text-zinc-900'
  const toneColor = metric.tone === 'red' ? 'text-red-500' : 'text-emerald-600'

  return (
    <article className="surface card-motion rounded-none p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-zinc-700">{metric.label}</p>
          <p className={`mt-5 text-[32px] font-black leading-none ${valueColor}`}>{metric.value}</p>
          <p className={`mt-3 text-[11px] font-bold ${metric.tone === 'yellow' ? 'text-zinc-500' : toneColor}`}>{metric.note}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fff4cf] text-[#9f7500]">
          <Icon size={17} />
        </div>
      </div>
    </article>
  )
}

function PercentBadge({ percentage }) {
  const color =
    percentage >= 95
      ? 'bg-emerald-100 text-emerald-700'
      : percentage >= 85
        ? 'bg-[#ffc400] text-zinc-950'
        : 'bg-zinc-200 text-zinc-600'
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${color}`}>{percentage}%</span>
}

export default function Laporan() {
  const loading = useSkeletonLoading()

  // Data from API
  const [events, setEvents] = useState([])
  const [loadingEvents, setLoadingEvents] = useState(true)

  // Filter state
  const [selectedEventSlug, setSelectedEventSlug] = useState('all')
  const [selectedMeetingId, setSelectedMeetingId] = useState('all')

  // Report data
  const [rows, setRows] = useState([])
  const [summary, setSummary] = useState({ totalPresent: 0, totalLate: 0, totalPermit: 0, totalAbsent: 0, avgPercentage: 0, memberCount: 0 })
  const [loadingReport, setLoadingReport] = useState(false)

  // Load events on mount
  useEffect(() => {
    let cancelled = false
    setLoadingEvents(true)
    eventsApi.list()
      .then(data => {
        if (!cancelled) setEvents(data.events || [])
      })
      .catch(() => {
        if (!cancelled) setEvents([])
      })
      .finally(() => {
        if (!cancelled) setLoadingEvents(false)
      })
    return () => { cancelled = true }
  }, [])

  // Get meetings for the selected event
  const selectedEvent = useMemo(
    () => events.find(e => e.id === selectedEventSlug),
    [events, selectedEventSlug]
  )
  const meetings = useMemo(() => selectedEvent?.meetings || [], [selectedEvent])

  // Reset meeting filter when event changes
  useEffect(() => {
    setSelectedMeetingId('all')
  }, [selectedEventSlug])

  // Fetch report
  const fetchReport = useCallback(async () => {
    setLoadingReport(true)
    try {
      const params = {}
      if (selectedEventSlug !== 'all') params.event = selectedEventSlug
      if (selectedMeetingId !== 'all') params.meeting = selectedMeetingId
      const data = await reportsApi.attendance(params)
      setRows(data.rows || [])
      setSummary(data.summary || { totalPresent: 0, totalLate: 0, totalPermit: 0, totalAbsent: 0, avgPercentage: 0, memberCount: 0 })
    } catch {
      setRows([])
      setSummary({ totalPresent: 0, totalLate: 0, totalPermit: 0, totalAbsent: 0, avgPercentage: 0, memberCount: 0 })
    } finally {
      setLoadingReport(false)
    }
  }, [selectedEventSlug, selectedMeetingId])

  // Auto-fetch on mount and when filter changes
  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const metrics = [
    { label: 'Hadir Tepat Waktu', value: summary.totalPresent.toLocaleString('id-ID'), note: `${summary.memberCount} anggota ditampilkan`, icon: UserRoundCheck, tone: 'green' },
    { label: 'Total Telat', value: summary.totalLate.toLocaleString('id-ID'), note: 'melewati batas toleransi', icon: UserRoundX, tone: 'yellow' },
    { label: 'Total Izin/Sakit', value: summary.totalPermit, note: 'sesuai filter aktif', icon: Users, tone: summary.totalPermit > 3 ? 'red' : 'green' },
    { label: 'Total Alpa', value: summary.totalAbsent, note: 'sesuai filter aktif', icon: UserRoundX, tone: summary.totalAbsent > 1 ? 'red' : 'green' },
  ]

  function reportTitle() {
    const meeting = selectedMeetingId !== 'all' ? meetings.find(m => String(m.id) === selectedMeetingId)?.title : ''
    return [selectedEvent?.title || 'Semua Kegiatan', meeting].filter(Boolean).join(' - ')
  }

  function safeFileName(value) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'laporan'
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;')
  }

  function csvCell(value) {
    return `"${String(value ?? '').replaceAll('"', '""')}"`
  }

  function exportReport(type) {
    if (rows.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Tidak ada data', text: 'Tidak ada data laporan yang bisa diekspor.', confirmButtonColor: '#f6bd16' })
      return
    }

    const title = reportTitle()
    const fileName = `presenpro-${safeFileName(title)}`

    if (type === 'Excel') {
      const header = ['NIM-P', 'Nama', 'Hadir Tepat Waktu', 'Telat', 'Izin/Sakit', 'Alpa', 'Persentase']
      const body = rows.map(row => [row.nim, row.name, row.present, row.late, row.permit, row.absent, `${row.percentage}%`])
      const csv = [header, ...body].map(line => line.map(csvCell).join(',')).join('\r\n')
      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${fileName}.csv`
      link.click()
      URL.revokeObjectURL(url)
      return
    }

    const tableRows = rows.map(row => `
      <tr>
        <td>${escapeHtml(row.nim)}</td>
        <td>${escapeHtml(row.name)}</td>
        <td>${escapeHtml(row.present)}</td>
        <td>${escapeHtml(row.late)}</td>
        <td>${escapeHtml(row.permit)}</td>
        <td>${escapeHtml(row.absent)}</td>
        <td>${escapeHtml(row.percentage)}%</td>
      </tr>
    `).join('')

    const printWindow = window.open('', '_blank', 'noopener,noreferrer')
    if (!printWindow) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: 'Popup browser diblokir. Izinkan popup untuk export PDF.', confirmButtonColor: '#f6bd16' })
      return
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>${escapeHtml(title)}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #18181b; padding: 24px; }
            h1 { margin: 0 0 6px; font-size: 22px; }
            p { margin: 0 0 18px; color: #52525b; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #d4d4d8; padding: 8px; text-align: left; }
            th { background: #f4f4f5; }
            .summary { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin: 18px 0; }
            .summary div { border: 1px solid #d4d4d8; padding: 10px; }
            .summary strong { display: block; font-size: 16px; }
          </style>
        </head>
        <body>
          <h1>Laporan Kehadiran PresenPRO</h1>
          <p>${escapeHtml(title)}</p>
          <div class="summary">
            <div><span>Total Hadir</span><strong>${summary.totalPresent}</strong></div>
            <div><span>Total Telat</span><strong>${summary.totalLate}</strong></div>
            <div><span>Rata-rata</span><strong>${summary.avgPercentage}%</strong></div>
            <div><span>Izin/Sakit</span><strong>${summary.totalPermit}</strong></div>
            <div><span>Alpa</span><strong>${summary.totalAbsent}</strong></div>
          </div>
          <table>
            <thead>
              <tr>
                <th>NIM-P</th><th>Nama</th><th>Hadir Tepat Waktu</th><th>Telat</th><th>Izin/Sakit</th><th>Alpa</th><th>Persentase</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  if (loading) return <PageSkeleton table />

  return (
    <div className="page-shell space-y-6">
      {/* ── Filter Section ── */}
      <section className="surface overflow-hidden">
        <div className="border-b border-[#eee7dd] px-5 py-4">
          <h2 className="flex items-center gap-2 text-sm font-black text-zinc-800">
            <Filter size={15} className="text-[#9f7500]" />
            Filter Laporan
          </h2>
        </div>

        <div className="p-4">
          {/* Event Selection */}
          <p className="mb-2 text-[11px] font-black uppercase text-zinc-500">Pilih Kegiatan</p>
          {loadingEvents ? (
            <div className="rounded-xl border border-[#e8dfd2] bg-[#fbfaf8] p-6 text-center text-xs font-bold text-zinc-400">Memuat kegiatan...</div>
          ) : events.length === 0 ? (
            <div className="rounded-xl border border-[#e8dfd2] bg-[#fbfaf8] p-6 text-center text-xs font-bold text-zinc-400">Belum ada kegiatan.</div>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {/* All events option */}
              <button
                type="button"
                onClick={() => setSelectedEventSlug('all')}
                className={`group relative flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                  selectedEventSlug === 'all'
                    ? 'border-[#f6bd16] bg-[#fffbeb] shadow-[0_0_0_2px_#f6bd16]'
                    : 'border-[#e8dfd2] bg-white hover:border-[#d8b149] hover:bg-[#fffaf0]'
                }`}
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                  selectedEventSlug === 'all' ? 'bg-[#f6bd16] text-white' : 'bg-[#f2efec] text-zinc-500'
                }`}>
                  <Users size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-zinc-800">Semua Kegiatan</p>
                  <p className="text-[10px] font-semibold text-zinc-500">Tampilkan seluruh data</p>
                </div>
                {selectedEventSlug === 'all' && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#f6bd16] text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                )}
              </button>

              {events.map(ev => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => setSelectedEventSlug(ev.id)}
                  className={`group relative flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                    selectedEventSlug === ev.id
                      ? 'border-[#f6bd16] bg-[#fffbeb] shadow-[0_0_0_2px_#f6bd16]'
                      : 'border-[#e8dfd2] bg-white hover:border-[#d8b149] hover:bg-[#fffaf0]'
                  }`}
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                    selectedEventSlug === ev.id ? 'bg-[#f6bd16] text-white' : 'bg-[#f2efec] text-zinc-500'
                  }`}>
                    {ev.title.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-zinc-800">{ev.title}</p>
                    <p className="text-[10px] font-semibold text-zinc-500">{ev.date} • {ev.participantCount} peserta</p>
                  </div>
                  {selectedEventSlug === ev.id ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#f6bd16] text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    </span>
                  ) : (
                    <ChevronRight size={16} className="shrink-0 text-zinc-400 transition group-hover:text-zinc-600" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Meeting Sub-filter — only shows when a specific event is selected */}
          {selectedEventSlug !== 'all' && meetings.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-[11px] font-black uppercase text-zinc-500">Pilih Pertemuan</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {/* All meetings */}
                <button
                  type="button"
                  onClick={() => setSelectedMeetingId('all')}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                    selectedMeetingId === 'all'
                      ? 'border-[#10b981] bg-emerald-50 shadow-[0_0_0_2px_#10b981]'
                      : 'border-[#e8dfd2] bg-white hover:border-emerald-300 hover:bg-emerald-50/50'
                  }`}
                >
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                    selectedMeetingId === 'all' ? 'bg-emerald-500 text-white' : 'bg-[#f2efec] text-zinc-500'
                  }`}>
                    <Users size={12} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-zinc-800">Semua Pertemuan</p>
                  </div>
                  {selectedMeetingId === 'all' && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    </span>
                  )}
                </button>

                {meetings.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMeetingId(String(m.id))}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                      selectedMeetingId === String(m.id)
                        ? 'border-[#10b981] bg-emerald-50 shadow-[0_0_0_2px_#10b981]'
                        : 'border-[#e8dfd2] bg-white hover:border-emerald-300 hover:bg-emerald-50/50'
                    }`}
                  >
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                      selectedMeetingId === String(m.id) ? 'bg-emerald-500 text-white' : 'bg-[#f2efec] text-zinc-500'
                    }`}>
                      {m.title.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-zinc-800">{m.title}</p>
                      <p className="text-[10px] font-semibold text-zinc-500">{m.date} • {m.time}</p>
                    </div>
                    {selectedMeetingId === String(m.id) && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedEventSlug !== 'all' && meetings.length === 0 && (
            <div className="mt-5">
              <p className="mb-2 text-[11px] font-black uppercase text-zinc-500">Pertemuan</p>
              <div className="rounded-xl border border-[#e8dfd2] bg-[#fbfaf8] p-4 text-center text-xs font-bold text-zinc-400">
                Kegiatan ini belum memiliki pertemuan.
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Metrics ── */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(metric => <MetricCard key={metric.label} metric={metric} />)}
      </section>

      {/* ── Table ── */}
      <section className="surface p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-zinc-900">Detail Laporan</h2>
            {selectedEvent && (
              <p className="mt-1 text-xs font-bold text-[#9f7500]">
                {selectedEvent.title}
                {selectedMeetingId !== 'all' && ` › ${meetings.find(m => String(m.id) === selectedMeetingId)?.title || ''}`}
              </p>
            )}
          </div>
          <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2">
            <button className="button-primary px-4 py-2" onClick={() => exportReport('PDF')}>
              <Download size={13} />
              Export PDF
            </button>
            <button className="button-soft border-[#c99b00] px-4 py-2 text-[#9f7500]" onClick={() => exportReport('Excel')}>
              <Download size={13} />
              Export Excel
            </button>
          </div>
        </div>

        {loadingReport ? (
          <div className="flex items-center justify-center py-16 text-sm font-bold text-zinc-400">Memuat laporan...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left">
                <thead className="text-[11px] font-black uppercase text-zinc-600">
                  <tr className="border-b border-[#eee7dd]">
                    <th className="px-3 py-3">Nama Anggota</th>
                    <th className="px-3 py-3">Hadir Tepat Waktu</th>
                    <th className="px-3 py-3">Telat</th>
                    <th className="px-3 py-3">Izin/Sakit</th>
                    <th className="px-3 py-3">Alpa</th>
                    <th className="px-3 py-3 text-right">Persentase</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eee7dd]">
                  {rows.map(row => (
                    <tr key={row.nim} className="text-xs font-semibold text-zinc-700 transition hover:bg-[#fffaf0]">
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eadfcb] text-[10px] font-black text-[#8b6800]">
                            {row.initial}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-bold text-zinc-800">{row.name}</p>
                            <p className="text-[10px] text-zinc-500">{row.nim}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4">{row.present}</td>
                      <td className="px-3 py-4 font-bold text-[#b58b00]">{row.late}</td>
                      <td className="px-3 py-4">{row.permit}</td>
                      <td className="px-3 py-4 text-red-600">{row.absent}</td>
                      <td className="px-3 py-4 text-right"><PercentBadge percentage={row.percentage} /></td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-5 py-10 text-center text-sm font-semibold text-zinc-500">
                        Tidak ada data kehadiran sesuai filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="border-t border-[#eee7dd] px-5 py-3 text-[11px] font-semibold text-zinc-400 sm:hidden">Geser tabel ke samping untuk melihat semua kolom.</p>
            <div className="mt-4 flex items-center justify-between text-[10px] font-semibold text-zinc-500">
              <p>Menampilkan {rows.length} anggota</p>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
