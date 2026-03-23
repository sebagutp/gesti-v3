import { Hero } from '@/components/landing/Hero'
import { Beneficios } from '@/components/landing/Beneficios'
import { Proceso4Pasos } from '@/components/landing/Proceso4Pasos'
import { Testimonios } from '@/components/landing/Testimonios'
import { FAQs } from '@/components/landing/FAQs'
import { FooterPublico } from '@/components/landing/FooterPublico'

export default function LandingPage() {
  return (
    <>
      <Hero />
      <Beneficios />
      <Proceso4Pasos />
      <Testimonios />
      <FAQs />
      <FooterPublico />
    </>
  )
}
