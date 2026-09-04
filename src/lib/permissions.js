export const superAdminRoleNames = ['super_admin']
export const adminRoleNames = ['super_admin', 'admin']
export const limitedRoleNames = ['anggota']

export function normalizeRoleName(user) {
  return (user?.roleName || user?.role || '')
    .toLowerCase()
    .replace(/\s+/g, '_')
}

export function isAdminUser(user) {
  return adminRoleNames.includes(normalizeRoleName(user))
}

export function isSuperAdminUser(user) {
  return superAdminRoleNames.includes(normalizeRoleName(user))
}

export function canAccessRoute(user, allowedRoleNames) {
  if (!allowedRoleNames) return true
  return allowedRoleNames.includes(normalizeRoleName(user))
}
