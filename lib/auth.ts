import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Tipos para autenticación
export interface LoginCredentials {
  username: string
  password: string
}

export interface AuthTokens {
  access: string
  refresh: string
}

export interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  is_staff: boolean
  is_superuser: boolean
}

export interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isProfesor: boolean
}

// Keys para localStorage
const ACCESS_TOKEN_KEY = 'veinview_access_token'
const REFRESH_TOKEN_KEY = 'veinview_refresh_token'
const USER_KEY = 'veinview_user'

/**
 * Decodifica un JWT sin verificar la firma (solo para leer datos)
 * IMPORTANTE: Solo usar para leer info del usuario, NO para validación de seguridad
 */
function decodeJWT(token: string): any {
  try {
    // Un JWT tiene 3 partes separadas por puntos: header.payload.signature
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch (error) {
    console.error('Error decodificando JWT:', error)
    return null
  }
}

/**
 * Extrae información del usuario desde el token JWT
 * SimpleJWT de Django incluye user_id en el token
 */
function getUserFromToken(accessToken: string, username: string): User {
  const payload = decodeJWT(accessToken)
  
  // Log para debugging
  console.log('📝 Payload del JWT:', payload)
  
  if (!payload) {
    console.warn('⚠️ No se pudo decodificar el token, usando datos mínimos')
    return {
      id: 0,
      username: username,
      email: '',
      first_name: '',
      last_name: '',
      is_staff: true, // Asumimos que es staff si hizo login
      is_superuser: false,
    }
  }

  // SimpleJWT incluye estos campos por defecto
  // El campo user_id SIEMPRE está presente
  const user: User = {
    id: payload.user_id || payload.id || 0,
    username: payload.username || username,
    email: payload.email || '',
    first_name: payload.first_name || '',
    last_name: payload.last_name || '',
    is_staff: payload.is_staff !== undefined ? payload.is_staff : true,
    is_superuser: payload.is_superuser !== undefined ? payload.is_superuser : false,
  }

  console.log('👤 Usuario extraído del token:', user)
  return user
}

/**
 * Servicio de autenticación para VeinView
 * Gestiona login, logout, tokens JWT y estado de usuario
 */
export class AuthService {
  /**
   * Realiza login y guarda tokens
   * VERSIÓN MEJORADA con mejor manejo de errores
   */
  static async login(credentials: LoginCredentials): Promise<AuthState> {
    try {
      console.log('🔐 Intentando login con usuario:', credentials.username)
      
      // 1. Obtener tokens JWT
      const tokenResponse = await axios.post(`${API_URL}/api/token/`, credentials)
      console.log('✅ Tokens recibidos del backend')
      
      const { access, refresh } = tokenResponse.data as AuthTokens

      if (!access || !refresh) {
        throw new Error('El backend no retornó tokens válidos')
      }

      // 2. Guardar tokens
      this.setTokens(access, refresh)
      console.log('💾 Tokens guardados en localStorage')

      // 3. Decodificar el access token para obtener datos del usuario
      const user = getUserFromToken(access, credentials.username)
      
      if (!user || user.id === 0) {
        console.warn('⚠️ No se pudo obtener user_id del token, pero continuamos')
      }

      // 4. Guardar usuario
      this.setUser(user)
      console.log('💾 Usuario guardado en localStorage')

      // 5. Retornar estado de autenticación
      const authState: AuthState = {
        user,
        accessToken: access,
        refreshToken: refresh,
        isAuthenticated: true,
        isProfesor: user.is_staff || user.is_superuser
      }

      console.log('✅ Login exitoso:', authState)
      return authState
      
    } catch (error: any) {
      console.error('❌ Error en login:', error)
      
      // Mensajes de error más descriptivos
      if (error.response?.status === 401) {
        throw new Error('Usuario o contraseña incorrectos')
      } else if (error.response?.status === 400) {
        throw new Error('Datos de login inválidos')
      } else if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail)
      } else if (error.message) {
        throw new Error(error.message)
      } else {
        throw new Error('Error de conexión con el servidor. Verifica que el backend esté funcionando.')
      }
    }
  }

  /**
   * Cierra sesión y limpia tokens
   */
  static logout(): void {
    console.log('👋 Cerrando sesión...')
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ACCESS_TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    }
  }

  /**
   * Obtiene el access token del localStorage
   */
  static getAccessToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(ACCESS_TOKEN_KEY)
  }

  /**
   * Obtiene el refresh token del localStorage
   */
  static getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  }

  /**
   * Obtiene el usuario del localStorage
   */
  static getUser(): User | null {
    if (typeof window === 'undefined') return null
    const userStr = localStorage.getItem(USER_KEY)
    if (!userStr) return null
    try {
      return JSON.parse(userStr) as User
    } catch {
      return null
    }
  }

  /**
   * Guarda tokens en localStorage
   */
  static setTokens(access: string, refresh: string): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(ACCESS_TOKEN_KEY, access)
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh)
  }

  /**
   * Guarda usuario en localStorage
   */
  static setUser(user: User): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  }

  /**
   * Refresca el access token usando el refresh token
   */
  static async refreshAccessToken(): Promise<string | null> {
    const refreshToken = this.getRefreshToken()
    if (!refreshToken) return null

    try {
      console.log('🔄 Refrescando access token...')
      const response = await axios.post(`${API_URL}/api/token/refresh/`, {
        refresh: refreshToken
      })
      const { access } = response.data
      
      // Guardar nuevo access token
      if (typeof window !== 'undefined') {
        localStorage.setItem(ACCESS_TOKEN_KEY, access)
        
        // Actualizar también la info del usuario desde el nuevo token
        const currentUser = this.getUser()
        if (currentUser) {
          const updatedUser = getUserFromToken(access, currentUser.username)
          this.setUser(updatedUser)
        }
      }
      
      console.log('✅ Token refrescado exitosamente')
      return access
    } catch (error) {
      console.error('❌ Error refrescando token:', error)
      // Si falla el refresh, cerrar sesión
      this.logout()
      return null
    }
  }

  /**
   * Verifica si el usuario está autenticado
   */
  static isAuthenticated(): boolean {
    return this.getAccessToken() !== null && this.getUser() !== null
  }

  /**
   * Verifica si el usuario es profesor
   */
  static isProfesor(): boolean {
    const user = this.getUser()
    return user ? (user.is_staff || user.is_superuser) : false
  }

  /**
   * Obtiene el estado completo de autenticación
   */
  static getAuthState(): AuthState {
    return {
      user: this.getUser(),
      accessToken: this.getAccessToken(),
      refreshToken: this.getRefreshToken(),
      isAuthenticated: this.isAuthenticated(),
      isProfesor: this.isProfesor()
    }
  }
}

/**
 * Configurar interceptor de axios para agregar token automáticamente
 */
export function setupAxiosInterceptors() {
  // Request interceptor: agregar token a todas las peticiones
  axios.interceptors.request.use(
    (config) => {
      const token = AuthService.getAccessToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    },
    (error) => Promise.reject(error)
  )

  // Response interceptor: manejar errores 401 (token expirado)
  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config

      // Si es 401 y no hemos intentado refrescar
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true

        try {
          const newAccessToken = await AuthService.refreshAccessToken()
          if (newAccessToken) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
            return axios(originalRequest)
          }
        } catch (refreshError) {
          // Si falla el refresh, redirigir a login
          if (typeof window !== 'undefined') {
            window.location.href = '/login'
          }
          return Promise.reject(refreshError)
        }
      }

      return Promise.reject(error)
    }
  )
}