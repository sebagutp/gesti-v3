const pasos = [
  {
    num: '1',
    title: 'Regístrate gratis',
    description: 'Crea tu cuenta en menos de un minuto.',
  },
  {
    num: '2',
    title: 'Crea un contrato',
    description: 'Completa los datos del empleador y trabajador.',
  },
  {
    num: '3',
    title: 'Calcula la liquidación',
    description: 'El motor calcula AFP, salud, IUSC y más.',
  },
  {
    num: '4',
    title: 'Descarga el PDF',
    description: 'Listo para firmar y entregar.',
  },
]

export function Proceso4Pasos() {
  return (
    <section className="py-16 px-4 bg-gesti-bg">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-gesti-dark text-center mb-12">
          4 pasos simples
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {pasos.map((p) => (
            <div key={p.num} className="relative text-center">
              <div className="w-12 h-12 bg-gesti-teal text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                {p.num}
              </div>
              <h3 className="text-base font-semibold text-gesti-dark mb-1">{p.title}</h3>
              <p className="text-sm text-gray-500">{p.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
