import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { CalendarClock, Camera, CameraOff, CircleDot, Clock, ScanLine, Search, StopCircle, ArrowLeft, Play, RefreshCw, UserCheck, SwitchCamera } from 'lucide-react'
import Swal from 'sweetalert2'
import SelectMenu from './SelectMenu'
import TablePagination from './TablePagination'
import { eventsApi } from '../lib/api'

function StatusBadge({ status }) {
  return (
    <span className={`rounded-full px-4 py-1 text-[10px] font-black ${
      status === 'HADIR' ? 'bg-[#ffc400] text-white' : 'bg-[#8b6800] text-white'
    }`}>
      {status}
    </span>
  )
}

export default function AttendanceSession({ event, meeting, onBack }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const lastQrRef = useRef('')
  const lastQrAtRef = useRef(0)
  const [session, setSession] = useState(null)
  const [logs, setLogs] = useState([])
  const [fetching, setFetching] = useState(true)
  
  const sessionRunning = Boolean(session?.active)
const [scanActive, setScanActive] = useState(false)
  const [cameraOn, setCameraOn] = useState(false)
  const [cameraFacing, setCameraFacing] = useState('environment')
  const [cameraState, setCameraState] = useState('Kamera belum aktif')
  const [cameraAttempt, setCameraAttempt] = useState(0)
  const [scanError, setScanError] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('Semua Status')
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = 10

  const loadAttendance = useCallback(async (showLoader = false) => {
    if (showLoader) setFetching(true)
    try {
      const data = await eventsApi.meetingAttendance(event.id, meeting.id)
      setSession(data.session)
      setLogs(data.attendances || [])
      setScanError('')
    } catch (error) {
      setScanError(error.message)
    } finally {
      if (showLoader) setFetching(false)
    }
  }, [event.id, meeting.id])

  useEffect(() => {
    loadAttendance(true)
  }, [loadAttendance])

  async function refreshTable() {
    setRefreshing(true)
    await loadAttendance(false)
    setRefreshing(false)
  }

  const filteredLogs = useMemo(
    () =>
      logs.filter((log) => {
        const matchesQuery = `${log.name} ${log.nim} ${log.eventDivision}`.toLowerCase().includes(query.toLowerCase())
        const matchesStatus = status === 'Semua Status' || log.status === status
        return matchesQuery && matchesStatus
      }),
    [logs, query, status],
  )
  useEffect(() => {
    setPage(1)
  }, [query, status, logs.length])

  const paginatedLogs = useMemo(
    () => filteredLogs.slice((page - 1) * pageSize, page * pageSize),
    [filteredLogs, page],
  )

  const presentCount = logs.filter((log) => log.status === 'HADIR' || log.status === 'TELAT').length
  const lateCount = logs.filter((log) => log.status === 'TELAT').length
  const participantCount = event.participantCount || event.participants?.length || 0

  const handleQrValue = useCallback(async (rawValue) => {
    if (!sessionRunning) {
      setScanError('Sesi absensi belum aktif.')
      return
    }

    try {
      const data = await eventsApi.scanMeeting(event.id, meeting.id, rawValue)
      if (data.session) setSession(data.session)
      setLogs(data.attendances || [])
      setScanError('')
    } catch (error) {
      setScanError(error.message)
      if (error.message.includes('Anda tidak dapat memindai QR Anda sendiri')) {
        Swal.fire({
          icon: 'error',
          title: 'Oops...',
          text: error.message,
          confirmButtonColor: '#f6bd16'
        })
      }
    }
  }, [event.id, meeting.id, sessionRunning])

  useEffect(() => {
    if (!scanActive) return undefined

    let cancelled = false
    let animationFrame = 0
    let activeStream = null
    const videoNode = videoRef.current

    async function startCamera() {
      setCameraOn(false)
      setScanError('')
      setCameraState('Meminta izin kamera...')

      try {
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
          throw new Error('Kamera membutuhkan koneksi HTTPS. Buka aplikasi melalui alamat HTTPS lalu izinkan akses kamera.')
        }

        let stream
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { exact: cameraFacing } },
            audio: false,
          })
        } catch (cameraError) {
          // Some mobile browsers reject exact constraints; keep the requested side as a preference.
          if (cameraError?.name !== 'OverconstrainedError' && cameraError?.name !== 'NotFoundError') throw cameraError
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: cameraFacing } },
            audio: false,
          })
        }

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        activeStream = stream
        if (videoNode) {
          videoNode.srcObject = stream
          await videoNode.play()
        }

        setCameraOn(true)
        setCameraState('Kamera aktif')

        const detector = 'BarcodeDetector' in window ? new window.BarcodeDetector({ formats: ['qr_code'] }) : null
        const canvas = canvasRef.current
        const context = canvas?.getContext('2d', { willReadFrequently: true })
        setCameraState(detector ? 'Kamera aktif' : 'Kamera aktif - mode kompatibel')

        const scanFrame = async () => {
          if (cancelled || !videoNode) return

          if (videoNode.readyState >= 2) {
            try {
              let value = ''

              if (detector) {
                const codes = await detector.detect(videoNode)
                value = codes[0]?.rawValue || ''
              } else if (canvas && context && videoNode.videoWidth && videoNode.videoHeight) {
                canvas.width = videoNode.videoWidth
                canvas.height = videoNode.videoHeight
                context.drawImage(videoNode, 0, 0, canvas.width, canvas.height)
                const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
                value = jsQR(imageData.data, imageData.width, imageData.height)?.data || ''
              }

              const now = Date.now()
              if (value && (value !== lastQrRef.current || now - lastQrAtRef.current > 2500)) {
                lastQrRef.current = value
                lastQrAtRef.current = now
                await handleQrValue(value)
              }
            } catch {
              if (!cancelled) setScanError('QR belum terbaca, coba dekatkan ulang ke kamera.')
            }
          }

          animationFrame = window.requestAnimationFrame(scanFrame)
        }

        scanFrame()
      } catch (error) {
        setCameraState('Kamera tidak aktif')
      const message = error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError'
        ? 'Akses kamera ditolak. Tekan Izinkan pada permintaan browser, atau ubah izin Kamera untuk situs ini.'
        : error?.name === 'NotFoundError'
          ? 'Kamera tidak ditemukan pada perangkat ini.'
          : error?.message || 'Gagal membuka kamera.'
      setScanError(message)
      }
    }

    startCamera()

    return () => {
      cancelled = true
      if (animationFrame) window.cancelAnimationFrame(animationFrame)
      activeStream?.getTracks().forEach((track) => track.stop())
      lastQrRef.current = ''
      lastQrAtRef.current = 0
      if (videoNode) videoNode.srcObject = null
      setCameraOn(false)
      setCameraState('Kamera belum aktif')
    }
  }, [cameraFacing, cameraAttempt, handleQrValue, scanActive])

  function toggleScan() {
    if (!scanActive && !sessionRunning) {
      setScanError('Tekan Mulai Absensi dulu sebelum scan QR.')
      return
    }

    setScanActive((value) => !value)
  }

  function flipCamera() {
    setCameraFacing((value) => value === 'environment' ? 'user' : 'environment')
  }
  
  async function startSession() {
    try {
      const data = await eventsApi.startMeetingSession(event.id, meeting.id)
      setSession(data.session)
    } catch (error) {
      setScanError(error.message)
    }
  }

  async function endSession() {
    if (!session) return

    try {
      const data = await eventsApi.endMeetingSession(event.id, meeting.id)
      setSession(data.session)
      setLogs(data.attendances || [])
      setScanActive(false)
    } catch (error) {
      setScanError(error.message)
    }
  }

  async function handleSelfScan() {
    try {
      const data = await eventsApi.scanSelfMeeting(event.id, meeting.id)
      setLogs(data.attendances || [])
      if (data.session && !sessionRunning) {
        setSession(data.session)
      }
      Swal.fire({
        icon: 'success',
        title: 'Berhasil',
        text: 'Anda berhasil melakukan absensi Hadir.',
        confirmButtonColor: '#10b981'
      })
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: error.message,
        confirmButtonColor: '#f6bd16'
      })
    }
  }

  if (fetching) {
    return <div className="page-shell"><p className="p-8 text-center text-zinc-500 font-bold">Memuat sesi...</p></div>
  }

  return (
    <div className="page-shell space-y-6">
      <section className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <button className="mb-4 inline-flex items-center gap-2 text-xs font-black text-zinc-500 hover:text-zinc-900" onClick={onBack}>
            <ArrowLeft size={14} />
            Kembali ke Kegiatan
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#fff4cf] px-3 py-1 text-[10px] font-black text-[#8b6800]">{event.category}</span>
            <span className={`rounded-full px-3 py-1 text-[10px] font-black ${sessionRunning ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
              {sessionRunning ? 'Sesi Aktif' : 'Menunggu'}
            </span>
          </div>
          <h1 className="mt-3 text-[28px] font-black leading-tight text-zinc-900">{meeting.title}</h1>
          <p className="mt-2 text-sm font-semibold text-zinc-600">Proker: {event.title}</p>
        </div>
        
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <button className="button-soft w-full text-[#9f7500] hover:bg-[#fff4cf] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto" onClick={handleSelfScan} disabled={!sessionRunning} title={!sessionRunning ? 'Buka sesi absensi terlebih dahulu' : undefined}>
            <UserCheck size={15} />
            Hadir Saya
          </button>
          {!sessionRunning && (
            <button className="button-primary w-full sm:w-auto" onClick={startSession}>
              <Play size={15} />
              Mulai Sesi Absensi
            </button>
          )}
        </div>
      </section>

      <section className="space-y-5">
        <div className="surface p-5">
          <div className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-[11px] font-black uppercase text-[#9f7500]">Sesi Absensi</p>
              <h2 className="mt-1 text-xl font-black text-zinc-900">{sessionRunning ? 'Sedang Berlangsung' : 'Belum Dimulai'}</h2>
              <p className="mt-1 text-xs font-bold text-zinc-500">
                {sessionRunning ? `Mulai ${new Date(session.startedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB - telat setelah ${meeting.lateAfter} WIB` : 'Mulai sesi untuk membuka scanner QR.'}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button className={`${scanActive ? 'button-dark' : 'button-primary'} w-full disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto`} onClick={toggleScan} disabled={!sessionRunning}>
                <ScanLine size={15} />
                {scanActive ? 'Tutup Scan' : 'Mulai Scan'}
              </button>
              {sessionRunning && (
                <button className="button-soft w-full sm:w-auto" onClick={endSession}>
                  <StopCircle size={15} />
                  Akhiri Sesi
                </button>
              )}
            </div>
          </div>
          {scanError && (
            <div className="mt-4 rounded-lg bg-red-50 px-3 py-3 text-xs font-bold text-red-600">
              <p>{scanError}</p>
              {scanActive && !cameraOn && (
                <button type="button" className="mt-2 rounded-full bg-red-600 px-3 py-2 text-[11px] font-black text-white" onClick={() => setCameraAttempt((value) => value + 1)}>
                  Izinkan / Coba Lagi
                </button>
              )}
            </div>
          )}
        </div>

        {scanActive && (
          <div className="surface overflow-hidden p-0">
            <div className="relative aspect-[3/4] overflow-hidden bg-zinc-950 sm:aspect-video">
                <video ref={videoRef} className={`h-full w-full object-cover ${cameraFacing === 'user' ? '-scale-x-100' : ''}`} autoPlay muted playsInline />
                <canvas ref={canvasRef} className="hidden" />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_38%,rgba(0,0,0,0.42)_39%)]" />
                <div className="pointer-events-none absolute left-1/2 top-1/2 h-[58%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/70 shadow-[0_0_0_999px_rgba(0,0,0,0.16)]">
                  <span className="absolute left-4 right-4 top-1/2 h-0.5 bg-[#ffc400] shadow-[0_0_18px_rgba(255,196,0,0.65)] scan-line" />
                </div>
                <div className="absolute right-3 top-3 flex items-center gap-2">
                  <span className="rounded-full bg-black/55 px-3 py-1.5 text-[10px] font-black text-white backdrop-blur-sm">
                    {cameraFacing === 'environment' ? 'Belakang' : 'Depan'}
                  </span>
                  <button
                    type="button"
                    onClick={flipCamera}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-zinc-800 shadow-lg transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                    title="Balik kamera"
                    aria-label="Balik kamera depan atau belakang"
                    disabled={!cameraOn}
                  >
                    <SwitchCamera size={19} />
                  </button>
                </div>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1.5 text-[10px] font-black text-white backdrop-blur-sm">
                  {cameraOn ? 'Arahkan QR ke kotak tengah' : cameraState}
                </div>
                {!cameraOn && (
                  <div className="absolute inset-0 flex items-center justify-center text-white/70">
                    {scanError ? <CameraOff size={38} /> : <Camera size={38} />}
                  </div>
                )}
              </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="surface card-motion p-5">
            <p className="text-[11px] font-black uppercase text-zinc-500">Total Kehadiran</p>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-[38px] font-black leading-none text-zinc-900">{presentCount}</span>
              <span className="pb-1 text-xl font-black text-zinc-600">/ {participantCount}</span>
            </div>

          </div>
          <div className="surface card-motion p-5">
            <p className="flex items-center gap-2 text-[11px] font-black uppercase text-zinc-500">
              <CalendarClock size={17} className="text-[#9f7500]" />
              Belum Scan
            </p>
            <div className="mt-4 flex items-end gap-2">
              <span className="text-[38px] font-black leading-none text-zinc-900">{Math.max(0, participantCount - presentCount)}</span>
              <span className="pb-1 text-base font-black text-zinc-600">Anggota</span>
            </div>
          </div>
          <div className="surface card-motion p-5">
            <p className="flex items-center gap-2 text-[11px] font-black uppercase text-zinc-500">
              <Clock size={17} className="text-[#9f7500]" />
              Terlambat
            </p>
            <div className="mt-4 flex items-end gap-2">
              <span className="text-[38px] font-black leading-none text-zinc-900">{lateCount}</span>
              <span className="pb-1 text-base font-black text-zinc-600">Anggota</span>
            </div>
          </div>
        </div>

        <div className="surface rounded-[26px] p-3 md:rounded-full">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_160px]">
            <label className="relative block">
              <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input value={query} onChange={(input) => setQuery(input.target.value)} placeholder="Cari nama, NIM-P, atau divisi..." className="h-10 w-full rounded-full border border-[#e8dfd2] bg-white pl-10 pr-4 text-xs font-semibold outline-none placeholder:text-zinc-400 focus:border-[#d8b149]" />
            </label>
            <SelectMenu value={status} options={['Semua Status', 'HADIR', 'TELAT']} onChange={setStatus} />
          </div>
        </div>

        <div className="surface overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#eee7dd] px-5 py-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black text-zinc-800">Log Kehadiran</h2>
              <button type="button" className="button-soft h-9 px-3 text-xs" onClick={refreshTable} disabled={refreshing} title="Refresh tabel">
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f2eee6] px-3 py-1 text-[10px] font-black text-[#9f7500]">
              <CircleDot size={11} fill="currentColor" className={scanActive ? 'animate-pulse' : ''} />
              {scanActive ? 'LIVE' : sessionRunning ? 'AKTIF' : 'PAUSED'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-[#f2efec] text-[11px] font-black uppercase text-zinc-600">
                <tr>
                  <th className="px-5 py-4">Nama</th>
                <th className="px-5 py-4">NIM-P</th>
                <th className="px-5 py-4">Divisi Acara</th>
                <th className="px-5 py-4">Waktu Pindai</th>
                <th className="px-5 py-4">Keterangan</th>
                <th className="px-5 py-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eee7dd]">
                {paginatedLogs.map((log) => (
                  <tr key={log.id || `${log.nim}-${log.time}`} className="text-sm transition hover:bg-[#fffaf0]">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eadfcb] text-xs font-black text-[#8b6800]">
                          {log.initial}
                        </div>
                        <span className="font-semibold text-zinc-700">{log.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-semibold text-zinc-600">{log.nim}</td>
                    <td className="px-5 py-4 font-bold text-[#8b6800]">{log.eventDivision || '-'}</td>
                    <td className="px-5 py-4 font-mono text-xs font-semibold text-zinc-600">{log.time}</td>
                    <td className="px-5 py-4 text-xs font-semibold text-zinc-600">{log.status === 'IZIN' ? (log.note || '-') : '-'}</td>
                    <td className="px-5 py-4 text-right"><StatusBadge status={log.status} /></td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-5 py-10 text-center text-sm font-semibold text-zinc-500">Belum ada data kehadiran sesuai filter.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="border-t border-[#eee7dd] px-5 py-3 text-[11px] font-semibold text-zinc-400 sm:hidden">Geser tabel ke samping untuk melihat semua kolom.</p>
          <TablePagination page={page} total={filteredLogs.length} pageSize={pageSize} onPageChange={setPage} itemLabel="log" />
        </div>
      </section>
    </div>
  )
}



