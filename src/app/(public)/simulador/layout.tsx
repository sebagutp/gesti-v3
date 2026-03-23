import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Simulador de Liquidación TCP',
  description: 'Calcula gratis el sueldo líquido de tu trabajador/a de casa particular. AFP, salud, IUSC y cotizaciones del empleador actualizadas.',
  openGraph: {
    title: 'Simulador de Liquidación TCP | Gesti',
    description: 'Calcula gratis el sueldo líquido de tu trabajador/a de casa particular con indicadores previsionales vigentes.',
    url: 'https://gesti.cl/simulador',
  },
}

export default function SimuladorLayout({ children }: { children: React.ReactNode }) {
  return children
}
