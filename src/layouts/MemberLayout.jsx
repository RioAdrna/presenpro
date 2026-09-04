import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { CalendarDays, Home, LogOut, UserRound } from 'lucide-react'
import Swal from 'sweetalert2'
import useAuth from '../hooks/useAuth'

const memberNavItems = [
  { label: 'Beranda', path: '/', icon: Home },
  { label: 'Kegiatan', path: '/kegiatan', icon: CalendarDays },
  { label: 'Profil', path: '/profil', icon: UserRound },
]

export default function MemberLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    const result = await Swal.fire({
      icon: 'question',
      title: 'Keluar Akun?',
      text: 'Sesi Anda akan ditutup dari perangkat ini.',
      showCancelButton: true,
      confirmButtonText: 'Keluar',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#a1a1aa',
    })

    if (result.isConfirmed) {
      logout()
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-[#faf9f7] pb-[92px]">
      <header className="sticky top-0 z-30 border-b border-[#e8dfd2] bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-[980px] items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-1 shadow-sm ring-1 ring-[#e8dfd2]">
              <img src="/logo.png" alt="PresenPRO" className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-zinc-900">{user?.name || 'Anggota'}</p>
            </div>
          </div>
          <button
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#e8dfd2] bg-white text-zinc-600 hover:bg-red-50 hover:text-red-600"
            onClick={handleLogout}
            aria-label="Logout"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <main className="px-4 py-5 sm:px-8 sm:py-7">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e8dfd2] bg-white/95 px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2 shadow-[0_-12px_30px_rgba(34,25,6,0.08)] backdrop-blur">
        <div className="mx-auto grid max-w-[520px] grid-cols-3 gap-2">
          {memberNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-black ${
                  isActive
                    ? 'bg-zinc-950 text-[#ffc400]'
                    : 'text-zinc-500 hover:bg-[#fff7dc] hover:text-zinc-900'
                }`
              }
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
