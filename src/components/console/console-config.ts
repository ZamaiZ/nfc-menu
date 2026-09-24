export type ConsoleIcon = 'mail' | 'store'

export type ConsoleLeaf = {
  kind: 'leaf'
  key: 'convites' | 'restaurantes'
  href: '/' | '/restaurantes'
  activeMatch: string[]
  label: string
  sub: string
  icon: ConsoleIcon
}

export type ConsoleGroup = {
  kind: 'group'
  id: string
  label: string
  children: ConsoleLeaf[]
}

export type ConsoleNode = ConsoleLeaf | ConsoleGroup

export type ConsoleConfig = {
  userLabel: string | null
  items: ConsoleNode[]
  leaves: ConsoleLeaf[]
}

export function getConsoleConfig(user: { email?: string | null } | null): ConsoleConfig {
  const leaves: ConsoleLeaf[] = [
    {
      kind: 'leaf',
      key: 'convites',
      href: '/',
      activeMatch: ['/convites'],
      label: 'Convites',
      sub: 'Acessos à plataforma',
      icon: 'mail',
    },
    {
      kind: 'leaf',
      key: 'restaurantes',
      href: '/restaurantes',
      activeMatch: ['/restaurantes'],
      label: 'Restaurantes',
      sub: 'Contas cadastradas',
      icon: 'store',
    },
  ]

  return {
    userLabel: user?.email ?? null,
    items: [{ kind: 'group', id: 'platform', label: 'Plataforma', children: leaves }],
    leaves,
  }
}

export function isConsoleLeaf(node: ConsoleNode): node is ConsoleLeaf {
  return node.kind === 'leaf'
}

export function isConsoleRouteActive(pathname: string, leaf: ConsoleLeaf) {
  if (leaf.href === '/' && pathname === '/') return true
  if (leaf.href !== '/' && (pathname === leaf.href || pathname.startsWith(`${leaf.href}/`))) {
    return true
  }
  return leaf.activeMatch.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}
