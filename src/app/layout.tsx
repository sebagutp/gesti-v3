import type { Metadata } from 'next'
import { Poppins } from 'next/font/google'
import './globals.css'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
})

export const metadata: Metadata = {
  title: 'Gesti - Gestión Laboral TCP',
  description: 'Plataforma para gestión laboral de Trabajadores de Casa Particular en Chile',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={poppins.variable}>
      <body className="font-poppins bg-gesti-bg min-h-screen">{children}</body>
    </html>
  )
}
