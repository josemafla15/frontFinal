'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { estudiantesApi, metricasApi, EstadisticasEstudiante } from '@/lib/api'
import HelpButton from '@/components/HelpButton'
import { ArrowLeft, FileText, Search, TrendingUp, Clock, Target, Award } from 'lucide-react'
import Link from 'next/link'

export default function ReportesPage() {
  const searchParams = useSearchParams()
  const estudianteIdParam = searchParams.get('estudiante_id')
  
  const [estudiantes, setEstudiantes] = useState<any[]>([])
  const [selectedEstudiante, setSelectedEstudiante] = useState<number | null>(
    estudianteIdParam ? parseInt(estudianteIdParam) : null
  )
  const [estadisticas, setEstadisticas] = useState<EstadisticasEstudiante | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    cargarEstudiantes()
  }, [])

  useEffect(() => {
    if (selectedEstudiante) {
      cargarEstadisticas()
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

  const cargarEstadisticas = async () => {
    if (!selectedEstudiante) return

    try {
      setLoading(true)
      setError(null)
      const data = await metricasApi.estadisticasEstudiante(selectedEstudiante)
      setEstadisticas(data)
    } catch (error: any) {
      setError(error.response?.data?.error || 'Error al cargar estadísticas')
      setEstadisticas(null)
    } finally {
      setLoading(false)
    }
  }

  const handleEstudianteChange = (estudianteId: number) => {
    setSelectedEstudiante(estudianteId)
    setEstadisticas(null)
    setError(null)
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
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={selectedEstudiante || ''}
                  onChange={(e) => handleEstudianteChange(Number(e.target.value))}
                  className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 bg-white text-sm sm:text-base"
                >
                  <option value="">-- Seleccione un estudiante --</option>
                  {estudiantes.map((est) => (
                    <option key={est.id} value={est.id}>
                      {est.nombre_completo} ({est.codigo_estudiante})
                    </option>
                  ))}
                </select>
                <button
                  onClick={cargarEstadisticas}
                  disabled={!selectedEstudiante || loading}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white font-semibold py-2 px-4 sm:px-6 rounded-lg transition-colors flex items-center justify-center text-sm sm:text-base whitespace-nowrap"
                >
                  <Search size={20} className="mr-2" />
                  {loading ? 'Cargando...' : 'Generar Reporte'}
                </button>
              </div>
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

            {/* Métricas de Desempeño */}
            <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Métricas de Desempeño</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <StatCard
                  icon={<TrendingUp size={24} />}
                  title="Precisión Promedio"
                  value={`${estadisticas.promedio_precision.toFixed(1)}%`}
                  color="text-blue-600"
                  bgColor="bg-blue-50"
                />
                <StatCard
                  icon={<Target size={24} />}
                  title="Intentos Promedio"
                  value={estadisticas.promedio_intentos.toFixed(1)}
                  color="text-green-600"
                  bgColor="bg-green-50"
                />
                <StatCard
                  icon={<Clock size={24} />}
                  title="Tiempo Promedio"
                  value={`${estadisticas.promedio_tiempo_minutos.toFixed(1)} min`}
                  color="text-purple-600"
                  bgColor="bg-purple-50"
                />
                <StatCard
                  icon={<Award size={24} />}
                  title="Calificación Promedio"
                  value={estadisticas.promedio_calificacion.toFixed(1)}
                  color="text-yellow-600"
                  bgColor="bg-yellow-50"
                />
              </div>
            </div>

            {/* Mejor y Última Práctica */}
            {(estadisticas.mejor_practica || estadisticas.ultima_practica) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {estadisticas.mejor_practica && (
                  <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 flex items-center">
                      <Award size={24} className="mr-2 text-yellow-600" />
                      Mejor Práctica
                    </h3>
                    <div className="space-y-2">
                      <p className="text-xs sm:text-sm text-gray-600">Fecha:</p>
                      <p className="font-semibold text-gray-900 text-sm sm:text-base">
                        {estadisticas.mejor_practica.fecha}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-600 mt-3">Precisión:</p>
                      <p className="font-semibold text-gray-900 text-sm sm:text-base">
                        {estadisticas.mejor_practica.precision.toFixed(1)}%
                      </p>
                      <p className="text-xs sm:text-sm text-gray-600 mt-3">Intentos:</p>
                      <p className="font-semibold text-gray-900 text-sm sm:text-base">
                        {estadisticas.mejor_practica.intentos}
                      </p>
                    </div>
                  </div>
                )}

                {estadisticas.ultima_practica && (
                  <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 flex items-center">
                      <Clock size={24} className="mr-2 text-blue-600" />
                      Última Práctica
                    </h3>
                    <div className="space-y-2">
                      <p className="text-xs sm:text-sm text-gray-600">Fecha:</p>
                      <p className="font-semibold text-gray-900 text-sm sm:text-base">
                        {estadisticas.ultima_practica.fecha}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-600 mt-3">Precisión:</p>
                      <p className="font-semibold text-gray-900 text-sm sm:text-base">
                        {estadisticas.ultima_practica.precision.toFixed(1)}%
                      </p>
                      <p className="text-xs sm:text-sm text-gray-600 mt-3">Intentos:</p>
                      <p className="font-semibold text-gray-900 text-sm sm:text-base">
                        {estadisticas.ultima_practica.intentos}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {!estadisticas && !loading && !error && (
          <div className="bg-white rounded-lg shadow-xl p-8 sm:p-12 text-center">
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">
              Selecciona un estudiante y genera el reporte
            </h3>
            <p className="text-sm sm:text-base text-gray-500">
              Haz clic en Generar Reporte para ver las estadísticas del estudiante seleccionado
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