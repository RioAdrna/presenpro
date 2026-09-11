import { useEffect, useState } from 'react'
import Swal from 'sweetalert2'
import useAuth from '../hooks/useAuth'
import { usersApi } from '../lib/api'
import Modal from '../components/Modal'
import { PageSkeleton } from '../components/Skeleton'
import MemberQrCard from '../components/MemberQrCard'

export default function Profil() {
  const { user, updateUser } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [formName, setFormName] = useState('')
  const [formNim, setFormNim] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formFaculty, setFormFaculty] = useState('')
  const [formAngkatan, setFormAngkatan] = useState('')
  const [formAngkatanProbumsil, setFormAngkatanProbumsil] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formPasswordConfirm, setFormPasswordConfirm] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    usersApi.getProfile()
      .then(data => {
        if (!cancelled) {
          setProfile(data)
          setFormName(data.name || '')
          setFormNim(data.nim === '-' ? (data.nimP || '') : data.nim || '')
          setFormPhone(data.phone === '-' ? '' : data.phone || '')
          setFormFaculty(data.faculty === '-' ? '' : data.faculty || '')
          setFormAngkatan((data.tahunMasuk || data.angkatan) === '-' ? '' : data.tahunMasuk || data.angkatan || '')
          setFormAngkatanProbumsil(data.angkatanProbumsil === '-' ? '' : data.angkatanProbumsil || '')
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  async function handleSaveProfile(e) {
    e.preventDefault()
    if (!formName.trim()) {
      Swal.fire({ icon: 'warning', title: 'Data Tidak Lengkap', text: 'Nama lengkap wajib diisi.', confirmButtonColor: '#f6bd16' })
      return
    }
    setSaving(true)
    try {
      const data = await usersApi.updateProfile({ name: formName, nim: formNim, phone: formPhone, faculty: formFaculty, angkatan: formAngkatan, angkatanProbumsil: formAngkatanProbumsil })
      updateUser({ ...user, name: formName, nimP: formNim })
      setProfile(prev => ({
        ...prev,
        name: formName,
        nim: formNim || '-',
        phone: formPhone || '-',
        faculty: formFaculty || '-',
        tahunMasuk: formAngkatan || '-',
        angkatan: formAngkatan || '-',
        angkatanProbumsil: formAngkatanProbumsil || '-',
        profileComplete: Boolean(formPhone.trim() && formFaculty.trim() && formAngkatan.trim() && formAngkatanProbumsil.trim()),
      }))
      setEditModalOpen(false)
      Swal.fire({ icon: 'success', title: 'Berhasil', text: data.message, confirmButtonColor: '#10b981' })
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: error.message, confirmButtonColor: '#f6bd16' })
    } finally {
      setSaving(false)
    }
  }

  async function handleSavePassword(e) {
    e.preventDefault()
    if (!formPassword.trim()) {
      Swal.fire({ icon: 'warning', title: 'Password Kosong', text: 'Masukkan password baru.', confirmButtonColor: '#f6bd16' })
      return
    }
    if (!formPasswordConfirm.trim()) {
      Swal.fire({ icon: 'warning', title: 'Konfirmasi Password Kosong', text: 'Masukkan ulang password baru.', confirmButtonColor: '#f6bd16' })
      return
    }
    if (formPassword !== formPasswordConfirm) {
      Swal.fire({ icon: 'warning', title: 'Password Tidak Sama', text: 'Password baru dan konfirmasi password harus sama.', confirmButtonColor: '#f6bd16' })
      return
    }
    setSaving(true)
    try {
      await usersApi.updateProfile({ name: formName, nim: formNim, phone: formPhone, faculty: formFaculty, angkatan: formAngkatan, angkatanProbumsil: formAngkatanProbumsil, password: formPassword })
      setFormPassword('')
      setFormPasswordConfirm('')
      setPasswordModalOpen(false)
      Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Password berhasil diperbarui.', confirmButtonColor: '#10b981' })
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: error.message, confirmButtonColor: '#f6bd16' })
    } finally {
      setSaving(false)
    }
  }

  function closePasswordModal() {
    setPasswordModalOpen(false)
    setFormPassword('')
    setFormPasswordConfirm('')
  }

  if (loading) return <PageSkeleton />
  if (!profile) return <div className="p-10 text-center text-zinc-500 font-bold">Gagal memuat profil.</div>

  const initial = profile.name?.[0]?.toUpperCase() || 'U'
  const stats = profile.stats || { present: 0, permit: 0, absent: 0 }

  return (
    <div className="page-shell">
      <div className="flex flex-col items-start gap-6 lg:flex-row">
        <div className="w-full shrink-0 lg:w-[320px]">
          <div className="surface flex flex-col items-center rounded-lg p-8 text-center">
            <div className="flex h-[110px] w-[110px] items-center justify-center rounded-full bg-[#f2efec] text-[40px] font-black text-zinc-700">
              {initial}
            </div>
            <h1 className="mt-5 text-[24px] font-black text-zinc-900">{profile.name}</h1>
            <p className="mt-1 text-sm font-semibold text-zinc-500">NIM-P: {profile.nim}</p>

            <div className="mt-6 w-full space-y-3">
              <button onClick={() => setEditModalOpen(true)} className="w-full rounded-full bg-zinc-900 py-3.5 text-sm font-bold text-white transition hover:bg-zinc-800">
                Edit Profil
              </button>
              <button onClick={() => setPasswordModalOpen(true)} className="w-full rounded-full border border-[#e8dfd2] bg-[#f8f6f3] py-3.5 text-sm font-bold text-zinc-700 transition hover:bg-[#eee7dd]">
                Ubah Kata Sandi
              </button>
            </div>
          </div>

          <div className="mt-5 w-full">
            {profile.profileComplete ? <MemberQrCard profile={profile} /> : (
              <div className="rounded-lg border border-[#e8dfd2] bg-white p-5 text-sm font-semibold text-zinc-600">
                Lengkapi nomor telepon, fakultas, tahun masuk, dan angkatan PROBUMSIL di Edit Profil untuk menampilkan QR ABSENSI.
              </div>
            )}
          </div>
        </div>

        <div className="flex w-full flex-1 flex-col gap-6">
          <div className="surface rounded-lg p-6 sm:p-8">
            <h3 className="text-lg font-black text-zinc-800">Informasi Pribadi</h3>
            <hr className="my-5 border-[#eee7dd]" />
            <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">NIM-P</p>
                <p className="mt-1 text-sm font-bold text-zinc-900">{profile.nim}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Nomor Telepon</p>
                <p className="mt-1 text-sm font-bold text-zinc-900">{profile.phone}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Fakultas</p>
                <p className="mt-1 text-sm font-bold text-zinc-900">{profile.faculty}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Tahun Masuk</p>
                <p className="mt-1 text-sm font-bold text-zinc-900">{profile.tahunMasuk || profile.angkatan}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Angkatan PROBUMSIL</p>
                <p className="mt-1 text-sm font-bold text-zinc-900">{profile.angkatanProbumsil || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Tanggal Bergabung</p>
                <p className="mt-1 text-sm font-bold text-zinc-900">{profile.joined_at}</p>
              </div>
            </div>
          </div>

          <div className="surface rounded-lg p-6 sm:p-8">
            <h3 className="text-lg font-black text-zinc-800">Statistik Kehadiran</h3>
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="flex flex-col items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50/50 py-5 text-center">
                <p className="text-[28px] font-black leading-none text-zinc-900">{stats.present}</p>
                <p className="mt-2 text-[10px] font-black uppercase tracking-wider text-zinc-600">Hadir</p>
              </div>
              <div className="flex flex-col items-center justify-center rounded-lg border border-[#f3e1b1] bg-[#fffcf5] py-5 text-center">
                <p className="text-[28px] font-black leading-none text-zinc-900">{stats.permit}</p>
                <p className="mt-2 text-[10px] font-black uppercase tracking-wider text-zinc-600">Izin</p>
              </div>
              <div className="flex flex-col items-center justify-center rounded-lg border border-rose-100 bg-rose-50/50 py-5 text-center">
                <p className="text-[28px] font-black leading-none text-zinc-900">{stats.absent}</p>
                <p className="mt-2 text-[10px] font-black uppercase tracking-wider text-zinc-600">Alpa</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal open={editModalOpen} title="Edit Profil" onClose={() => setEditModalOpen(false)}>
        <form className="grid gap-4" onSubmit={handleSaveProfile}>
          <label className="space-y-2">
            <span className="text-xs font-black uppercase text-zinc-600">Nama Lengkap</span>
            <input type="text" value={formName} onChange={e => setFormName(e.target.value)} className="h-11 w-full rounded-lg border border-[#e8dfd2] px-4 text-sm font-semibold outline-none focus:border-[#d8b149]" />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-black uppercase text-zinc-600">NIM-P</span>
          <input type="text" value={formNim} onChange={e => setFormNim(e.target.value)} placeholder="XXXXXXX-XXXX.XXXX" className="h-11 w-full rounded-lg border border-[#e8dfd2] px-4 text-sm font-semibold outline-none focus:border-[#d8b149]" />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-black uppercase text-zinc-600">Nomor Telepon</span>
            <input type="tel" value={formPhone} onChange={e => setFormPhone(e.target.value)} className="h-11 w-full rounded-lg border border-[#e8dfd2] px-4 text-sm font-semibold outline-none focus:border-[#d8b149]" />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-black uppercase text-zinc-600">Fakultas</span>
            <input type="text" value={formFaculty} onChange={e => setFormFaculty(e.target.value)} className="h-11 w-full rounded-lg border border-[#e8dfd2] px-4 text-sm font-semibold outline-none focus:border-[#d8b149]" />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-black uppercase text-zinc-600">Tahun Masuk</span>
            <input type="number" min="2000" max="2100" value={formAngkatan} onChange={e => setFormAngkatan(e.target.value)} className="h-11 w-full rounded-lg border border-[#e8dfd2] px-4 text-sm font-semibold outline-none focus:border-[#d8b149]" />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-black uppercase text-zinc-600">Angkatan PROBUMSIL</span>
            <input type="text" value={formAngkatanProbumsil} onChange={e => setFormAngkatanProbumsil(e.target.value)} placeholder="Contoh: XVIII" className="h-11 w-full rounded-lg border border-[#e8dfd2] px-4 text-sm font-semibold outline-none focus:border-[#d8b149]" />
          </label>
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" className="button-soft" onClick={() => setEditModalOpen(false)} disabled={saving}>Batal</button>
            <button type="submit" className="button-primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={passwordModalOpen} title="Ubah Kata Sandi" onClose={closePasswordModal}>
        <form className="grid gap-4" onSubmit={handleSavePassword}>
          <label className="space-y-2">
            <span className="text-xs font-black uppercase text-zinc-600">Password Baru</span>
            <input type="password" value={formPassword} onChange={e => setFormPassword(e.target.value)} placeholder="Masukkan password baru" className="h-11 w-full rounded-lg border border-[#e8dfd2] px-4 text-sm font-semibold outline-none focus:border-[#d8b149]" />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-black uppercase text-zinc-600">Konfirmasi Password Baru</span>
            <input type="password" value={formPasswordConfirm} onChange={e => setFormPasswordConfirm(e.target.value)} placeholder="Masukkan ulang password baru" className="h-11 w-full rounded-lg border border-[#e8dfd2] px-4 text-sm font-semibold outline-none focus:border-[#d8b149]" />
          </label>
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" className="button-soft" onClick={closePasswordModal} disabled={saving}>Batal</button>
            <button type="submit" className="button-primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Ubah Password'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
