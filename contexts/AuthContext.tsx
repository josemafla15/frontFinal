'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService, AuthState, LoginCredentials, User } from '@/lib/auth'

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
  loading: boolean
  error: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * Provider de autenticación para VeinView
 * Gestiona el estado global de autenticación
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isProfesor: false
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cargar estado de autenticación al montar el componente
  useEffect(() => {
    const loadAuthState = () => {
      try {
        const authState = AuthService.getAuthState()
        setState(authState)
      } catch (error) {
        console.error('Error cargando estado de autenticación:', error)
      } finally {
        setLoading(false)
      }
    }

    loadAuthState()
  }, [])

  /**
 * Función de login
 */
  const login = async (credentials: LoginCredentials) => {
    try {
      setLoading(true)
      setError(null)
    
      const authState = await AuthService.login(credentials)
      setState(authState)
    
      // ✅ CAMBIO: Siempre redirigir al menú principal
      router.push('/')
    } catch (err: any) {
      const errorMessage = err.message || 'Error al iniciar sesión'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Función de logout
   */
  const logout = () => {
    AuthService.logout()
    setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isProfesor: false
    })
    router.push('/login')
  }

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    loading,
    error
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Hook para usar el contexto de autenticación
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider')
  }
  return context
}