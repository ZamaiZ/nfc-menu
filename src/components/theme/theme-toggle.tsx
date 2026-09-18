'use client'

import { RiComputerLine, RiMoonLine, RiSunLine } from 'react-icons/ri'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme, type Theme } from './theme-provider'

const OPTIONS: { value: Theme; label: string; Icon: typeof RiSunLine }[] = [
  { value: 'light', label: 'Claro', Icon: RiSunLine },
  { value: 'dark', label: 'Escuro', Icon: RiMoonLine },
  { value: 'system', label: 'Sistema', Icon: RiComputerLine },
]

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const current = OPTIONS.find((option) => option.value === theme) ?? OPTIONS[2]

  return (
    <DropdownMenu>
      {/* Base UI compoe com `render`, nao com `asChild` do Radix. O rotulo
          diz qual tema esta ativo: sem ele, um botao que so mostra um icone
          nao se explica para leitor de tela. */}
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Tema: ${current.label}`}
          />
        }
      >
        <current.Icon className="size-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {OPTIONS.map(({ value, label, Icon }) => (
          <DropdownMenuItem key={value} onClick={() => setTheme(value)}>
            <Icon className="size-4" />
            {label}
            {theme === value ? (
              <span className="ml-auto text-xs text-muted-foreground">atual</span>
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
