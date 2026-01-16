'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2, ShieldAlert } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireProfesor?: boolean
}

/**
 * Componente para proteger rutas que requieren autenticación
 * Redirige a /login si el usuario no está autenticado
 * Si requireProfesor=true, también verifica que sea profesor
 */
export default function ProtectedRoute({ 
  children, 
  requireProfesor = false 
}: ProtectedRouteProps) {
  const router = useRouter()
  const { isAuthenticated, isProfesor, loading } = useAuth()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Esperar a que termine de cargar el estado de auth
    if (loading) return

    // Verificar autenticación
    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    // Verificar rol de profesor si es requerido
    if (requireProfesor && !isProfesor) {
      router.push('/')
      return
    }

    setIsChecking(false)
  }, [isAuthenticated, isProfesor, loading, requireProfesor, router])

  // Mostrar loading mientras verifica
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

  // Mostrar error si no tiene acceso
  if (!isAuthenticated || (requireProfesor && !isProfesor)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <ShieldAlert className="text-red-600 mx-auto mb-4" size={64} />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Acceso Denegado
          </h2>
          <p className="text-gray-600 mb-6">
            {!isAuthenticated 
              ? 'Debes iniciar sesión para acceder a esta página'
              : 'No tienes permisos para acceder a esta página'
            }
          </p>
          <button
            onClick={() => router.push(isAuthenticated ? '/' : '/login')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            {isAuthenticated ? 'Volver al Inicio' : 'Ir a Login'}
          </button>
        </div>
      </div>
    )
  }

  // Renderizar contenido protegido
  return <>{children}</>
}