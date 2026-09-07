import { useEffect, useMemo, useState } from 'react'
import { Eye, Plus, Search, ShieldCheck, Trash2, ToggleLeft, ToggleRight, CheckCircle2, XCircle } from 'lucide-react'
import Swal from 'sweetalert2'
import Modal from '../components/Modal'
import SelectMenu from '../components/SelectMenu'
import TablePagination from '../components/TablePagination'
import { PageSkeleton } from '../components/Skeleton'
import useSkeletonLoading from '../hooks/useSkeletonLoading'
import useAuth from '../hooks/useAuth'
import { usersApi } from '../lib/api'

export default function Pengguna() {
  const loading = useSkeletonLoading()
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [query, setQuery] = useState('')
  const [role, setRole] = useState('Semua Role')
  const [status, setStatus] = useState('Semua Status')
  const [approval, setApproval] = useState('Semua Approval')
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [page, setPage] = useState(1)
  const pageSize = 10

  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'super_admin' || user?.roleName === 'super_admin' || user?.roleName === 'Ketua Bidang'

  // Add user form state
  const [formName, setFormName] = useState('')
  const [formNimP, setFormNimP] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Edit user role state
  const [editRole, setEditRole] = useState('')
  const [updatingRole, setUpdatingRole] = useState(false)

  // Fetch users on mount
  useEffect(() => {
    let cancelled = false
    setLoadingUsers(true)
    usersApi.list()
      .then(data => { if (!cancelled) setUsers(data.users || []) })
      .catch(() => { if (!cancelled) setUsers([]) })
      .finally(() => { if (!cancelled) setLoadingUsers(false) })
    return () => { cancelled = true }
  }, [])

  const filteredUsers = useMemo(
    () =>
      users.filter(u => {
        const matchesQuery = `${u.name} ${u.nimP || u.nim}`.toLowerCase().includes(query.toLowerCase())
        const matchesRole = role === 'Semua Role' || u.role === role
        const matchesStatus = status === 'Semua Status' || u.status === status
        const matchesApproval = approval === 'Semua Approval' || u.approved === approval
        return matchesQuery && matchesRole && matchesStatus && matchesApproval
      }),
    [users, query, role, status, approval],
  )

  useEffect(() => {
    setPage(1)
  }, [query, role, status, approval])

  const paginatedUsers = useMemo(
    () => filteredUsers.slice((page - 1) * pageSize, page * pageSize),
    [filteredUsers, page],
  )

  async function handleSubmit(e) {
    e.preventDefault()
    if (!formName.trim() || !formNimP.trim() || !formPassword.trim()) {
      Swal.fire({ icon: 'warning', title: 'Data Tidak Lengkap', text: 'Nama, NIM-P, dan Password wajib diisi.', confirmButtonColor: '#f6bd16' })
      return
    }

    setSubmitting(true)
    try {
      const data = await usersApi.create({ name: formName, nimP: formNimP, password: formPassword, role: 'anggota' })
      setUsers(data.users || [])
      Swal.fire({ icon: 'success', title: 'Berhasil', text: data.message || 'Pengguna berhasil ditambahkan.', confirmButtonColor: '#10b981' })
      closeModal()
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: error.message, confirmButtonColor: '#f6bd16' })
    } finally {
      setSubmitting(false)
    }
  }

  function closeModal() {
    setModalOpen(false)
    setFormName('')
    setFormNimP('')
    setFormPassword('')
    setSelectedUser(null)
  }

  function openDetailModal(u) {
    setSelectedUser(u)
    setEditRole(u.roleName)
  }

  async function handleDelete(targetUser) {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Hapus Pengguna?',
      text: `Akun "${targetUser.name}" akan dihapus permanen.`,
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#a1a1aa',
    })

    if (!result.isConfirmed) return

    try {
      await usersApi.remove(targetUser.id)
      setUsers(prev => prev.filter(u => u.id !== targetUser.id))
      Swal.fire({ icon: 'success', title: 'Dihapus', text: 'Pengguna berhasil dihapus.', confirmButtonColor: '#10b981' })
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: error.message, confirmButtonColor: '#f6bd16' })
    }
  }

  async function handleToggleStatus(targetUser) {
    try {
      const data = await usersApi.toggleStatus(targetUser.id)
      setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, status: data.newStatus } : u))
      Swal.fire({ icon: 'success', title: 'Berhasil', text: data.message, confirmButtonColor: '#10b981', timer: 1500, showConfirmButton: false })
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: error.message, confirmButtonColor: '#f6bd16' })
    }
  }

  async function handleApproval(targetUser, action) {
    const result = await Swal.fire({
      icon: 'question',
      title: action === 'approved' ? 'Setujui Pengguna?' : 'Tolak Pengguna?',
      text: `Apakah Anda yakin ingin ${action === 'approved' ? 'menyetujui' : 'menolak'} "${targetUser.name}"?`,
      showCancelButton: true,
      confirmButtonText: 'Ya',
      cancelButtonText: 'Batal',
      confirmButtonColor: action === 'approved' ? '#10b981' : '#ef4444',
      cancelButtonColor: '#a1a1aa',
    })

    if (!result.isConfirmed) return

    try {
      const data = await usersApi.toggleApproval(targetUser.id, action)
      setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, approved: data.newApproval, nim: data.member?.nim || u.nim } : u))
      Swal.fire({ icon: 'success', title: 'Berhasil', text: data.message, confirmButtonColor: '#10b981', timer: 1500, showConfirmButton: false })
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: error.message, confirmButtonColor: '#f6bd16' })
    }
  }

  async function handleUpdateRole() {
    if (editRole === selectedUser.roleName) return
    setUpdatingRole(true)
    try {
      const data = await usersApi.changeRole(selectedUser.id, editRole)
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, roleName: editRole, role: data.newRole } : u))
      setSelectedUser(prev => ({ ...prev, roleName: editRole, role: data.newRole }))
      Swal.fire({ icon: 'success', title: 'Berhasil', text: data.message, confirmButtonColor: '#10b981', timer: 1500, showConfirmButton: false })
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: error.message, confirmButtonColor: '#f6bd16' })
    } finally {
      setUpdatingRole(false)
    }
  }

  if (loading) return <PageSkeleton table />

  return (
    <div className="page-shell space-y-6">
      <section className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <h1 className="text-[24px] font-black text-zinc-900">Manajemen Pengguna</h1>
          <p className="mt-1 text-sm font-medium text-zinc-600">Kelola akses, role, approval, dan akun admin sistem.</p>
        </div>
        <button className="button-primary w-full sm:w-auto" onClick={() => setModalOpen(true)}>
          <Plus size={15} />
          Tambah Pengguna
        </button>
      </section>

      <section className="surface rounded-[26px] p-3 md:rounded-full">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_140px_140px_140px]">
          <label className="relative block">
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari nama atau NIM-P..."
              className="h-9 w-full rounded-full border border-[#e8dfd2] bg-white pl-10 pr-4 text-xs font-medium outline-none placeholder:text-zinc-400 focus:border-[#d8b149]"
            />
          </label>
          <SelectMenu value={role} options={['Semua Role', 'Ketua Bidang', 'Anggota Sekretaris', 'Personel']} onChange={setRole} buttonClassName="h-9" />
          <SelectMenu value={status} options={['Semua Status', 'Aktif', 'Nonaktif']} onChange={setStatus} buttonClassName="h-9" />
          <SelectMenu value={approval} options={['Semua Approval', 'Approved', 'Pending', 'Rejected']} onChange={setApproval} buttonClassName="h-9" />
        </div>
      </section>

      <section className="surface overflow-hidden rounded-[28px]">
        {loadingUsers ? (
          <div className="flex items-center justify-center py-16 text-sm font-bold text-zinc-400">Memuat data...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left">
                <thead className="bg-[#f2efec] text-[11px] font-black uppercase text-zinc-600">
                  <tr>
                    <th className="px-6 py-4">Pengguna</th>
                    <th className="px-5 py-4">Role</th>
                    <th className="px-5 py-4">Approval</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eee7dd]">
                  {paginatedUsers.map((u) => (
                    <tr key={u.id} className="text-sm transition hover:bg-[#fffaf0]">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eadfcb] text-xs font-black text-[#8b6800]">
                            {u.initial}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-zinc-700">{u.name}</p>
                            <p className="truncate text-[11px] font-medium text-zinc-500">{u.nimP || u.nim}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-[#e8dfd2] bg-[#f8f6f3] px-2.5 py-1 text-[10px] font-bold text-zinc-600">
                          <ShieldCheck size={12} className={u.roleName === 'super_admin' ? 'text-[#f59e0b]' : 'text-zinc-400'} />
                          {u.role}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                          u.approved === 'Approved'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                            : u.approved === 'Rejected'
                            ? 'border-red-200 bg-red-50 text-red-600'
                            : 'border-orange-200 bg-orange-50 text-orange-600'
                        }`}>
                          {u.approved}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                          u.status === 'Aktif'
                            ? 'border-[#f3d58c] bg-[#fff4cf] text-[#9f7500]'
                            : 'border-zinc-200 bg-zinc-100 text-zinc-500'
                        }`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2 text-zinc-400">
                          {u.approved === 'Pending' && (
                            <>
                              <button className="rounded-full p-1 hover:bg-emerald-50 hover:text-emerald-600" onClick={() => handleApproval(u, 'approved')} aria-label={`Setujui ${u.name}`}>
                                <CheckCircle2 size={15} />
                              </button>
                              <button className="rounded-full p-1 hover:bg-red-50 hover:text-red-600" onClick={() => handleApproval(u, 'rejected')} aria-label={`Tolak ${u.name}`}>
                                <XCircle size={15} />
                              </button>
                            </>
                          )}
                          <button className="rounded-full p-1 hover:bg-zinc-100 hover:text-zinc-700" onClick={() => openDetailModal(u)} aria-label={`Lihat ${u.name}`}>
                            <Eye size={15} />
                          </button>
                          <button
                            className="rounded-full p-1 hover:bg-[#fff4cf] hover:text-[#9f7500]"
                            onClick={() => handleToggleStatus(u)}
                            aria-label={`Toggle status ${u.name}`}
                          >
                            {u.status === 'Aktif' ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                          </button>
                          <button className="rounded-full p-1 hover:bg-red-50 hover:text-red-600" onClick={() => handleDelete(u)} aria-label={`Hapus ${u.name}`}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-5 py-10 text-center text-sm font-semibold text-zinc-500">
                        Tidak ada pengguna sesuai filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <TablePagination page={page} total={filteredUsers.length} pageSize={pageSize} onPageChange={setPage} itemLabel="pengguna" />
          </>
        )}
      </section>

      {/* Add User Modal */}
      <Modal open={modalOpen} title="Tambah Pengguna" description="Masukkan data pengguna baru." onClose={closeModal}>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <label className="space-y-2">
            <span className="text-xs font-black uppercase text-zinc-600">Nama Lengkap</span>
            <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Nama pengguna" className="h-11 w-full rounded-lg border border-[#e8dfd2] px-4 text-sm font-semibold outline-none focus:border-[#d8b149]" />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-black uppercase text-zinc-600">NIM-P</span>
            <input type="text" value={formNimP} onChange={(e) => setFormNimP(e.target.value)} placeholder="2406411-1031.XVIII" className="h-11 w-full rounded-lg border border-[#e8dfd2] px-4 text-sm font-semibold outline-none focus:border-[#d8b149]" />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-black uppercase text-zinc-600">Password</span>
            <input type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} placeholder="Password" className="h-11 w-full rounded-lg border border-[#e8dfd2] px-4 text-sm font-semibold outline-none focus:border-[#d8b149]" />
          </label>

          <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className="button-soft w-full sm:w-auto" onClick={closeModal} disabled={submitting}>Batal</button>
            <button type="submit" className="button-primary w-full sm:w-auto" disabled={submitting}>
              {submitting ? 'Menyimpan...' : 'Simpan Pengguna'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail User Modal */}
      <Modal open={Boolean(selectedUser)} title="Detail Pengguna" onClose={() => setSelectedUser(null)}>
        {selectedUser && (
          <div className="space-y-4 text-sm font-semibold text-zinc-600">
            <div className="flex items-center gap-3 rounded-xl bg-[#f8f6f3] px-4 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fff4cf] text-sm font-black text-[#9f7500]">
                {selectedUser.initial || <ShieldCheck size={18} />}
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-black text-zinc-900">{selectedUser.name}</p>
                <p className="truncate text-xs text-zinc-500">{selectedUser.nimP || selectedUser.nim}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#f8f6f3] px-4 py-3">
                <p className="text-[10px] font-black uppercase text-zinc-500">Status</p>
                <p className={`mt-1 text-sm font-black ${selectedUser.status === 'Aktif' ? 'text-emerald-600' : 'text-zinc-500'}`}>{selectedUser.status}</p>
              </div>
              <div className="rounded-xl bg-[#f8f6f3] px-4 py-3">
                <p className="text-[10px] font-black uppercase text-zinc-500">Approval</p>
                <p className={`mt-1 text-sm font-black ${selectedUser.approved === 'Approved' ? 'text-emerald-600' : selectedUser.approved === 'Rejected' ? 'text-red-600' : 'text-orange-600'}`}>{selectedUser.approved}</p>
              </div>
            </div>

            {isSuperAdmin ? (
              <div className="rounded-xl bg-white border border-[#e8dfd2] p-4">
                <p className="mb-3 text-[10px] font-black uppercase text-zinc-500">Ubah Role Pengguna</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <SelectMenu
                    value={editRole === 'super_admin' ? 'Ketua Bidang' : editRole === 'admin' ? 'Anggota Sekretaris' : 'Personel'}
                    options={['Anggota Sekretaris', 'Ketua Bidang', 'Personel']}
                    onChange={(v) => setEditRole(v === 'Ketua Bidang' ? 'super_admin' : v === 'Anggota Sekretaris' ? 'admin' : 'anggota')}
                    buttonClassName="h-10 rounded-lg text-sm flex-1 border border-[#e8dfd2]"
                  />
                  <button 
                    className="button-primary h-10 w-full sm:w-auto px-4" 
                    onClick={handleUpdateRole} 
                    disabled={updatingRole || editRole === selectedUser.roleName}
                  >
                    {updatingRole ? 'Menyimpan...' : 'Update'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-[#f8f6f3] px-4 py-3">
                <p className="text-[10px] font-black uppercase text-zinc-500">Role</p>
                <p className="mt-1 text-sm font-black text-zinc-800">{selectedUser.role}</p>
              </div>
            )}
            
            {isSuperAdmin && (
               <div className="flex justify-end pt-2">
                 <button 
                   className="text-xs font-bold text-red-600 hover:underline"
                   onClick={() => {
                     Swal.fire({
                       icon: 'question',
                       title: 'Reset Password',
                       text: `Buat password sementara baru untuk ${selectedUser.name}?`,
                       showCancelButton: true,
                       confirmButtonText: 'Ya, Reset',
                       cancelButtonText: 'Batal',
                       confirmButtonColor: '#ef4444'
                     }).then((res) => {
                       if (res.isConfirmed) {
                         usersApi.resetPassword(selectedUser.id)
                           .then(d => Swal.fire({
                             icon: 'success',
                             title: 'Password Baru',
                             html: `<p style="margin-bottom:10px">${d.message}</p><code style="display:block;padding:10px;border-radius:8px;background:#f4f4f5;font-size:16px;font-weight:800;color:#18181b">${d.temporaryPassword}</code>`,
                             confirmButtonText: 'OK',
                             confirmButtonColor: '#10b981',
                           }))
                           .catch(e => Swal.fire('Gagal', e.message, 'error'))
                       }
                     })
                   }}
                 >
                   Reset Password
                 </button>
               </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
