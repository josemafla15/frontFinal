'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import { LogOut } from 'lucide-react'

function HomeContent() {
  const { user, logout, isProfesor } = useAuth()

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header con información de usuario */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xl font-bold">
                {user?.first_name?.[0] || user?.username?.[0] || 'U'}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-600">Bienvenido,</p>
              <p className="text-lg font-semibold text-gray-900">
                {user?.first_name && user?.last_name 
                  ? `${user.first_name} ${user.last_name}`
                  : user?.username}
              </p>
              {isProfesor && (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  👨‍🏫 Profesor
                </span>
              )}
            </div>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </div>

        {/* Título principal */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            VeinView AR
          </h1>
          <p className="text-xl text-gray-600">
            Sistema de Prácticas de Canalización Venosa
          </p>
        </div>

        {/* Cards de funcionalidades */}
        <div className="grid md:grid-cols-2 gap-6 mt-12">
          <Link
            href="/estudiantes/crear"
            className="block p-8 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow border-2 border-blue-200 hover:border-blue-400"
          >
            <div className="text-center">
              <div className="text-4xl mb-4">👨‍🎓</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Crear Perfil de Estudiante
              </h2>
              <p className="text-gray-600">
                Registra un nuevo estudiante en el sistema
              </p>
            </div>
          </Link>

          <Link
            href="/instructor/dashboard"
            className="block p-8 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow border-2 border-green-200 hover:border-green-400"
          >
            <div className="text-center">
              <div className="text-4xl mb-4">👨‍🏫</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Panel de Instructor
              </h2>
              <p className="text-gray-600">
                Gestiona sesiones de práctica y visualiza métricas
              </p>
            </div>
          </Link>

          <Link
            href="/reportes"
            className="block p-8 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow border-2 border-purple-200 hover:border-purple-400"
          >
            <div className="text-center">
              <div className="text-4xl mb-4">📊</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Reportes
              </h2>
              <p className="text-gray-600">
                Visualiza reportes de desempeño de estudiantes
              </p>
            </div>
          </Link>
        </div>
      </div>
    </main>
  )
}

// Exportar la página principal protegida
export default function Home() {
  return (
    <ProtectedRoute requireProfesor={true}>
      <HomeContent />
    </ProtectedRoute>
  )
}