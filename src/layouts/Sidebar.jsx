import { NavLink } from 'react-router-dom'
import {
  Calendar,
  FileText,
  LayoutDashboard,
  LogOut,
  UserRound,
  UserCog,
  Users,
} from 'lucide-react'
import Swal from 'sweetalert2'
import useAuth from '../hooks/useAuth'
import { isAdminUser, isSuperAdminUser } from '../lib/permissions'

const navItems = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Anggota', path: '/anggota', icon: Users },
  { label: 'Kegiatan', path: '/kegiatan', icon: Calendar },
  { label: 'Laporan', path: '/laporan', icon: FileText },
  { label: 'Profil', path: '/profil', icon: UserRound },
  { label: 'Pengguna', path: '/pengguna', icon: UserCog, adminOnly: true },
]

export default function Sidebar({ open, onClose }) {
  const { logout, user } = useAuth()
  const visibleNavItems = navItems.filter((item) => {
    if (item.superAdminOnly) return isSuperAdminUser(user)
    if (item.adminOnly) return isAdminUser(user)
    return true
  })

  async function handleLogout() {
    const result = await Swal.fire({
      icon: 'question',
      title: 'Konfirmasi Logout',
      text: 'Apakah Anda yakin ingin keluar dari sistem?',
      showCancelButton: true,
      confirmButtonText: 'Ya, Logout',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#a1a1aa',
    })

    if (result.isConfirmed) {
      logout()
    }
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-48 flex-col bg-[#121212] text-zinc-300 transition-transform duration-200 lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-36 flex-col items-center justify-center border-b border-white/5 px-5">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-white p-1 shadow-sm">
            <img src="/logo.png" alt="PresenPRO Logo" className="h-full w-full object-contain" />
          </div>
          <h1 className="mt-3 text-xl font-bold text-white">
            Presen<span className="text-[#ffc400]">PRO</span>
          </h1>
        </div>

        <nav className="flex-1 overflow-y-auto no-scrollbar py-4">
          <ul className="space-y-1">
            {visibleNavItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === '/'}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 border-l-4 px-4 py-3 text-[13px] font-semibold transition-colors duration-200 ${
                      isActive
                        ? 'border-[#ffc400] bg-[#29250d] text-[#ffc400]'
                        : 'border-transparent text-zinc-400 hover:bg-white/[0.04] hover:text-white'
                    }`
                  }
                >
                  <item.icon size={17} strokeWidth={2} />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-5">
          <button className="flex w-full items-center gap-3 px-1 py-2 text-[13px] font-semibold text-zinc-400 transition-colors hover:text-white" onClick={handleLogout}>
            <LogOut size={17} />
            Logout
          </button>
        </div>
      </aside>
    </>
  )
}
