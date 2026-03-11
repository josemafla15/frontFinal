'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService, AuthState, LoginCredentials, User } from '@/lib/auth'

interface AuthContextType extends AuthState {
  login:   (credentials: LoginCredentials) => Promise<void>
  logout:  () => void
  loading: boolean
  error:   string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [state, setState] = useState<AuthState>({
    user:            null,
    accessToken:     null,
    refreshToken:    null,
    isAuthenticated: false,
    isProfesor:      false,
    isEstudiante:    false,  // ← nuevo
  })
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    try {
      setState(AuthService.getAuthState())
    } catch {
      // silencio — estado vacío es válido
    } finally {
      setLoading(false)
    }
  }, [])

  const login = async (credentials: LoginCredentials) => {
    try {
      setLoading(true)
      setError(null)

      const authState = await AuthService.login(credentials)
      setState(authState)

      // Redirigir según rol
      if (authState.isEstudiante) {
        router.push('/mi-portal/dashboard')
      } else {
        router.push('/')
      }
    } catch (err: any) {
      const msg = err.message || 'Error al iniciar sesión'
      setError(msg)
      throw new Error(msg)
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    AuthService.logout()
    setState({
      user:            null,
      accessToken:     null,
      refreshToken:    null,
      isAuthenticated: false,
      isProfesor:      false,
      isEstudiante:    false,
    })
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ ...state, login, logout, loading, error }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe ser usado dentro de un AuthProvider')
  return context
}