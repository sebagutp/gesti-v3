import Link from 'next/link'

export default function FacturacionSuccessPage() {
  return (
    <div className="max-w-md mx-auto text-center py-16">
      <div className="w-16 h-16 rounded-full bg-gesti-verde/10 flex items-center justify-center mx-auto mb-6">
        <span className="text-3xl text-gesti-verde">✓</span>
      </div>
      <h1 className="text-2xl font-bold text-gesti-dark mb-2">¡Pago exitoso!</h1>
      <p className="text-gray-500 mb-8">
        Tu plan Pro ha sido activado. Ya puedes crear contratos, generar liquidaciones y descargar PDFs.
      </p>
      <div className="flex gap-4 justify-center">
        <Link
          href="/contratos"
          className="px-6 py-2 bg-gesti-verde text-white rounded-lg text-sm font-semibold hover:bg-gesti-verde/90"
        >
          Ir a Contratos
        </Link>
        <Link
          href="/facturacion"
          className="px-6 py-2 bg-gray-100 text-gesti-dark rounded-lg text-sm font-semibold hover:bg-gray-200"
        >
          Ver plan
        </Link>
      </div>
    </div>
  )
}
