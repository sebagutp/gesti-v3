import Link from 'next/link'
import Image from 'next/image'

export function Hero() {
  return (
    <section className="bg-gradient-to-br from-gesti-teal to-gesti-teal/90 text-white py-20 px-4">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-12">
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-4">
            Gestiona el empleo de tu{' '}
            <span className="text-gesti-amarillo">trabajador/a de casa particular</span>
          </h1>
          <p className="text-white/80 text-lg mb-8 max-w-lg">
            Contratos, liquidaciones de sueldo, permisos y cumplimiento legal.
            Todo en una plataforma simple y conforme a la ley chilena.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-6 py-3 bg-gesti-verde text-white font-semibold rounded-lg hover:bg-gesti-verde/90 transition-colors"
            >
              Crear cuenta gratis
            </Link>
            <Link
              href="/simulador"
              className="inline-flex items-center justify-center px-6 py-3 bg-white/10 text-white font-medium rounded-lg hover:bg-white/20 transition-colors border border-white/20"
            >
              Simular liquidación
            </Link>
          </div>
        </div>
        <div className="flex-shrink-0">
          <Image
            src="https://gesti.cl/lovable-uploads/77774409-5ea8-40b2-8d6a-27b5285709d5.png"
            alt="Gesti"
            width={200}
            height={200}
            className="w-40 md:w-52 h-auto opacity-90"
            unoptimized
          />
        </div>
      </div>
    </section>
  )
}
