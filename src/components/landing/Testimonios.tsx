const testimonios = [
  {
    name: 'María López',
    role: 'Empleadora',
    text: 'Antes hacía las liquidaciones a mano y siempre tenía miedo de equivocarme. Gesti me da tranquilidad.',
  },
  {
    name: 'Carlos Fernández',
    role: 'Empleador',
    text: 'Lo mejor es que el contrato sale listo para firmar. Me ahorro tiempo y dinero en abogados.',
  },
  {
    name: 'Patricia Muñoz',
    role: 'Empleadora',
    text: 'Muy fácil de usar. Creé el contrato y la primera liquidación en menos de 10 minutos.',
  },
]

export function Testimonios() {
  return (
    <section className="py-16 px-4 bg-white">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-gesti-dark text-center mb-12">
          Lo que dicen nuestros usuarios
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonios.map((t) => (
            <div
              key={t.name}
              className="bg-gesti-bg rounded-xl p-6 border border-gray-100"
            >
              <p className="text-sm text-gray-600 mb-4 italic">&ldquo;{t.text}&rdquo;</p>
              <div>
                <p className="font-semibold text-gesti-dark text-sm">{t.name}</p>
                <p className="text-xs text-gray-400">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
