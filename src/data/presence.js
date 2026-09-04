export const participantMembers = [
  { nim: '1904561', name: 'Ahmad Nurjaman', division: 'Humas', initial: 'AN' },
  { nim: '1904230', name: 'Defia Dealova', division: 'Acara', initial: 'DD' },
  { nim: '1903982', name: 'Budi Santoso', division: 'Perlengkapan', initial: 'BS' },
  { nim: '1904112', name: 'Dian Rosita', division: 'Konsumsi', initial: 'DR' },
  { nim: '1904725', name: 'Nadia Rahma', division: 'Protokol', initial: 'NR' },
  { nim: '1904881', name: 'Raka Pratama', division: 'Pengamanan', initial: 'RP' },
]

export const defaultEvents = [
  {
    id: 'rapat-pengurus-probumsil',
    title: 'Rapat Pengurus PROBUMSIL',
    category: 'Rapat',
    status: 'Aktif',
    date: '1 Sep 2026',
    time: '10:00 - 12:00 WIB',
    startTime: '10:00',
    lateAfter: '10:15',
    place: 'Ruang Rapat Utama Gd. Rektorat',
    participantCount: 50,
    rule: 'QR pribadi anggota, toleransi terlambat 15 menit',
    participants: participantMembers.map((member) => member.nim),
  },
  {
    id: 'pelatihan-jurnalistik-dasar',
    title: 'Pelatihan Jurnalistik Dasar',
    category: 'Pelatihan',
    status: 'Akan Datang',
    date: '28 Okt 2026',
    time: '13:00 - 16:00 WIB',
    startTime: '13:00',
    lateAfter: '13:15',
    place: 'Auditorium FPIPS UPI',
    participantCount: 120,
    rule: 'QR pribadi anggota, toleransi terlambat 15 menit',
    participants: participantMembers.map((member) => member.nim),
  },
  {
    id: 'evaluasi-program-kerja-q3',
    title: 'Evaluasi Program Kerja Q3',
    category: 'Evaluasi',
    status: 'Selesai',
    date: '15 Okt 2026',
    time: '15:00 - 17:30 WIB',
    startTime: '15:00',
    lateAfter: '15:15',
    place: 'Ruang Sidang Lt. 2',
    participantCount: 38,
    rule: 'QR pribadi anggota, toleransi terlambat 15 menit',
    participants: participantMembers.map((member) => member.nim),
  },
]

const eventsKey = 'presenpro.events'
const sessionKey = 'presenpro.activeAttendanceSession'

function canUseStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage)
}

export function createEventId(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || `kegiatan-${Date.now()}`
}

function normalizeEvent(event, index) {
  const fallback = defaultEvents[index] || defaultEvents[0]
  const title = event.title || fallback.title
  const startTime = event.startTime || fallback.startTime || '09:00'
  const lateAfter = event.lateAfter || fallback.lateAfter || '09:15'

  return {
    id: event.id || createEventId(`${title}-${index + 1}`),
    title,
    category: event.category || fallback.category || 'Rapat',
    status: event.status || fallback.status || 'Aktif',
    date: event.date || fallback.date || 'Belum dijadwalkan',
    time: event.time || fallback.time || `${startTime} - 12:00 WIB`,
    startTime,
    lateAfter,
    place: event.place || fallback.place || '-',
    participantCount: Number(event.participantCount || event.value?.match(/\d+/)?.[0] || fallback.participantCount || 0),
    rule: event.rule || fallback.rule || 'QR pribadi anggota, toleransi terlambat 15 menit',
    participants: event.participants?.length ? event.participants : participantMembers.map((member) => member.nim),
  }
}

export function loadEvents() {
  if (!canUseStorage()) return defaultEvents

  try {
    const stored = window.localStorage.getItem(eventsKey)
    if (!stored) return defaultEvents

    const parsed = JSON.parse(stored)
    const normalized = Array.isArray(parsed) ? parsed.map(normalizeEvent) : defaultEvents
    const hasMainEvent = normalized.some((event) => event.id === 'rapat-pengurus-probumsil')
    const events = hasMainEvent ? normalized : [defaultEvents[0], ...normalized]

    saveEvents(events)
    return events
  } catch {
    return defaultEvents
  }
}

export function saveEvents(events) {
  if (canUseStorage()) window.localStorage.setItem(eventsKey, JSON.stringify(events))
}

export function readActiveSession() {
  if (!canUseStorage()) return null

  try {
    const stored = window.localStorage.getItem(sessionKey)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

export function writeActiveSession(session) {
  if (canUseStorage()) window.localStorage.setItem(sessionKey, JSON.stringify(session))
}

export function readAttendanceLogs(eventId) {
  if (!canUseStorage()) return []

  try {
    const stored = window.localStorage.getItem(`presenpro.logs.${eventId}`)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function writeAttendanceLogs(eventId, logs) {
  if (canUseStorage()) window.localStorage.setItem(`presenpro.logs.${eventId}`, JSON.stringify(logs))
}

export function normalizeQrValue(rawValue) {
  return rawValue.match(/\d{4,}/)?.[0] || ''
}

export function getMemberByNim(nim) {
  return participantMembers.find((member) => member.nim === nim)
}

export function isLateScan(lateAfter) {
  const [hour, minute] = lateAfter.split(':').map(Number)
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes() > hour * 60 + minute
}
