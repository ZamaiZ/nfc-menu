'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { CommandPalette } from './command-palette'
import { AccountPopover } from './account-popover'
import { LiquidFrame } from './liquid-frame'
import { MobileDock } from './mobile-dock'
import { Rail } from './rail'
import { InviteSheet } from './invites/invite-sheet'
import { toggleRailMode, useRailMode, type RailMode } from './rail-store'
import { isConsoleRouteActive, type ConsoleLeaf } from './console-config'

type ConsoleActionValue = { openInvite: (email?: string, inviteId?: string) => void }
const ConsoleActionsContext = createContext<ConsoleActionValue>({ openInvite: () => undefined })

export function useConsoleActions() {
  return useContext(ConsoleActionsContext)
}

export function ConsoleShell({
  children,
  leaves,
  email,
  initialRail,
  counts,
}: {
  children: ReactNode
  leaves: ConsoleLeaf[]
  email: string | null
  initialRail: RailMode
  counts: { pendingInvites: number; restaurants: number }
}) {
  const pathname = usePathname()
  const mode = useRailMode(initialRail)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [inviteRequest, setInviteRequest] = useState<{ email?: string; inviteId?: string } | null>(null)
  const moveRef = useRef<(left: number, cy: number, instant?: boolean) => void>(() => undefined)
  const activeIndex = Math.max(0, leaves.findIndex((leaf) => isConsoleRouteActive(pathname, leaf)))
  const openInvite = useCallback((prefillEmail?: string, inviteId?: string) => setInviteRequest({ email: prefillEmail, inviteId }), [])
  const context = useMemo(() => ({ openInvite }), [openInvite])
  const setMove = useCallback((move: (left: number, cy: number, instant?: boolean) => void) => { moveRef.current = move }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const editable = event.target instanceof HTMLElement && (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName) || event.target.isContentEditable)
      if (event.repeat || editable) return
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b') {
        event.preventDefault()
        toggleRailMode()
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mode])

  useEffect(() => {
    moveRef.current(mode === 'pinned' ? 272 : 80, 196 + 64 * activeIndex)
  }, [activeIndex, mode])

  const navigate = useCallback((leaf: ConsoleLeaf) => {
    const targetIndex = Math.max(0, leaves.findIndex((item) => item.key === leaf.key))
    moveRef.current(mode === 'pinned' ? 272 : 80, 196 + 64 * targetIndex)
  }, [leaves, mode])

  return <ConsoleActionsContext.Provider value={context}>
    <div className="tv-console-root">
      <LiquidFrame initialLeft={initialRail === 'pinned' ? 272 : 80} activeIndex={activeIndex} onReady={setMove}>
        <Rail leaves={leaves} mode={mode} email={email} onSearch={() => setPaletteOpen(true)} onAccount={() => setAccountOpen((open) => !open)} onNavigate={navigate} />
        {children}
      </LiquidFrame>
      <MobileDock leaves={leaves} email={email} counts={counts} />
      <CommandPalette leaves={leaves} open={paletteOpen} onClose={() => setPaletteOpen(false)} onNewInvite={() => openInvite()} />
      {accountOpen && <><button className="tv-overlay-scrim" aria-label="Fechar conta" onClick={() => setAccountOpen(false)} /><AccountPopover email={email} onClose={() => setAccountOpen(false)} /></>}
      <InviteSheet request={inviteRequest} onClose={() => setInviteRequest(null)} />
    </div>
  </ConsoleActionsContext.Provider>
}
