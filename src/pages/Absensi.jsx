import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarClock, Camera, CameraOff, CircleDot, ScanLine, Search } from 'lucide-react'
import SelectMenu from '../components/SelectMenu'
import { PageSkeleton } from '../components/Skeleton'
import {
  getMemberByNim,
  isLateScan,
  loadEvents,
  normalizeQrValue,
  readActiveSession,
  readAttendanceLogs,
  writeActiveSession,
  writeAttendanceLogs,
} from '../data/presence'
import useSkeletonLoading from '../hooks/useSkeletonLoading'

const seededLogs = [
  { name: 'Ahmad Nurjaman', nim: '1904561', division: 'Humas', time: '10:15:32 WIB', status: 'TELAT', initial: 'AN' },
  { name: 'Defia Dealova', nim: '1904230', division: 'Acara', time: '10:14:45 WIB', status: 'TELAT', initial: 'DD' },
  { name: 'Budi Santoso', nim: '1903982', division: 'Perlengkapan', time: '10:12:10 WIB', status: 'TELAT', initial: 'BS' },
  { name: 'Dian Rosita', nim: '1904112', division: 'Konsumsi', time: '10:09:55 WIB', status: 'HADIR', initial: 'DR' },
]

function loadLogs(eventId) {
  const stored = readAttendanceLogs(eventId)
  if (stored.length > 0) return stored
  return eventId === 'rapat-pengurus-probumsil' ? seededLogs : []
}

function StatusBadge({ status }) {
  return (
    <span className={`rounded-full px-4 py-1 text-[10px] font-black ${
      status === 'HADIR' ? 'bg-[#ffc400] text-white' : 'bg-[#8b6800] text-white'
    }`}>
      {status}
    </span>
  )
}

