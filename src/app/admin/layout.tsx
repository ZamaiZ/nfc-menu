import { cookies } from 'next/headers'
import { ConsoleShell } from '@/components/console/console-shell'
import { getConsoleConfig } from '@/components/console/console-config'
import { getCurrentUser, getPlatformAdminStatus } from '@/server/dal/auth'
import { getCachedAdminRestaurants, getCachedPlatformInvites } from '@/server/dal/admin-console'
import { inviteState } from '@/domain/invite'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // This layout also wraps the sign-in page, so authorization stays in the
  // private pages and the existing access-denied decision remains unchanged.
  const user = await getCurrentUser()
  if (!user || (await getPlatformAdminStatus()) === 'denied') {
    return <div className="territorio-admin flex min-h-dvh flex-col">{children}</div>
  }

  const cookieStore = await cookies()
  const initialRail = cookieStore.get('tv_rail')?.value === 'pinned' ? 'pinned' : 'collapsed'
  const config = getConsoleConfig(user)
  const [invites, restaurants] = await Promise.all([getCachedPlatformInvites(), getCachedAdminRestaurants()])
  const pendingCount = invites.filter((invite) => inviteState(invite) === 'pending').length
  return (
    <div className="territorio-admin min-h-dvh">
      <ConsoleShell leaves={config.leaves} email={config.userLabel} initialRail={initialRail} counts={{ pendingInvites: pendingCount, restaurants: restaurants.length }}>
        {children}
      </ConsoleShell>
    </div>
  )
}
