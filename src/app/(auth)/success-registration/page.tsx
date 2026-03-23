import Link from 'next/link'
import Image from 'next/image'

export default function SuccessRegistrationPage() {
  return (
    <div className="text-center space-y-4">
      <Image
        src="https://gesti.cl/lovable-uploads/77774409-5ea8-40b2-8d6a-27b5285709d5.png"
        alt="Gesti"
        width={100}
        height={40}
        className="h-10 w-auto mx-auto mb-4"
        unoptimized
      />
      <div className="text-4xl">✉️</div>
      <h1 className="text-2xl font-bold text-gesti-dark">¡Revisa tu correo!</h1>
      <p className="text-gray-500 text-sm">
        Te enviamos un enlace de confirmación a tu email.
        <br />
        Haz clic en él para activar tu cuenta.
      </p>
      <Link
        href="/login"
        className="inline-block mt-4 text-sm text-gesti-teal font-medium hover:underline"
      >
        Ir al inicio de sesión
      </Link>
    </div>
  )
}
