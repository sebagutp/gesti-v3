import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Iniciar Sesión',
  description: 'Accede a tu panel de gestión laboral TCP en Gesti.',
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
