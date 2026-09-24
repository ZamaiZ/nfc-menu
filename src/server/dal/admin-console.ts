import 'server-only'
import { cache } from 'react'
import { getPlatformInvite, listPlatformInvites } from './invites'
import { listRestaurantsForAdmin } from './restaurants'

export const getCachedPlatformInvites = cache(listPlatformInvites)
export const getCachedAdminRestaurants = cache(listRestaurantsForAdmin)
export const getCachedPlatformInvite = cache(getPlatformInvite)
