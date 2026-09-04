import { Navigate, Outlet } from 'react-router-dom'
import useAuth from '../hooks/useAuth'
import { canAccessRoute } from '../lib/permissions'

export default function ProtectedRoute({ allowedRoleNames }) {
  const { authenticated, loading, user } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#faf9f7]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#efe5d4] border-t-[#ffc400]" />
      </div>
    )
  }

  if (!authenticated) return <Navigate to="/login" replace />
  if (!canAccessRoute(user, allowedRoleNames)) return <Navigate to="/" replace />

  return <Outlet />
}
