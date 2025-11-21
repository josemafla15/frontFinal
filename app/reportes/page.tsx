'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { estudiantesApi, metricasApi, practicasApi } from '@/lib/api'
import HelpButton from '@/components/HelpButton'
import { ArrowLeft, FileText, TrendingUp, Clock, Target, Award, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'

interface Practica {
  id: number
  fecha_inicio: string
  fecha_fin?: string
  duracion_total_segundos: number
  numero_intentos: number
  intentos_exitosos: number
  precision_promedio: number
  estado: string
}

export default function ReportesPage() {
  const searchParams = useSearchParams()
  const estudianteIdParam = searchParams.get('estudiante_id')
  
  const [estudiantes, setEstudiantes] = useState<any[]>([])
  const [selectedEstudiante, setSelectedEstudiante] = useState<number | null>(
    estudianteIdParam ? parseInt(estudianteIdParam) : null
  )
  const [estadisticas, setEstadisticas] = useState<any | null>(null)
  const [practicas, setPracticas] = useState<Practica[]>([])
  const [selectedPractica, setSelectedPractica] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    cargarEstudiantes()
  }, [])

  useEffect(() => {
    if (selectedEstudiante) {
      cargarDatos()
    }
  }, [selectedEstudiante])

  const cargarEstudiantes = async () => {
    try {
      const data = await estudiantesApi.listar()
      const estudiantesArray = Array.isArray(data) ? data : []
      setEstudiantes(estudiantesArray.filter((e) => e.activo))
    } catch (error) {
      console.error('Error cargando estudiantes:', error)
    }
  }

  const cargarDatos = async () => {
    if (!selectedEstudiante) return

    try {
      setLoading(true)
      setError(null)
      
      // Cargar estadísticas del estudiante
      const statsData = await metricasApi.estadisticasEstudiante(selectedEstudiante)
      setEstadisticas(statsData)
      
      // Cargar todas las prácticas del estudiante
      const practicasData = await practicasApi.listar()
      const practicasArray = Array.isArray(practicasData) ? practicasData : []
      const practicasEstudiante = practicasArray.filter(
        (p: any) => p.estudiante?.id === selectedEstudiante && p.estado === 'finalizada'
      )
      setPracticas(practicasEstudiante)
    } catch (error: any) {
      setError(error.response?.data?.error || 'Error al cargar datos')
      setEstadisticas(null)
      setPracticas([])
    } finally {
      setLoading(false)
    }
  }

  const handleEstudianteChange = (estudianteId: number) => {
    setSelectedEstudiante(estudianteId)
    setEstadisticas(null)
    setPracticas([])
    setSelectedPractica(null)
    setError(null)
  }

  const togglePractica = (practicaId: number) => {
    setSelectedPractica(selectedPractica === practicaId ? null : practicaId)
  }

  const formatearTiempo = (segundos: number) => {
    const mins = Math.floor(segundos / 60)
    const secs = segundos % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-2 sm:p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4 sm:mb-6"
        >
          <ArrowLeft size={20} className="mr-2" />
          Volver al inicio
        </Link>

        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 flex items-center flex-wrap">
            <FileText size={28} className="mr-2 sm:mr-3 text-purple-600" />
            Reportes de Desempeño
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Visualiza reportes detallados de desempeño de estudiantes
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar Estudiante
              </label>
              <select
                value={selectedEstudiante || ''}
                onChange={(e) => handleEstudianteChange(Number(e.target.value))}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 bg-white text-sm sm:text-base"
              >
                <option value="">-- Seleccione un estudiante --</option>
                {estudiantes.map((est) => (
                  <option key={est.id} value={est.id}>
                    {est.nombre_completo} ({est.codigo_estudiante})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 sm:mb-6 text-sm sm:text-base">
            {error}
          </div>
        )}

        {estadisticas && (
          <div className="space-y-4 sm:space-y-6">
            {/* Información del Estudiante */}
            <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
                Información del Estudiante
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <InfoCard label="Nombre" value={estadisticas.estudiante_nombre} />
                <InfoCard label="Código" value={estadisticas.estudiante_codigo} />
                <InfoCard label="Total Prácticas" value={estadisticas.total_practicas.toString()} />
                <InfoCard
                  label="Finalizadas"
                  value={estadisticas.practicas_finalizadas.toString()}
                />
              </div>
            </div>

            {/* Métricas de la Última Práctica */}
            {estadisticas.ultima_practica && (
              <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
                  Métricas de Desempeño de la Última Práctica
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <StatCard
                    icon={<TrendingUp size={24} />}
                    title="Precisión"
                    value={`${estadisticas.ultima_practica.precision.toFixed(1)}%`}
                    color="text-blue-600"
                    bgColor="bg-blue-50"
                  />
                  <StatCard
                    icon={<Target size={24} />}
                    title="Intentos"
                    value={estadisticas.ultima_practica.intentos.toString()}
                    color="text-green-600"
                    bgColor="bg-green-50"
                  />
                  <StatCard
                    icon={<Clock size={24} />}
                    title="Fecha"
                    value={new Date(estadisticas.ultima_practica.fecha).toLocaleDateString('es-CO')}
                    color="text-purple-600"
                    bgColor="bg-purple-50"
                  />
                  <StatCard
                    icon={<Award size={24} />}
                    title="Calificación"
                    value="0.0"
                    color="text-yellow-600"
                    bgColor="bg-yellow-50"
                  />
                </div>
              </div>
            )}

            {/* Listado de Todas las Prácticas */}
            <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
                Historial de Prácticas
              </h2>
              {practicas.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No hay prácticas finalizadas</p>
              ) : (
                <div className="space-y-3">
                  {practicas.map((practica) => (
                    <div key={practica.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => togglePractica(practica.id)}
                        className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-gray-900">
                            Práctica #{practica.id}
                          </span>
                          <span className="text-sm text-gray-600">
                            {formatearFecha(practica.fecha_inicio)}
                          </span>
                        </div>
                        {selectedPractica === practica.id ? (
                          <ChevronUp size={20} className="text-gray-600" />
                        ) : (
                          <ChevronDown size={20} className="text-gray-600" />
                        )}
                      </button>
                      
                      {selectedPractica === practica.id && (
                        <div className="p-4 bg-white">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                            <StatCard
                              icon={<TrendingUp size={20} />}
                              title="Precisión Promedio"
                              value={`${(practica.precision_promedio || 0).toFixed(1)}%`}
                              color="text-blue-600"
                              bgColor="bg-blue-50"
                            />
                            <StatCard
                              icon={<Target size={20} />}
                              title="Intentos Totales"
                              value={(practica.numero_intentos || 0).toString()}
                              color="text-green-600"
                              bgColor="bg-green-50"
                            />
                            <StatCard
                              icon={<Clock size={20} />}
                              title="Duración"
                              value={formatearTiempo(practica.duracion_total_segundos || 0)}
                              color="text-purple-600"
                              bgColor="bg-purple-50"
                            />
                            <StatCard
                              icon={<Award size={20} />}
                              title="Calificación"
                              value="0.0"
                              color="text-yellow-600"
                              bgColor="bg-yellow-50"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {!estadisticas && !loading && !error && (
          <div className="bg-white rounded-lg shadow-xl p-8 sm:p-12 text-center">
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">
              Selecciona un estudiante
            </h3>
            <p className="text-sm sm:text-base text-gray-500">
              Selecciona un estudiante para ver su historial de prácticas y métricas
            </p>
          </div>
        )}
      </div>
      <HelpButton />
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
      <p className="text-xs sm:text-sm text-gray-600 mb-1">{label}</p>
      <p className="text-base sm:text-lg font-semibold text-gray-900 break-words">{value}</p>
    </div>
  )
}

function StatCard({
  icon,
  title,
  value,
  color,
  bgColor,
}: {
  icon: React.ReactNode
  title: string
  value: string
  color: string
  bgColor: string
}) {
  return (
    <div className={`${bgColor} rounded-lg p-4 sm:p-6 border-2 border-transparent hover:border-gray-300 transition-colors`}>
      <div className={`${color} mb-3`}>{icon}</div>
      <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">{title}</p>
      <p className="text-2xl sm:text-3xl font-bold text-gray-900">{value}</p>
    </div>
  )
}