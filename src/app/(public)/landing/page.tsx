import type { Metadata } from 'next'
import { Hero } from '@/components/landing/Hero'
import { Beneficios } from '@/components/landing/Beneficios'
import { Proceso4Pasos } from '@/components/landing/Proceso4Pasos'
import { Testimonios } from '@/components/landing/Testimonios'
import { FAQs } from '@/components/landing/FAQs'
import { FooterPublico } from '@/components/landing/FooterPublico'

export const metadata: Metadata = {
  title: 'Gesti - Gestión Laboral para Trabajadores de Casa Particular',
  description: 'Genera contratos de trabajo, liquidaciones de sueldo y gestiona permisos de tu trabajador/a de casa particular. Cumplimiento legal en Chile.',
  openGraph: {
    title: 'Gesti - Gestión Laboral TCP Chile',
    description: 'Contratos, liquidaciones de sueldo y cumplimiento legal para empleadores de Trabajadores de Casa Particular.',
    url: 'https://gesti.cl/landing',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Gesti',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description: 'Plataforma de gestión laboral para empleadores de Trabajadores de Casa Particular en Chile. Contratos, liquidaciones de sueldo, permisos y cumplimiento legal.',
  url: 'https://gesti.cl',
  offers: [
    {
      '@type': 'Offer',
      name: 'Plan Free',
      price: '0',
      priceCurrency: 'CLP',
      description: 'Simular contratos y liquidaciones gratis',
    },
    {
      '@type': 'Offer',
      name: 'Plan Pro Mensual',
      price: '9900',
      priceCurrency: 'CLP',
      description: 'Contratos válidos, liquidaciones con PDF y soporte',
    },
    {
      '@type': 'Offer',
      name: 'Plan Pro Anual',
      price: '95040',
      priceCurrency: 'CLP',
      description: 'Plan Pro con 20% de descuento anual',
    },
  ],
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    reviewCount: '150',
  },
}

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Hero />
      <Beneficios />
      <Proceso4Pasos />
      <Testimonios />
      <FAQs />
      <FooterPublico />
    </>
  )
}
