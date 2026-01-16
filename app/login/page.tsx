'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { LogIn, User, Lock, AlertCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  const { login, loading, error } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    // Limpiar espacios en blanco
    const cleanUsername = username.trim()
    const cleanPassword = password.trim()

    console.log('🔐 Intentando login...')
    console.log('Usuario:', cleanUsername)
    console.log('Password length:', cleanPassword.length)

    // Validaciones básicas
    if (!cleanUsername) {
      setLocalError('Por favor ingresa tu usuario')
      return
    }

    if (!cleanPassword) {
      setLocalError('Por favor ingresa tu contraseña')
      return
    }

    try {
      await login({ 
        username: cleanUsername, 
        password: cleanPassword 
      })
      console.log('✅ Login exitoso!')
    } catch (err: any) {
      console.error('❌ Error en login:', err)
      console.error('Mensaje:', err.message)
      console.error('Response:', err.response?.data)
      setLocalError(err.message || 'Error al iniciar sesión')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Botón Volver */}
        <Link
          href="/"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6"
        >
          <ArrowLeft size={20} className="mr-2" />
          Volver al inicio
        </Link>

        {/* Card de Login */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Logo y Título */}
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <LogIn className="text-blue-600" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Iniciar Sesión
            </h1>
            <p className="text-gray-600">
              Accede al Panel de Instructor de VeinView
            </p>
          </div>

          {/* Errores */}
          {(error || localError) && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertCircle className="text-red-600 mr-3 flex-shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <p className="text-red-800 text-sm font-medium">
                  {localError || error}
                </p>
              </div>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Campo Usuario */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Usuario
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="text-gray-400" size={20} />
                </div>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="veinview"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                />
              </div>
            </div>

            {/* Campo Contraseña */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="text-gray-400" size={20} />
                </div>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="Tu contraseña"
                  autoComplete="current-password"
                />
              </div>
            </div>

            {/* Botón Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Iniciando sesión...
                </>
              ) : (
                <>
                  <LogIn size={20} className="mr-2" />
                  Iniciar Sesión
                </>
              )}
            </button>
          </form>

          {/* Información adicional */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-center text-sm text-gray-600">
              ¿No tienes una cuenta? Contacta al administrador del sistema
            </p>
          </div>

          {/* Credenciales correctas */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800 font-medium mb-1">
              🔐 Credenciales del sistema:
            </p>
            <p className="text-xs text-blue-700">
              Usuario: <code className="bg-blue-100 px-1 rounded">veinview</code>
              {' | '}
              Contraseña: <code className="bg-blue-100 px-1 rounded">Veinview12345!</code>
            </p>
            <button
              type="button"
              onClick={() => {
                setUsername('veinview')
                setPassword('Veinview12345!')
              }}
              className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Autocompletar credenciales
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-600">
            VeinView AR © 2024 - Sistema de Prácticas de Canalización Venosa
          </p>
        </div>
      </div>
    </div>
  )
}