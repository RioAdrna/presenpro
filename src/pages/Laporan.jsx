import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, Download, Filter, ListChecks, RefreshCw, UserRoundCheck, UserRoundX, Users } from 'lucide-react'
import Swal from 'sweetalert2'
import { PageSkeleton } from '../components/Skeleton'
import SelectMenu from '../components/SelectMenu'
import TablePagination from '../components/TablePagination'
import useSkeletonLoading from '../hooks/useSkeletonLoading'
import { eventsApi, reportsApi } from '../lib/api'

const pageSize = 10

function MetricCard({ metric }) {
  const Icon = metric.icon
  const valueColor = metric.tone === 'yellow' ? 'text-[#b58b00]' : 'text-zinc-900'

  return (
    <article className="surface card-motion rounded-none p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-zinc-700">{metric.label}</p>
          <p className={`mt-5 text-[32px] font-black leading-none ${valueColor}`}>{metric.value}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fff4cf] text-[#9f7500]">
          <Icon size={17} />
        </div>
      </div>
    </article>
  )
}

export default function Laporan() {
  const loading = useSkeletonLoading()
  const [events, setEvents] = useState([])
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [selectedEventSlug, setSelectedEventSlug] = useState('all')
  const [selectedMeetingId, setSelectedMeetingId] = useState('all')
  const [rows, setRows] = useState([])
  const [summary, setSummary] = useState({ totalPresent: 0, totalLate: 0, totalPermit: 0, totalAbsent: 0, memberCount: 0 })
  const [loadingReport, setLoadingReport] = useState(false)
  const [page, setPage] = useState(1)

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

  const selectedEvent = useMemo(
    () => events.find(e => e.id === selectedEventSlug),
    [events, selectedEventSlug],
  )
  const meetings = useMemo(() => selectedEvent?.meetings || [], [selectedEvent])

  useEffect(() => {
    setSelectedMeetingId('all')
  }, [selectedEventSlug])

  const fetchReport = useCallback(async () => {
    setLoadingReport(true)
    try {
      const params = {}
      if (selectedEventSlug !== 'all') params.event = selectedEventSlug
      if (selectedMeetingId !== 'all') params.meeting = selectedMeetingId
      const data = await reportsApi.attendance(params)
      setRows(data.rows || [])
      setSummary(data.summary || { totalPresent: 0, totalLate: 0, totalPermit: 0, totalAbsent: 0, memberCount: 0 })
    } catch {
      setRows([])
      setSummary({ totalPresent: 0, totalLate: 0, totalPermit: 0, totalAbsent: 0, memberCount: 0 })
    } finally {
      setLoadingReport(false)
    }
  }, [selectedEventSlug, selectedMeetingId])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  useEffect(() => {
    setPage(1)
  }, [rows])

  const paginatedRows = useMemo(
    () => rows.slice((page - 1) * pageSize, page * pageSize),
    [rows, page],
  )

  const metrics = [
    { label: 'Hadir Tepat Waktu', value: summary.totalPresent.toLocaleString('id-ID'), icon: UserRoundCheck, tone: 'green' },
    { label: 'Total Telat', value: summary.totalLate.toLocaleString('id-ID'), icon: UserRoundX, tone: 'yellow' },
    { label: 'Total Izin/Sakit', value: summary.totalPermit, icon: Users, tone: summary.totalPermit > 3 ? 'red' : 'green' },
    { label: 'Total Alpa', value: summary.totalAbsent, icon: UserRoundX, tone: summary.totalAbsent > 1 ? 'red' : 'green' },
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

  function exportColumns() {
    return [
      { key: 'nim', label: 'NIM-P', align: 'left', min: 130, max: 190 },
      { key: 'name', label: 'Nama', align: 'left', min: 190, max: 280 },
      { key: 'present', label: 'Hadir Tepat Waktu', align: 'center', min: 105, max: 150 },
      { key: 'late', label: 'Telat', align: 'center', min: 70, max: 95 },
      { key: 'permit', label: 'Izin/Sakit', align: 'center', min: 85, max: 120 },
      { key: 'absent', label: 'Alpa', align: 'center', min: 70, max: 95 },
    ]
  }

  function exportValue(row, column) {
    return row[column.key] ?? ''
  }

  function exportColumnWidth(column, reportRows) {
    const maxChars = Math.max(
      column.label.length,
      ...reportRows.map((row) => String(exportValue(row, column)).length),
    )
    return Math.min(column.max, Math.max(column.min, maxChars * 8 + 28))
  }

  function exportTableHtml(reportRows) {
    const columns = exportColumns()
    const colgroup = [
      '<col style="width:48px" />',
      ...columns.map((column) => `<col style="width:${exportColumnWidth(column, reportRows)}px" />`),
    ].join('')
    const header = columns
      .map((column) => `<th style="text-align:${column.align}">${escapeHtml(column.label)}</th>`)
      .join('')

    return `
      <table>
        <colgroup>${colgroup}</colgroup>
        <thead>
          <tr>
            <th style="text-align:center">No</th>${header}
          </tr>
        </thead>
        <tbody>
          ${reportRows.map((row, index) => `
            <tr>
              <td style="text-align:center">${index + 1}</td>
              ${columns.map((column) => `<td style="text-align:${column.align}">${escapeHtml(exportValue(row, column))}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    `
  }

  function exportDocumentHtml(title, reportRows, mode) {
    const generatedAt = new Date().toLocaleString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(title)}</title>
          <style>
            @page { size: landscape; margin: 14mm; }
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; color: #18181b; padding: ${mode === 'excel' ? '16px' : '0'}; }
            h1 { margin: 0; font-size: 20px; line-height: 1.2; }
            .meta { margin: 6px 0 16px; color: #52525b; font-size: 11px; }
            table { width: 100%; border-collapse: collapse; table-layout: auto; font-size: 11px; }
            th, td { border: 1px solid #b8b8b8; padding: 7px 8px; vertical-align: middle; white-space: nowrap; }
            th { background: #f4f4f5; color: #18181b; font-weight: 700; }
            tbody tr:nth-child(even) td { background: #fafafa; }
            td:nth-child(3) { white-space: normal; }
          </style>
        </head>
        <body>
          <h1>Laporan Kehadiran PresenPRO</h1>
          ${mode === 'excel' ? `<p class="meta">${escapeHtml(title)} | Dicetak ${escapeHtml(generatedAt)} | ${reportRows.length} record</p>` : ''}
          ${exportTableHtml(reportRows)}
        </body>
      </html>
    `
  }

  function xmlCell(value, rowIndex, columnIndex, style = 0) {
    const reference = `${columnName(columnIndex)}${rowIndex}`
    const text = String(value ?? '')
    const styleAttr = style ? ` s="${style}"` : ''

    if (typeof value === 'number' && Number.isFinite(value)) {
      return `<c r="${reference}"${styleAttr}><v>${value}</v></c>`
    }

    return `<c r="${reference}" t="inlineStr"${styleAttr}><is><t>${escapeXml(text)}</t></is></c>`
  }

  function columnName(index) {
    let name = ''
    let current = index
    while (current > 0) {
      const remainder = (current - 1) % 26
      name = String.fromCharCode(65 + remainder) + name
      current = Math.floor((current - 1) / 26)
    }
    return name
  }

  function escapeXml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&apos;')
  }

  function createXlsxWorkbook(title, reportRows) {
    const columns = exportColumns()
    const headers = ['No', ...columns.map((column) => column.label)]
    const bodyRows = reportRows.map((row, index) => [
      index + 1,
      ...columns.map((column) => exportValue(row, column)),
    ])
    const allRows = [headers, ...bodyRows]
    const lastCell = `${columnName(headers.length)}${allRows.length}`
    const columnWidths = [
      7,
      ...columns.map((column) => Math.round(exportColumnWidth(column, reportRows) / 7)),
    ]

    const sheetRows = allRows.map((row, rowIndex) => {
      const number = rowIndex + 1
      const cells = row.map((value, columnIndex) => xmlCell(value, number, columnIndex + 1, rowIndex === 0 ? 1 : 0)).join('')
      return `<row r="${number}">${cells}</row>`
    }).join('')

    const worksheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="A1:${lastCell}"/>
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <cols>${columnWidths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${Math.max(6, Math.min(42, width))}" customWidth="1"/>`).join('')}</cols>
  <sheetData>${sheetRows}</sheetData>
  <autoFilter ref="A1:${lastCell}"/>
</worksheet>`

    const sheetName = title.replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 31) || 'Laporan'
    const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`

    const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF4F4F5"/><bgColor indexed="64"/></patternFill></fill></fills>
  <borders count="2"><border/><border><left style="thin"><color rgb="FFB8B8B8"/></left><right style="thin"><color rgb="FFB8B8B8"/></right><top style="thin"><color rgb="FFB8B8B8"/></top><bottom style="thin"><color rgb="FFB8B8B8"/></bottom></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0"/><xf numFmtId="0" fontId="1" fillId="1" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/></cellXfs>
</styleSheet>`

    return createZipFile([
      { name: '[Content_Types].xml', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>` },
      { name: '_rels/.rels', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>` },
      { name: 'xl/workbook.xml', content: workbook },
      { name: 'xl/_rels/workbook.xml.rels', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>` },
      { name: 'xl/styles.xml', content: styles },
      { name: 'xl/worksheets/sheet1.xml', content: worksheet },
    ])
  }

  function createZipFile(files) {
    const encoder = new TextEncoder()
    const parts = []
    const centralParts = []
    let offset = 0

    files.forEach((file) => {
      const nameBytes = encoder.encode(file.name)
      const contentBytes = encoder.encode(file.content)
      const crc = crc32(contentBytes)
      const localHeader = zipHeader(0x04034b50, [
        [20, 2], [0, 2], [0, 2], [0, 2], [0, 2], [crc, 4],
        [contentBytes.length, 4], [contentBytes.length, 4], [nameBytes.length, 2], [0, 2],
      ])
      parts.push(localHeader, nameBytes, contentBytes)

      const centralHeader = zipHeader(0x02014b50, [
        [20, 2], [20, 2], [0, 2], [0, 2], [0, 2], [0, 2], [crc, 4],
        [contentBytes.length, 4], [contentBytes.length, 4], [nameBytes.length, 2], [0, 2],
        [0, 2], [0, 2], [0, 2], [0, 4], [offset, 4],
      ])
      centralParts.push(centralHeader, nameBytes)
      offset += localHeader.length + nameBytes.length + contentBytes.length
    })

    const centralSize = centralParts.reduce((total, part) => total + part.length, 0)
    const endHeader = zipHeader(0x06054b50, [
      [0, 2], [0, 2], [files.length, 2], [files.length, 2], [centralSize, 4], [offset, 4], [0, 2],
    ])

    return new Blob([...parts, ...centralParts, endHeader], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  }

  function zipHeader(signature, fields) {
    const size = 4 + fields.reduce((total, field) => total + field[1], 0)
    const bytes = new Uint8Array(size)
    const view = new DataView(bytes.buffer)
    let offset = 0
    view.setUint32(offset, signature, true)
    offset += 4
    fields.forEach(([value, byteSize]) => {
      if (byteSize === 2) view.setUint16(offset, value, true)
      if (byteSize === 4) view.setUint32(offset, value, true)
      offset += byteSize
    })
    return bytes
  }

  function crc32(bytes) {
    let crc = 0xffffffff
    for (let index = 0; index < bytes.length; index += 1) {
      crc ^= bytes[index]
      for (let bit = 0; bit < 8; bit += 1) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
      }
    }
    return (crc ^ 0xffffffff) >>> 0
  }
  function exportReport(type) {
    if (rows.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Tidak ada data', text: 'Tidak ada data laporan yang bisa diekspor.', confirmButtonColor: '#f6bd16' })
      return
    }

    const title = reportTitle()
    const fileName = `presenpro-${safeFileName(title)}`

    if (type === 'Excel') {
      const blob = createXlsxWorkbook(title, rows)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${fileName}.xlsx`
      link.type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      link.rel = 'noopener'
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      window.setTimeout(() => {
        link.remove()
        URL.revokeObjectURL(url)
      }, 1000)
      return
    }

    const printWindow = window.open('', '_blank', 'width=1200,height=800')
    if (!printWindow) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: 'Popup browser diblokir. Izinkan popup untuk export PDF.', confirmButtonColor: '#f6bd16' })
      return
    }

    printWindow.document.open()
    printWindow.document.write(exportDocumentHtml(title, rows, 'pdf'))
    printWindow.document.close()

    window.setTimeout(() => {
      printWindow.focus()
      printWindow.print()
    }, 350)
  }

  if (loading) return <PageSkeleton table />

  return (
    <div className="page-shell space-y-6">
      <section className="surface">
        <div className="border-b border-[#eee7dd] px-5 py-4">
          <h2 className="flex items-center gap-2 text-sm font-black text-zinc-800">
            <Filter size={15} className="text-[#9f7500]" />
            Filter Laporan
          </h2>
        </div>

        <div className="grid gap-3 p-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-[11px] font-black uppercase text-zinc-500">Kegiatan</span>
            <SelectMenu
              value={selectedEvent?.title || 'Semua Kegiatan'}
              options={['Semua Kegiatan', ...events.map((event) => event.title)]}
              onChange={(value) => {
                const event = events.find((item) => item.title === value)
                setSelectedEventSlug(event?.id || 'all')
              }}
              icon={CalendarDays}
              buttonClassName="h-11 rounded-lg bg-[#fbfaf8] text-sm"
            />
          </label>
          <label className="space-y-2">
            <span className="text-[11px] font-black uppercase text-zinc-500">Pertemuan</span>
            <div className={selectedEventSlug === 'all' || meetings.length === 0 ? 'pointer-events-none opacity-60' : ''}>
              <SelectMenu
                value={selectedMeetingId === 'all' ? 'Semua Pertemuan' : meetings.find((meeting) => String(meeting.id) === selectedMeetingId)?.title || 'Semua Pertemuan'}
                options={['Semua Pertemuan', ...meetings.map((meeting) => meeting.title)]}
                onChange={(value) => {
                  const meeting = meetings.find((item) => item.title === value)
                  setSelectedMeetingId(meeting ? String(meeting.id) : 'all')
                }}
                icon={ListChecks}
                buttonClassName="h-11 rounded-lg bg-[#fbfaf8] text-sm"
              />
            </div>
          </label>
          {loadingEvents && <p className="text-xs font-semibold text-zinc-500 md:col-span-2">Memuat kegiatan...</p>}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(metric => <MetricCard key={metric.label} metric={metric} />)}
      </section>

      <section className="surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eee7dd] px-5 py-4">
          <div>
            <h2 className="text-xl font-black text-zinc-900">Detail Laporan</h2>
            {selectedEvent && <p className="mt-1 text-xs font-bold text-[#9f7500]">{reportTitle()}</p>}
          </div>
          <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-3">
            <button className="button-soft px-4 py-2" onClick={fetchReport} disabled={loadingReport} title="Refresh tabel">
              <RefreshCw size={13} className={loadingReport ? 'animate-spin' : ''} />
              Refresh
            </button>
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
              <table className="w-full min-w-[620px] text-left">
                <thead className="text-[11px] font-black uppercase text-zinc-600">
                  <tr className="border-b border-[#eee7dd]">
                    <th className="px-3 py-3">Nama Anggota</th>
                    <th className="px-3 py-3">Hadir Tepat Waktu</th>
                    <th className="px-3 py-3">Telat</th>
                    <th className="px-3 py-3">Izin/Sakit</th>
                    <th className="px-3 py-3">Alpa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eee7dd]">
                  {paginatedRows.map(row => (
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
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-5 py-10 text-center text-sm font-semibold text-zinc-500">
                        Tidak ada data kehadiran sesuai filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="border-t border-[#eee7dd] px-5 py-3 text-[11px] font-semibold text-zinc-400 sm:hidden">Geser tabel ke samping untuk melihat semua kolom.</p>
            <TablePagination page={page} total={rows.length} pageSize={pageSize} onPageChange={setPage} itemLabel="anggota" />
          </>
        )}
      </section>
    </div>
  )
}








