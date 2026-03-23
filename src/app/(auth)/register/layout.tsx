import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Crear Cuenta',
  description: 'Regístrate gratis en Gesti y gestiona contratos y liquidaciones de tu trabajador/a de casa particular.',
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children
}
