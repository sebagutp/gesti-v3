import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Simulador de Contrato TCP',
  description: 'Simula gratis un contrato de trabajo para tu trabajador/a de casa particular conforme a la ley chilena.',
  openGraph: {
    title: 'Simulador de Contrato TCP | Gesti',
    description: 'Simula un contrato de trabajo para Trabajadores de Casa Particular con todas las cláusulas legales.',
    url: 'https://gesti.cl/simulador-contrato',
  },
}

export default function SimuladorContratoLayout({ children }: { children: React.ReactNode }) {
  return children
}