export default function Absensi() {
  const loading = useSkeletonLoading()
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const lastQrRef = useRef('')
  const logsRef = useRef([])
  const [events] = useState(() => loadEvents())
  const [activeSession, setActiveSession] = useState(() => readActiveSession())
  const activeEvent = useMemo(
    () => events.find((event) => event.id === activeSession?.eventId) || events.find((event) => event.id === 'rapat-pengurus-probumsil') || events[0],
    [activeSession, events],
  )
  const sessionRunning = Boolean(activeSession?.active && activeSession.eventId === activeEvent?.id)
  const [logs, setLogs] = useState(() => loadLogs(readActiveSession()?.eventId || 'rapat-pengurus-probumsil'))
  const [scanActive, setScanActive] = useState(false)
  const [cameraOn, setCameraOn] = useState(false)
  const [cameraState, setCameraState] = useState('Kamera belum aktif')
  const [scanError, setScanError] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('Semua Status')

  const filteredLogs = useMemo(
    () =>
      logs.filter((log) => {
        const matchesQuery = `${log.name} ${log.nim} ${log.division}`.toLowerCase().includes(query.toLowerCase())
        const matchesStatus = status === 'Semua Status' || log.status === status
        return matchesQuery && matchesStatus
      }),
    [logs, query, status],
  )
  const presentCount = logs.filter((log) => log.status === 'HADIR').length + logs.filter((log) => log.status === 'TELAT').length
  const participantCount = activeEvent?.participantCount || 50
  const percent = Math.round((presentCount / participantCount) * 100)

  useEffect(() => {
    logsRef.current = logs
  }, [logs])

  useEffect(() => {
    if (activeEvent?.id) writeAttendanceLogs(activeEvent.id, logs)
  }, [activeEvent?.id, logs])

  const handleQrValue = useCallback((rawValue) => {
    const nim = normalizeQrValue(rawValue)

    if (!sessionRunning) {
      setScanError('Sesi absensi belum aktif. Mulai dari detail kegiatan dulu.')
      return
    }

    if (!nim) {
      setScanError('QR tidak valid. NIM-P anggota tidak ditemukan.')
      return
    }

    const member = getMemberByNim(nim)
    if (!member) {
      setScanError('Anggota tidak terdaftar di PresenPRO.')
      return
    }

    if (!activeEvent?.participants?.includes(nim)) {
      setScanError('Anggota ini tidak terdaftar sebagai peserta kegiatan.')
      return
    }

    if (logsRef.current.some((log) => log.nim === nim)) {
      setScanError(`${member.name} sudah melakukan absensi.`)
      return
    }

    setScanError('')
    setLogs((current) => [{
      ...member,
      nim,
      time: new Date().toLocaleTimeString('id-ID', { hour12: false }) + ' WIB',
      status: isLateScan(activeEvent.lateAfter) ? 'TELAT' : 'HADIR',
    }, ...current])
  }, [activeEvent, sessionRunning])

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
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Browser ini belum mendukung akses kamera.')
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })

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

        if (!('BarcodeDetector' in window)) {
          setScanError('Pemindai QR otomatis belum tersedia di browser ini.')
          return
        }

        const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
        const scanFrame = async () => {
          if (cancelled || !videoNode) return

          if (videoNode.readyState >= 2) {
            try {
              const codes = await detector.detect(videoNode)
              const value = codes[0]?.rawValue

              if (value && value !== lastQrRef.current) {
                lastQrRef.current = value
                handleQrValue(value)
              }
            } catch {
              setScanError('QR belum terbaca, coba dekatkan ulang ke kamera.')
            }
          }

          animationFrame = window.requestAnimationFrame(scanFrame)
        }

        scanFrame()
      } catch (error) {
        setCameraState('Kamera tidak aktif')
        setScanError(error?.message || 'Gagal membuka kamera.')
      }
    }

    startCamera()

    return () => {
      cancelled = true
      if (animationFrame) window.cancelAnimationFrame(animationFrame)
      activeStream?.getTracks().forEach((track) => track.stop())
      lastQrRef.current = ''
      if (videoNode) videoNode.srcObject = null
      setCameraOn(false)
      setCameraState('Kamera belum aktif')
    }
  }, [handleQrValue, scanActive])

  function toggleScan() {
    if (!scanActive && !sessionRunning) {
      setScanError('Belum ada sesi absensi aktif. Buka detail kegiatan lalu tekan Mulai Absensi.')
      return
    }

    setScanActive((value) => !value)
  }

  function endSession() {
    if (!activeSession) return

    const nextSession = { ...activeSession, active: false, endedAt: new Date().toISOString() }
    writeActiveSession(nextSession)
    setActiveSession(nextSession)
    setScanActive(false)
  }

  if (loading) return <PageSkeleton table />

  return (
    <div className="page-shell space-y-7">
      <section className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <h1 className="text-[28px] font-black text-zinc-900">Monitoring Absensi</h1>
          <p className="mt-1 text-base font-semibold text-zinc-600">{activeEvent?.title || 'Belum ada kegiatan dipilih'}</p>
          <p className="mt-1 text-xs font-bold text-zinc-500">{sessionRunning ? `Sesi aktif - telat setelah ${activeEvent.lateAfter} WIB` : 'Sesi belum aktif'}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button className={`${scanActive ? 'button-dark' : 'button-primary'} w-full disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto`} onClick={toggleScan} disabled={!sessionRunning}>
            <ScanLine size={15} />
            {scanActive ? 'Tutup Scan' : 'Mulai Scan'}
          </button>
          {sessionRunning ? (
            <button className="button-soft w-full sm:w-auto" onClick={endSession}>Akhiri Sesi</button>
          ) : (
            <button className="button-soft w-full sm:w-auto" onClick={() => navigate('/kegiatan')}>Pilih Kegiatan</button>
          )}
        </div>
      </section>

      {scanActive && (
        <section className="surface overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_248px]">
            <div className="relative aspect-[4/3] overflow-hidden bg-zinc-950 sm:aspect-video">
              <video ref={videoRef} className="h-full w-full object-cover" autoPlay muted playsInline />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_38%,rgba(0,0,0,0.42)_39%)]" />
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-[58%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/70 shadow-[0_0_0_999px_rgba(0,0,0,0.16)]">
                <span className="absolute left-4 right-4 top-1/2 h-0.5 bg-[#ffc400] shadow-[0_0_18px_rgba(255,196,0,0.65)] scan-line" />
              </div>
              {!cameraOn && (
                <div className="absolute inset-0 flex items-center justify-center text-white/70">
                  {scanError ? <CameraOff size={38} /> : <Camera size={38} />}
                </div>
              )}
            </div>
            <div className="flex flex-col justify-center gap-5 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full ${scanError ? 'bg-red-50 text-red-600' : 'bg-[#fff4cf] text-[#9f7500]'}`}>
                    {scanError ? <CameraOff size={16} /> : <ScanLine size={16} />}
                  </span>
                  <div>
                    <p className="text-xs font-black uppercase text-[#9f7500]">Scanner QR</p>
                    <p className="text-sm font-black text-zinc-900">{cameraState}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm font-semibold text-zinc-600">Posisikan QR anggota di area tengah kamera.</p>
                <p className="mt-2 text-xs font-bold text-zinc-500">Data yang terbaca akan langsung masuk ke tabel bawah.</p>
                {scanError && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600">{scanError}</p>}
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_236px]">
        <div className="surface card-motion p-5">
          <div className="flex items-center justify-between gap-5">
            <div>
              <p className="text-[11px] font-black uppercase text-zinc-500">Total Kehadiran</p>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-[38px] font-black leading-none text-zinc-900">{presentCount}</span>
                <span className="pb-1 text-xl font-black text-zinc-600">/ {participantCount}</span>
              </div>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-[6px] border-[#b58b00] border-l-[#eee7dd] text-lg font-black text-[#9f7500]">
              {percent}%
            </div>
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
      </section>

      <section className="surface rounded-[26px] p-3 md:rounded-full">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_160px]">
          <label className="relative block">
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama, NIM-P, atau divisi..." className="h-10 w-full rounded-full border border-[#e8dfd2] bg-white pl-10 pr-4 text-xs font-semibold outline-none placeholder:text-zinc-400 focus:border-[#d8b149]" />
          </label>
          <SelectMenu value={status} options={['Semua Status', 'HADIR', 'TELAT']} onChange={setStatus} />
        </div>
      </section>

      <section className="surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#eee7dd] px-5 py-4">
          <h2 className="text-xl font-black text-zinc-800">Log Kehadiran</h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f2eee6] px-3 py-1 text-[10px] font-black text-[#9f7500]">
            <CircleDot size={11} fill="currentColor" className={scanActive ? 'animate-pulse' : ''} />
            {scanActive ? 'LIVE' : 'PAUSED'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-[#f2efec] text-[11px] font-black uppercase text-zinc-600">
              <tr>
                <th className="px-5 py-4">Nama</th>
                <th className="px-5 py-4">NIM-P</th>
                <th className="px-5 py-4">Divisi</th>
                <th className="px-5 py-4">Waktu Pindai</th>
                <th className="px-5 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eee7dd]">
              {filteredLogs.map((log) => (
                <tr key={`${log.nim}-${log.time}`} className="text-sm transition hover:bg-[#fffaf0]">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eadfcb] text-xs font-black text-[#8b6800]">
                        {log.initial}
                      </div>
                      <span className="font-semibold text-zinc-700">{log.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-semibold text-zinc-600">{log.nim}</td>
                  <td className="px-5 py-4 font-semibold text-zinc-600">{log.division}</td>
                  <td className="px-5 py-4 font-mono text-xs font-semibold text-zinc-600">{log.time}</td>
                  <td className="px-5 py-4 text-right"><StatusBadge status={log.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-[#eee7dd] px-5 py-3 text-[11px] font-semibold text-zinc-400 sm:hidden">Geser tabel ke samping untuk melihat semua kolom.</p>
      </section>
    </div>
  )
}
