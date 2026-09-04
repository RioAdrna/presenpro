import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom'
import useAuth from './hooks/useAuth'
import Layout from './layouts/Layout'
import MemberLayout from './layouts/MemberLayout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import MemberDashboard from './pages/MemberDashboard'
import Anggota from './pages/Anggota'

import Kegiatan from './pages/Kegiatan'
import MemberKegiatan from './pages/MemberKegiatan'
import KegiatanDetail from './pages/KegiatanDetail'
import MemberKegiatanDetail from './pages/MemberKegiatanDetail'
import Laporan from './pages/Laporan'
import Pengguna from './pages/Pengguna'
import Profil from './pages/Profil'

import { adminRoleNames, isAdminUser } from './lib/permissions'

function AppShell() {
  const { user } = useAuth()
  return isAdminUser(user) ? <Layout /> : <MemberLayout />
}

function RolePage({ admin: AdminPage, member: MemberPage }) {
  const { user } = useAuth()
  return isAdminUser(user) ? <AdminPage /> : <MemberPage />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<AppShell />}>
            <Route index element={<RolePage admin={Dashboard} member={MemberDashboard} />} />
            <Route path="kegiatan" element={<RolePage admin={Kegiatan} member={MemberKegiatan} />} />
            <Route path="kegiatan/:eventId" element={<RolePage admin={KegiatanDetail} member={MemberKegiatanDetail} />} />
            <Route path="absensi" element={<Navigate to="/kegiatan" replace />} />
            <Route path="profil" element={<Profil />} />
            
            <Route element={<ProtectedRoute allowedRoleNames={adminRoleNames} />}>
              <Route path="anggota" element={<Anggota />} />
              <Route path="laporan" element={<Laporan />} />
              <Route path="pengguna" element={<Pengguna />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
