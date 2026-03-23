'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const faqs = [
  {
    q: '¿Qué es un Trabajador de Casa Particular (TCP)?',
    a: 'Es la persona que trabaja en el hogar realizando labores domésticas, como aseo, cocina, cuidado de niños o personas mayores. Tiene derechos laborales especiales regulados por el Código del Trabajo chileno.',
  },
  {
    q: '¿Necesito hacer contrato de trabajo?',
    a: 'Sí. Todo empleador de TCP está obligado a escriturar un contrato de trabajo dentro de los primeros 15 días de iniciada la relación laboral. Gesti te ayuda a generarlo de forma correcta.',
  },
  {
    q: '¿Qué incluye la liquidación de sueldo?',
    a: 'Incluye el cálculo de sueldo bruto, descuentos legales (AFP, salud, IUSC), cotizaciones del empleador (SIS, ISL, indemnización, cesantía), y el sueldo líquido a pagar.',
  },
  {
    q: '¿Es gratis?',
    a: 'Puedes simular contratos y liquidaciones gratis. Para generar documentos oficiales con PDF, necesitas un plan Pro desde $9.900/mes.',
  },
  {
    q: '¿Los cálculos están actualizados?',
    a: 'Sí. Usamos los indicadores previsionales vigentes (UF, UTM, tasas AFP, tramos IUSC) y cumplimos con la Ley 21.735 de Reforma Previsional.',
  },
]

export function FAQs() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section className="py-16 px-4 bg-gesti-bg">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-gesti-dark text-center mb-12">
          Preguntas frecuentes
        </h2>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="bg-white rounded-lg border border-gray-100 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left"
                aria-expanded={openIndex === i}
                aria-controls={`faq-panel-${i}`}
              >
                <span className="text-sm font-medium text-gesti-dark">{faq.q}</span>
                <ChevronDown
                  className={`h-4 w-4 text-gray-400 flex-shrink-0 ml-4 transition-transform ${
                    openIndex === i ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openIndex === i && (
                <div id={`faq-panel-${i}`} role="region" className="px-5 pb-4">
                  <p className="text-sm text-gray-500">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
