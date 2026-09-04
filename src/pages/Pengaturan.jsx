import { useMemo, useState } from 'react'
import { Bell, Clock, Save, Settings, Shield } from 'lucide-react'
import SelectMenu from '../components/SelectMenu'
import { PageSkeleton } from '../components/Skeleton'
import useSkeletonLoading from '../hooks/useSkeletonLoading'

export default function Pengaturan() {
  const loading = useSkeletonLoading()
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    organization: 'PROBUMSIL',
    timezone: 'Asia/Jakarta',
    idFormat: 'NIM-P / ID',
    qrLifetime: '10 detik',
    startTime: '08:00',
    lateLimit: '15 menit',
    notification: 'Aktif',
    verification: 'Wajib',
  })

  const settings = useMemo(
    () => [
      { label: 'Jam mulai absensi', value: form.startTime, icon: Clock },
      { label: 'Batas keterlambatan', value: form.lateLimit, icon: Clock },
      { label: 'Notifikasi admin', value: form.notification, icon: Bell },
      { label: 'Verifikasi QR', value: form.verification, icon: Shield },
    ],
    [form],
  )

  function saveSettings(event) {
    event.preventDefault()
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2200)
  }

  if (loading) return <PageSkeleton cards={4} />

  return (
    <form className="page-shell space-y-6" onSubmit={saveSettings}>
      <section className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <h1 className="text-[24px] font-black text-zinc-900">Pengaturan Sistem</h1>
          <p className="mt-1 text-sm font-medium text-zinc-600">Atur preferensi presensi dan keamanan admin.</p>
          {saved && <p className="mt-2 text-xs font-black text-[#9f7500]">Pengaturan berhasil disimpan.</p>}
        </div>
        <button className="button-primary w-full sm:w-auto" type="submit">
          <Save size={15} />
          Simpan Perubahan
        </button>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {settings.map((item) => {
          const Icon = item.icon
          return (
            <article key={item.label} className="surface card-motion p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-zinc-600">{item.label}</p>
                  <p className="mt-4 text-xl font-black text-zinc-900">{item.value}</p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fff4cf] text-[#9f7500]">
                  <Icon size={16} />
                </div>
              </div>
            </article>
          )
        })}
      </section>

      <section className="surface">
        <div className="flex items-center gap-2 border-b border-[#eee7dd] px-5 py-4">
          <Settings size={18} className="text-[#9f7500]" />
          <h2 className="text-base font-black text-zinc-900">Preferensi Organisasi</h2>
        </div>
        <div className="grid gap-5 p-5 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs font-black uppercase text-zinc-600">Nama Organisasi</span>
            <input value={form.organization} onChange={(event) => setForm({ ...form, organization: event.target.value })} className="h-11 w-full rounded-lg border border-[#e8dfd2] px-4 text-sm font-semibold text-zinc-700 outline-none focus:border-[#d8b149]" />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-black uppercase text-zinc-600">Zona Waktu</span>
            <SelectMenu
              value={form.timezone}
              options={['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura']}
              onChange={(value) => setForm({ ...form, timezone: value })}
              buttonClassName="h-11 rounded-lg text-sm"
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-black uppercase text-zinc-600">Format ID Anggota</span>
            <input value={form.idFormat} onChange={(event) => setForm({ ...form, idFormat: event.target.value })} className="h-11 w-full rounded-lg border border-[#e8dfd2] px-4 text-sm font-semibold text-zinc-700 outline-none focus:border-[#d8b149]" />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-black uppercase text-zinc-600">Masa Berlaku QR</span>
            <SelectMenu
              value={form.qrLifetime}
              options={['10 detik', '30 detik', '60 detik']}
              onChange={(value) => setForm({ ...form, qrLifetime: value })}
              buttonClassName="h-11 rounded-lg text-sm"
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-black uppercase text-zinc-600">Jam Mulai</span>
            <input type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} className="h-11 w-full rounded-lg border border-[#e8dfd2] px-4 text-sm font-semibold text-zinc-700 outline-none focus:border-[#d8b149]" />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-black uppercase text-zinc-600">Batas Terlambat</span>
            <SelectMenu
              value={form.lateLimit}
              options={['10 menit', '15 menit', '30 menit']}
              onChange={(value) => setForm({ ...form, lateLimit: value })}
              buttonClassName="h-11 rounded-lg text-sm"
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-black uppercase text-zinc-600">Notifikasi</span>
            <SelectMenu
              value={form.notification}
              options={['Aktif', 'Nonaktif']}
              onChange={(value) => setForm({ ...form, notification: value })}
              buttonClassName="h-11 rounded-lg text-sm"
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-black uppercase text-zinc-600">Verifikasi QR</span>
            <SelectMenu
              value={form.verification}
              options={['Wajib', 'Opsional']}
              onChange={(value) => setForm({ ...form, verification: value })}
              buttonClassName="h-11 rounded-lg text-sm"
            />
          </label>
        </div>
      </section>
    </form>
  )
}
