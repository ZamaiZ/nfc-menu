import type { Metadata } from 'next'
import { Fraunces, Inter } from 'next/font/google'
import './globals.css'
import { cn } from 'cn'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { ThemeScript } from '@/components/theme/theme-script'
import { Toaster } from '@/components/ui/toast'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

// Fraunces é variável e tem eixo de tamanho óptico. `opsz` alto engrossa a
// serifa e fecha as contraformas, que é o que dá presença a um título grande
// sem precisar recorrer a peso 700.
//
// Ela é a face de display do PAINEL. O console fica só com a Inter, de
// propósito: densidade e sobriedade são o caráter dele, e uma serifada quente
// numa tela de operação seria enfeite no lugar errado.
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  axes: ['opsz'],
})

export const metadata: Metadata = {
  title: {
    default: 'Cardápio digital',
    template: '%s · Cardápio digital',
  },
  description: 'Cardápios de restaurante acessíveis por NFC e QR code.',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="pt-BR"
      // O tema e aplicado por um script antes da hidratacao, o que faz o
      // HTML do servidor divergir do primeiro render do cliente. Sem isto,
      // o React reclama de uma divergencia que e intencional.
      suppressHydrationWarning
      className={cn(
        'h-full antialiased font-sans',
        inter.variable,
        fraunces.variable,
      )}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
