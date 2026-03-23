'use client'

import { useState } from 'react'
import { signIn } from '../actions'
import Link from 'next/link'
import Image from 'next/image'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setError(null)
    setLoading(true)
    const result = await signIn(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Image
          src="https://gesti.cl/lovable-uploads/77774409-5ea8-40b2-8d6a-27b5285709d5.png"
          alt="Gesti"
          width={100}
          height={40}
          className="h-10 w-auto mx-auto mb-4"
          unoptimized
        />
        <h1 className="text-2xl font-bold text-gesti-dark">Iniciar sesión</h1>
        <p className="text-sm text-gray-500 mt-1">
          Accede a tu panel de gestión laboral
        </p>
      </div>

      <form action={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Correo electrónico
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gesti-verde focus:border-transparent"
            placeholder="maria@ejemplo.cl"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gesti-verde focus:border-transparent"
            placeholder="Tu contraseña"
          />
        </div>

        {error && (
          <div role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-gesti-teal text-white font-semibold rounded-lg hover:bg-gesti-teal/90 transition-colors disabled:opacity-50"
        >
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500">
        ¿No tienes cuenta?{' '}
        <Link href="/register" className="text-gesti-teal font-medium hover:underline">
          Regístrate gratis
        </Link>
      </p>
    </div>
  )
}
