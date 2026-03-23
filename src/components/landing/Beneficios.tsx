import { FileText, Calculator, Shield, Clock } from 'lucide-react'

const beneficios = [
  {
    icon: <FileText className="h-8 w-8" />,
    title: 'Contratos legales',
    description: 'Genera contratos de trabajo válidos con todas las cláusulas que exige la ley.',
  },
  {
    icon: <Calculator className="h-8 w-8" />,
    title: 'Liquidaciones exactas',
    description: 'Motor de cálculo actualizado con indicadores previsionales vigentes.',
  },
  {
    icon: <Shield className="h-8 w-8" />,
    title: 'Cumplimiento legal',
    description: 'AFP, salud, cesantía, IUSC y cotizaciones del empleador al día.',
  },
  {
    icon: <Clock className="h-8 w-8" />,
    title: 'Ahorra tiempo',
    description: 'Todo el proceso en minutos: contrato, liquidación y PDF listos para firmar.',
  },
]

export function Beneficios() {
  return (
    <section className="py-16 px-4 bg-white">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-gesti-dark text-center mb-12">
          Todo lo que necesitas para emplear bien
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {beneficios.map((b) => (
            <div key={b.title} className="text-center">
              <div className="w-16 h-16 bg-gesti-verde/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-gesti-verde">
                {b.icon}
              </div>
              <h3 className="text-lg font-semibold text-gesti-dark mb-2">{b.title}</h3>
              <p className="text-sm text-gray-500">{b.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
