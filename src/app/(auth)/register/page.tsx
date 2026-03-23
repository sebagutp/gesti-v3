'use client'

import { useState } from 'react'
import { signUp } from '../actions'
import Link from 'next/link'
import Image from 'next/image'

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setError(null)
    setLoading(true)
    const result = await signUp(formData)
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
        <h1 className="text-2xl font-bold text-gesti-dark">Crear cuenta</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gestiona contratos y liquidaciones de tu trabajador/a de casa particular
        </p>
      </div>

      <form action={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gesti-verde focus:border-transparent"
              placeholder="María"
            />
          </div>
          <div>
            <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
              Apellido
            </label>
            <input
              id="last_name"
              name="last_name"
              type="text"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gesti-verde focus:border-transparent"
              placeholder="González"
            />
          </div>
        </div>

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
            minLength={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gesti-verde focus:border-transparent"
            placeholder="Mínimo 6 caracteres"
          />
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-gesti-verde text-white font-semibold rounded-lg hover:bg-gesti-verde/90 transition-colors disabled:opacity-50"
        >
          {loading ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="text-gesti-teal font-medium hover:underline">
          Inicia sesión
        </Link>
      </p>
    </div>
  )
}
