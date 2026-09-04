import { Menu, Search } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Swal from 'sweetalert2'
import useAuth from '../hooks/useAuth'

export default function Topbar({ onMenu }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [profileOpen, setProfileOpen] = useState(false)

  async function handleLogout() {
    setProfileOpen(false)
    const result = await Swal.fire({
      icon: 'question',
      title: 'Konfirmasi Logout',
      text: 'Apakah Anda yakin ingin keluar dari sistem?',
      showCancelButton: true,
      confirmButtonText: 'Ya, Logout',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#a1a1aa'
    })
    
    if (result.isConfirmed) {
      logout()
    }
  }

  return (
    <header className="flex h-12 items-center justify-between gap-2 border-b border-[#e8dfd2] bg-white px-3 sm:px-7">
      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
        <button
          className="rounded-md p-1.5 text-zinc-600 transition-colors hover:bg-zinc-100 lg:hidden"
          onClick={onMenu}
          aria-label="Buka menu"
        >
          <Menu size={21} />
        </button>

        <div className="relative min-w-0">
          <Search size={15} className="absolute left-0 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search..."
            className="w-[118px] bg-transparent py-2 pl-7 pr-2 text-xs font-medium text-zinc-700 outline-none placeholder:text-zinc-400 sm:w-72 sm:pr-3"
          />
        </div>
        {query && (
          <button className="hidden rounded-full bg-[#fff4cf] px-3 py-1 text-[11px] font-black text-[#9f7500] sm:block" onClick={() => setQuery('')}>
            Reset
          </button>
        )}
      </div>

      <div className="relative flex shrink-0 items-center gap-2 sm:gap-4">
        <button className="flex items-center gap-2.5 rounded-full pr-2 hover:bg-[#fff7dc]" onClick={() => setProfileOpen((value) => !value)}>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#eadfcb] text-[11px] font-black text-[#8b6800]">
            {user?.name?.[0] || 'A'}
          </div>
          <p className="hidden text-xs font-bold text-zinc-700 sm:block">{user?.name?.split(' ')[0] || 'Profile'}</p>
        </button>
        {profileOpen && (
          <div className="absolute right-0 top-9 z-50 w-48 rounded-lg border border-[#e8dfd2] bg-white p-3 text-xs shadow-[0_16px_36px_rgba(34,25,6,0.12)]">
            <p className="font-black text-zinc-900">{user?.name || 'Administrator'}</p>
            <p className="mt-1 font-semibold text-zinc-500">{user?.role || 'Role admin aktif'}</p>
            <div className="mt-3 flex flex-col gap-2">
              <button 
                className="w-full rounded-md bg-zinc-100 px-3 py-2 text-[11px] font-bold text-zinc-700 hover:bg-zinc-200" 
                onClick={() => {
                  setProfileOpen(false)
                  navigate('/profil')
                }}
              >
                Profil Saya
              </button>
              <button className="w-full rounded-full bg-zinc-950 px-3 py-2 text-[11px] font-black text-white hover:bg-zinc-800" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
