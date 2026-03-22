import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Gesti - Gestión Laboral TCP',
  description: 'Plataforma para gestión laboral de Trabajadores de Casa Particular en Chile',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        `}</style>
      </head>
      <body className="font-poppins bg-gesti-bg min-h-screen">{children}</body>
    </html>
  )
}
