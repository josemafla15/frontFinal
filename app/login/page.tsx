'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { LogIn, User, Lock, AlertCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  const { login, loading, error } = useAuth()
  const [username, setUsername]     = useState('')
  const [password, setPassword]     = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    const cleanUsername = username.trim()
    const cleanPassword = password.trim()

    if (!cleanUsername) { setLocalError('Por favor ingresa tu usuario'); return }
    if (!cleanPassword) { setLocalError('Por favor ingresa tu contraseña'); return }

    try {
      await login({ username: cleanUsername, password: cleanPassword })
    } catch (err: any) {
      setLocalError(err.message || 'Error al iniciar sesión')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">


        <div className="bg-white rounded-2xl shadow-xl p-8">

          {/* Logo y título */}
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <LogIn className="text-blue-600" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Iniciar Sesión</h1>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-left">
                <span className="text-lg">🧑‍🏫</span>
                <p className="text-blue-700"><span className="font-semibold">Profesores:</span> ingresa con tu usuario y contraseña.</p>
              </div>
              <div className="flex items-start gap-2 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 text-left">
                <span className="text-lg">👨‍🎓</span>
                <div className="text-indigo-700">
                  <p><span className="font-semibold">Estudiantes:</span> ingresa con tu correo y código universitario.</p>
                  <p className="text-xs text-indigo-500 mt-0.5">💡 Se recomienda cambiar tu contraseña desde el perfil una vez adentro.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Errores */}
          {(error || localError) && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertCircle className="text-red-600 mr-3 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-red-800 text-sm font-medium">{localError || error}</p>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Usuario / Correo
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
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  placeholder="usuario o correo@ejemplo.com"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña / Código universitario
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="text-gray-400" size={20} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  placeholder="Contraseña o ID universitario"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg"
                    fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
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

          
        </div>

        
      </div>
    </div>
  )
}