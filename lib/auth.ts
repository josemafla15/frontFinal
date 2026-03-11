import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

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
  isEstudiante: boolean   // ← nuevo
}

const ACCESS_TOKEN_KEY  = 'veinview_access_token'
const REFRESH_TOKEN_KEY = 'veinview_refresh_token'
const USER_KEY          = 'veinview_user'

function decodeJWT(token: string): any {
  try {
    const base64Url = token.split('.')[1]
    const base64    = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

function getUserFromToken(accessToken: string, username: string): User {
  const payload = decodeJWT(accessToken)

  if (!payload) {
    return {
      id: 0,
      username,
      email: '',
      first_name: '',
      last_name: '',
      is_staff: false,
      is_superuser: false,
    }
  }

  return {
    id:           payload.user_id   || payload.id   || 0,
    username:     payload.username  || username,
    email:        payload.email     || '',
    first_name:   payload.first_name  || '',
    last_name:    payload.last_name   || '',
    is_staff:     payload.is_staff     ?? false,
    is_superuser: payload.is_superuser ?? false,
  }
}

export class AuthService {
  static async login(credentials: LoginCredentials): Promise<AuthState> {
    try {
      const tokenResponse = await axios.post(`${API_URL}/api/token/`, credentials)
      const { access, refresh } = tokenResponse.data as AuthTokens

      if (!access || !refresh) throw new Error('El backend no retornó tokens válidos')

      this.setTokens(access, refresh)

      const user = getUserFromToken(access, credentials.username)
      this.setUser(user)

      const authState: AuthState = {
        user,
        accessToken:    access,
        refreshToken:   refresh,
        isAuthenticated: true,
        isProfesor:    user.is_staff || user.is_superuser,
        isEstudiante:  !user.is_staff && !user.is_superuser,
      }

      return authState
    } catch (error: any) {
      if (error.response?.status === 401) throw new Error('Usuario o contraseña incorrectos')
      if (error.response?.status === 400)  throw new Error('Datos de login inválidos')
      if (error.response?.data?.detail)    throw new Error(error.response.data.detail)
      throw new Error(error.message || 'Error de conexión con el servidor')
    }
  }

  static logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ACCESS_TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    }
  }

  static getAccessToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(ACCESS_TOKEN_KEY)
  }

  static getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  }

  static getUser(): User | null {
    if (typeof window === 'undefined') return null
    const userStr = localStorage.getItem(USER_KEY)
    if (!userStr) return null
    try { return JSON.parse(userStr) as User } catch { return null }
  }

  static setTokens(access: string, refresh: string): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(ACCESS_TOKEN_KEY, access)
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh)
  }

  static setUser(user: User): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  }

  static async refreshAccessToken(): Promise<string | null> {
    const refreshToken = this.getRefreshToken()
    if (!refreshToken) return null

    try {
      const response   = await axios.post(`${API_URL}/api/token/refresh/`, { refresh: refreshToken })
      const { access } = response.data

      if (typeof window !== 'undefined') {
        localStorage.setItem(ACCESS_TOKEN_KEY, access)
        const currentUser = this.getUser()
        if (currentUser) this.setUser(getUserFromToken(access, currentUser.username))
      }

      return access
    } catch {
      this.logout()
      return null
    }
  }

  static isAuthenticated(): boolean {
    return this.getAccessToken() !== null && this.getUser() !== null
  }

  static isProfesor(): boolean {
    const user = this.getUser()
    return user ? (user.is_staff || user.is_superuser) : false
  }

  // ← nuevo helper
  static isEstudiante(): boolean {
    const user = this.getUser()
    return user ? (!user.is_staff && !user.is_superuser) : false
  }

  static getAuthState(): AuthState {
    const user = this.getUser()
    return {
      user,
      accessToken:     this.getAccessToken(),
      refreshToken:    this.getRefreshToken(),
      isAuthenticated: this.isAuthenticated(),
      isProfesor:      this.isProfesor(),
      isEstudiante:    this.isEstudiante(),
    }
  }
}