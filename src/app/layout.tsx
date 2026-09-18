import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { cn } from 'cn'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { ThemeScript } from '@/components/theme/theme-script'
import { Toaster } from '@/components/ui/toast'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

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
      className={cn('h-full antialiased font-sans', inter.variable)}
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
