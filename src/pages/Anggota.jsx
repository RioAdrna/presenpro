import { useEffect, useMemo, useState } from 'react'
import { Eye, Search } from 'lucide-react'
import Modal from '../components/Modal'
import { PageSkeleton } from '../components/Skeleton'
import useSkeletonLoading from '../hooks/useSkeletonLoading'
import { membersApi } from '../lib/api'

const statusStyles = {
  Aktif: 'bg-[#fff4cf] text-[#9f7500] border-[#f3d58c]',
  Nonaktif: 'bg-zinc-100 text-zinc-500 border-zinc-200',
}

function initials(name) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export default function Anggota() {
  const isInitialLoading = useSkeletonLoading()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [selectedMember, setSelectedMember] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    membersApi.list()
      .then(res => {
        if (!cancelled) setMembers(res.members || [])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const filteredMembers = useMemo(
    () =>
      members.filter((member) => {
        const matchesQuery = `${member.name} ${member.nim}`.toLowerCase().includes(query.toLowerCase())
        return matchesQuery
      }),
    [members, query],
  )

  if (isInitialLoading) return <PageSkeleton table />

  return (
    <div className="page-shell space-y-6">
      <section className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <h1 className="text-[28px] font-black leading-tight text-zinc-900">Anggota PROBUMSIL</h1>
          <p className="mt-1 text-sm font-medium text-zinc-600">Daftar seluruh anggota yang terdaftar dan disetujui dalam sistem.</p>
        </div>
      </section>

      <section className="surface rounded-[26px] p-3 md:rounded-full">
        <div className="grid grid-cols-1">
          <label className="relative block">
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari nama atau NIM-P..."
              className="h-9 w-full rounded-full border border-[#e8dfd2] bg-white pl-10 pr-4 text-xs font-medium outline-none placeholder:text-zinc-400 focus:border-[#d8b149]"
            />
          </label>
        </div>
      </section>

      <section className="surface overflow-hidden rounded-[28px]">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm font-bold text-zinc-400">Memuat anggota...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left">
                <thead className="bg-[#f2efec] text-[11px] font-black uppercase text-zinc-600">
                  <tr>
                    <th className="px-6 py-4">Profil</th>
                    <th className="px-5 py-4">Nama & NIM-P</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Kehadiran</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eee7dd]">
                  {filteredMembers.map((member) => (
                    <tr key={member.id} className="text-sm transition hover:bg-[#fffaf0]">
                      <td className="px-6 py-4">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e8dfd2] text-xs font-black text-[#8b6800]">
                          {initials(member.name)}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-zinc-700">{member.name}</p>
                        <p className="mt-0.5 text-xs font-medium text-zinc-500">{member.nim}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusStyles[member.status] || statusStyles['Nonaktif']}`}>
                          {member.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="w-8 text-xs font-semibold text-zinc-600">{member.attendance}%</span>
                          <div className="h-1.5 w-14 overflow-hidden rounded-full bg-zinc-200">
                            <div className="h-full rounded-full bg-[#b58b00]" style={{ width: `${member.attendance}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-1.5 text-zinc-400">
                          <button className="rounded-full p-1 hover:bg-zinc-100 hover:text-zinc-700" onClick={() => setSelectedMember(member)} aria-label={`Lihat ${member.name}`} title="Detail">
                            <Eye size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredMembers.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-5 py-10 text-center text-sm font-semibold text-zinc-500">
                        Tidak ada anggota sesuai filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="border-t border-[#eee7dd] px-5 py-3 text-[11px] font-semibold text-zinc-400 sm:hidden">Geser tabel ke samping untuk melihat semua kolom.</p>
            <div className="flex items-center justify-between px-5 py-4 text-[11px] font-semibold text-zinc-500 sm:px-7">
              <p>Menampilkan {filteredMembers.length} dari {members.length} anggota</p>
            </div>
          </>
        )}
      </section>

      {/* Modal Detail Anggota */}
      <Modal open={Boolean(selectedMember)} title="Detail Anggota" onClose={() => setSelectedMember(null)}>
        {selectedMember && (
          <div className="space-y-3 text-sm font-semibold text-zinc-600">
            <div className="flex items-center gap-3 rounded-xl bg-[#f8f6f3] px-4 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e8dfd2] text-sm font-black text-[#8b6800]">
                {initials(selectedMember.name)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-black text-zinc-900">{selectedMember.name}</p>
                <p className="truncate text-xs text-zinc-500">{selectedMember.nim}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#f8f6f3] px-4 py-3">
                <p className="text-[10px] font-black uppercase text-zinc-500">Status</p>
                <p className={`mt-1 text-sm font-black ${selectedMember.status === 'Aktif' ? 'text-emerald-600' : 'text-zinc-500'}`}>{selectedMember.status}</p>
              </div>
              <div className="rounded-xl bg-[#f8f6f3] px-4 py-3">
                <p className="text-[10px] font-black uppercase text-zinc-500">Kehadiran</p>
                <p className="mt-1 text-sm font-black text-zinc-800">{selectedMember.attendance}%</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
