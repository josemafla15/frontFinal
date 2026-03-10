import axios from 'axios'
import { AuthService } from './auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ✅ Crear instancia de axios
const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ✅ IMPORTANTE: Configurar interceptores EN ESTA INSTANCIA
// Request interceptor: agregar token a todas las peticiones
api.interceptors.request.use(
  (config) => {
    const token = AuthService.getAccessToken()
    
    // Debug
    console.log('🔧 Interceptor Request:', {
      url: config.url,
      method: config.method,
      hasToken: !!token,
      tokenPreview: token ? token.substring(0, 30) + '...' : 'NO TOKEN'
    })
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    console.error('❌ Error en request interceptor:', error)
    return Promise.reject(error)
  }
)

// Response interceptor: manejar errores 401 (token expirado)
api.interceptors.response.use(
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
          return api(originalRequest)
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

// Types (sin cambios)
export interface Estudiante {
  id: number
  codigo_estudiante: string
  nombre_completo: string
  correo: string
  programa: string
  semestre: number
  telefono?: string
  activo: boolean
  fecha_registro: string
}

// ... resto del código igual

export interface EstudianteCreate {
  codigo_estudiante: string
  nombre_completo: string
  correo: string
  programa?: string
  semestre?: number
  telefono?: string
}

export interface DispositivoESP32 {
  id: number
  nombre: string
  mac_address: string
  activo: boolean
}

export interface PracticaActiva {
  id: number
  estudiante: Estudiante
  dispositivo: DispositivoESP32
  estado: 'iniciada' | 'pausada' | 'finalizada'
  fecha_inicio: string
  fecha_pausa?: string
  fecha_reanudacion?: string
  fecha_fin?: string
  duracion_total_segundos: number
  numero_intentos: number
  intentos_exitosos: number
  precision_promedio: number
}

export interface MetricasTiempoReal {
  practica_id: number
  estudiante_nombre: string
  estado: string
  tiempo_transcurrido: number
  numero_intentos: number
  precision_actual: number
  ultimos_datos: {
    angulo_pitch: number
    angulo_roll: number
    fuerza: number
    timestamp: string
  }[]
  angulo_actual: number
  fuerza_actual: number
}

export interface EstadisticasEstudiante {
  estudiante_id: number
  estudiante_nombre: string
  estudiante_codigo: string
  total_practicas: number
  practicas_finalizadas: number
  promedio_precision: number
  promedio_intentos: number
  promedio_tiempo_minutos: number
  promedio_calificacion: number
  mejor_practica: any
  ultima_practica: any
}

// API Functions
export const estudiantesApi = {
  listar: async (): Promise<Estudiante[]> => {
    const response = await api.get('/estudiantes/')
    return Array.isArray(response.data) ? response.data : (response.data.results || [])
  },

  crear: async (data: EstudianteCreate): Promise<Estudiante> => {
    // ✅ SOLUCIÓN: Usar la instancia 'api' que tiene los interceptores configurados
    // Esto automáticamente añade el token Bearer
    console.log('📤 Enviando datos:', data)
    
    const token = AuthService.getAccessToken()
    console.log('🔑 Token disponible:', token ? 'SÍ ✅' : 'NO ❌')
    
    const response = await api.post('/estudiantes/', data)
    
    console.log('✅ Estudiante creado:', response.data)
    return response.data
  },

  obtener: async (id: number): Promise<Estudiante> => {
    const response = await api.get(`/estudiantes/${id}/`)
    return response.data
  },
}

export const dispositivosApi = {
  listar: async (): Promise<DispositivoESP32[]> => {
    const response = await api.get('/placa/dispositivos/')
    return Array.isArray(response.data) ? response.data : (response.data.results || [])
  },
}

export const practicasApi = {
  listar: async (): Promise<PracticaActiva[]> => {
    const response = await api.get('/placa/practicas/')
    return Array.isArray(response.data) ? response.data : (response.data.results || [])
  },

  crear: async (estudiante_id: number, dispositivo_id: number): Promise<PracticaActiva> => {
    const response = await api.post('/placa/practicas/', {
      estudiante_id,
      dispositivo_id,
    })
    return response.data
  },

  pausar: async (id: number): Promise<PracticaActiva> => {
    const response = await api.patch(`/placa/practicas/${id}/`, {
      estado: 'pausada',
    })
    return response.data
  },

  reanudar: async (id: number): Promise<PracticaActiva> => {
    const response = await api.patch(`/placa/practicas/${id}/`, {
      estado: 'iniciada',
    })
    return response.data
  },

  finalizar: async (id: number): Promise<PracticaActiva> => {
    const response = await api.patch(`/placa/practicas/${id}/`, {
      estado: 'finalizada',
    })
    return response.data
  },

  obtener: async (id: number): Promise<PracticaActiva> => {
    const response = await api.get(`/placa/practicas/${id}/`)
    return response.data
  },
}

export const metricasApi = {
  tiempoReal: async (practica_id: number): Promise<MetricasTiempoReal> => {
    const response = await api.get('/profesor/metricas-tiempo-real/', {
      params: { practica_id },
    })
    return response.data
  },

  estadisticasEstudiante: async (estudiante_id: number): Promise<EstadisticasEstudiante> => {
    const response = await api.get('/profesor/estadisticas-estudiante/', {
      params: { estudiante_id },
    })
    return response.data
  },
}

export default api