'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2, ShieldAlert } from 'lucide-react'

interface ProtectedRouteProps {
  children:          React.ReactNode
  requireProfesor?:  boolean
  requireEstudiante?: boolean
}

/**
 * Protege rutas según rol.
 *
 * requireProfesor=true   → solo profesores (is_staff / is_superuser)
 * requireEstudiante=true → solo estudiantes (ni is_staff ni is_superuser)
 * Sin flags              → cualquier usuario autenticado
 */
export default function ProtectedRoute({
  children,
  requireProfesor   = false,
  requireEstudiante = false,
}: ProtectedRouteProps) {
  const router = useRouter()
  const { isAuthenticated, isProfesor, isEstudiante, loading } = useAuth()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    if (loading) return

    // No autenticado → login
    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    // Ruta de profesor pero el usuario es estudiante → home estudiante
    if (requireProfesor && !isProfesor) {
      router.push('/mi-portal/dashboard')
      return
    }

    // Ruta de estudiante pero el usuario es profesor → home profesor
    if (requireEstudiante && !isEstudiante) {
      router.push('/')
      return
    }

    setIsChecking(false)
  }, [isAuthenticated, isProfesor, isEstudiante, loading, requireProfesor, requireEstudiante, router])

  if (loading || isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={48} />
          <p className="text-gray-600 text-lg">Verificando acceso...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <ShieldAlert className="text-red-600 mx-auto mb-4" size={64} />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h2>
          <p className="text-gray-600 mb-6">Debes iniciar sesión para acceder a esta página</p>
          <button
            onClick={() => router.push('/login')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            Ir a Login
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}