import Link from 'next/link'
import Image from 'next/image'

export function FooterPublico() {
  return (
    <footer className="bg-gesti-dark text-white py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <Image
              src="https://gesti.cl/lovable-uploads/77774409-5ea8-40b2-8d6a-27b5285709d5.png"
              alt="Gesti"
              width={100}
              height={40}
              className="h-8 w-auto mb-3"
              unoptimized
            />
            <p className="text-sm text-white/60">
              Plataforma de gestión laboral para trabajadores de casa particular en Chile.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Producto</h4>
            <ul className="space-y-2 text-sm text-white/60">
              <li><Link href="/simulador" className="hover:text-white transition-colors">Simulador</Link></li>
              <li><Link href="/register" className="hover:text-white transition-colors">Crear cuenta</Link></li>
              <li><Link href="/login" className="hover:text-white transition-colors">Iniciar sesión</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Legal</h4>
            <ul className="space-y-2 text-sm text-white/60">
              <li>Términos de servicio</li>
              <li>Política de privacidad</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 text-center text-xs text-white/40">
          &copy; {new Date().getFullYear()} Gesti. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  )
}
