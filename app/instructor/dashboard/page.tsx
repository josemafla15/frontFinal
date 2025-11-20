'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  estudiantesApi,
  dispositivosApi,
  practicasApi,
  metricasApi,
  Estudiante,
  DispositivoESP32,
  PracticaActiva,
  MetricasTiempoReal,
} from '@/lib/api'
import HelpButton from '@/components/HelpButton'
import { ArrowLeft, Play, Pause, Square, RefreshCw, Users, Activity, BarChart3 } from 'lucide-react'
import Link from 'next/link'

export default function InstructorDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([])
  const [dispositivos, setDispositivos] = useState<DispositivoESP32[]>([])
  const [practicasActivas, setPracticasActivas] = useState<PracticaActiva[]>([])
  const [metricas, setMetricas] = useState<Record<number, MetricasTiempoReal>>({})
  const [selectedEstudiante, setSelectedEstudiante] = useState<number | null>(null)
  const [selectedDispositivo, setSelectedDispositivo] = useState<number | null>(null)
  const [practicaActual, setPracticaActual] = useState<PracticaActiva | null>(null)
  const [mostrarResumen, setMostrarResumen] = useState(false)

  useEffect(() => {
    cargarDatos()
    const interval = setInterval(() => {
      cargarPracticas()
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (practicaActual && practicaActual.estado === 'iniciada') {
      const interval = setInterval(() => {
        cargarMetricas(practicaActual.id)
      }, 2000)
      return () => clearInterval(interval)
    }
  }, [practicaActual])

  const cargarDatos = async () => {
    try {
      setLoading(true)
      const [estudiantesData, dispositivosData, practicasData] = await Promise.all([
        estudiantesApi.listar(),
        dispositivosApi.listar(),
        practicasApi.listar(),
      ])
      setEstudiantes(Array.isArray(estudiantesData) ? estudiantesData : [])
      setDispositivos(Array.isArray(dispositivosData) ? dispositivosData : [])
      const practicasArray = Array.isArray(practicasData) ? practicasData : []
      setPracticasActivas(practicasArray.filter((p) => p.estado !== 'finalizada'))

      const activa = practicasArray.find((p) => p.estado === 'iniciada' || p.estado === 'pausada')
      if (activa) {
        setPracticaActual(activa)
        setSelectedEstudiante(activa.estudiante.id)
        setSelectedDispositivo(activa.dispositivo.id)
        if (activa.estado === 'iniciada') {
          cargarMetricas(activa.id)
        }
      }
    } catch (error) {
      console.error('Error cargando datos:', error)
    } finally {
      setLoading(false)
    }
  }

  const cargarPracticas = async () => {
    try {
      const practicasData = await practicasApi.listar()
      const practicasArray = Array.isArray(practicasData) ? practicasData : []
      setPracticasActivas(practicasArray.filter((p) => p.estado !== 'finalizada'))
    } catch (error) {
      console.error('Error cargando prácticas:', error)
    }
  }

  const cargarMetricas = async (practicaId: number) => {
    try {
      const metricasData = await metricasApi.tiempoReal(practicaId)
      setMetricas((prev) => ({
        ...prev,
        [practicaId]: metricasData,
      }))
    } catch (error) {
      console.error('Error cargando métricas:', error)
    }
  }

  const iniciarPractica = async () => {
    if (!selectedEstudiante || !selectedDispositivo) {
      alert('Por favor selecciona un estudiante y un dispositivo')
      return
    }

    try {
      setLoading(true)
      const nuevaPractica = await practicasApi.crear(selectedEstudiante, selectedDispositivo)
      setPracticaActual(nuevaPractica)
      setMostrarResumen(false)
      await cargarDatos()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al iniciar la práctica')
    } finally {
      setLoading(false)
    }
  }

  const pausarPractica = async () => {
    if (!practicaActual) return

    try {
      setLoading(true)
      await practicasApi.pausar(practicaActual.id)
      await cargarDatos()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al pausar la práctica')
    } finally {
      setLoading(false)
    }
  }

  const reanudarPractica = async () => {
    if (!practicaActual) return

    try {
      setLoading(true)
      await practicasApi.reanudar(practicaActual.id)
      await cargarDatos()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al reanudar la práctica')
    } finally {
      setLoading(false)
    }
  }

  const finalizarPractica = async () => {
    if (!practicaActual) return

    if (!confirm('¿Estás seguro de que deseas finalizar esta práctica?')) {
      return
    }

    try {
      setLoading(true)
      await practicasApi.finalizar(practicaActual.id)
      setMostrarResumen(true)
      await cargarDatos()
      alert('Práctica finalizada exitosamente')
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al finalizar la práctica')
    } finally {
      setLoading(false)
    }
  }

  const formatearTiempo = (segundos: number) => {
    const mins = Math.floor(segundos / 60)
    const secs = segundos % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const verMetricasCompletas = () => {
    if (practicaActual) {
      router.push(`/reportes?estudiante_id=${practicaActual.estudiante.id}`)
    }
  }

  const metrica = practicaActual ? metricas[practicaActual.id] : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-2 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4 sm:mb-6"
        >
          <ArrowLeft size={20} className="mr-2" />
          Volver al inicio
        </Link>

        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">Panel de Instructor</h1>
          <p className="text-sm sm:text-base text-gray-600">Gestiona sesiones de práctica y visualiza métricas en tiempo real</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Panel de Control */}
          <div className="lg:col-span-1 space-y-4 sm:space-y-6">
            <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <Users size={24} className="mr-2 text-blue-600" />
                Control de Sesión
              </h2>

              {!practicaActual ? (
                <>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Seleccionar Estudiante *
                      </label>
                      <select
                        value={selectedEstudiante || ''}
                        onChange={(e) => setSelectedEstudiante(Number(e.target.value))}
                        className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white text-sm sm:text-base"
                      >
                        <option value="">-- Seleccione un estudiante --</option>
                        {estudiantes.map((est) => (
                          <option key={est.id} value={est.id}>
                            {est.nombre_completo} ({est.codigo_estudiante})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Seleccionar Dispositivo *
                      </label>
                      <select
                        value={selectedDispositivo || ''}
                        onChange={(e) => setSelectedDispositivo(Number(e.target.value))}
                        className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white text-sm sm:text-base"
                      >
                        <option value="">-- Seleccione un dispositivo --</option>
                        {dispositivos
                          .filter((d) => d.activo)
                          .map((disp) => (
                            <option key={disp.id} value={disp.id}>
                              {disp.nombre} ({disp.mac_address})
                            </option>
                          ))}
                      </select>
                    </div>

                    <button
                      onClick={iniciarPractica}
                      disabled={loading || !selectedEstudiante || !selectedDispositivo}
                      className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold py-2 sm:py-3 px-4 sm:px-6 rounded-lg transition-colors flex items-center justify-center text-sm sm:text-base"
                    >
                      <Play size={20} className="mr-2" />
                      Iniciar Sesión de Práctica
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs sm:text-sm text-gray-600">Estudiante:</p>
                    <p className="font-semibold text-gray-900 text-sm sm:text-base">
                      {practicaActual.estudiante.nombre_completo}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600 mt-2">Dispositivo:</p>
                    <p className="font-semibold text-gray-900 text-sm sm:text-base">
                      {practicaActual.dispositivo.nombre}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600 mt-2">Estado:</p>
                    <p className="font-semibold text-gray-900 capitalize text-sm sm:text-base">
                      {practicaActual.estado}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {practicaActual.estado === 'iniciada' ? (
                      <button
                        onClick={pausarPractica}
                        disabled={loading}
                        className="flex-1 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-300 text-white font-semibold py-2 px-3 sm:px-4 rounded-lg transition-colors flex items-center justify-center text-sm sm:text-base"
                      >
                        <Pause size={18} className="mr-1 sm:mr-2" />
                        Pausar
                      </button>
                    ) : (
                      <button
                        onClick={reanudarPractica}
                        disabled={loading}
                        className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold py-2 px-3 sm:px-4 rounded-lg transition-colors flex items-center justify-center text-sm sm:text-base"
                      >
                        <Play size={18} className="mr-1 sm:mr-2" />
                        Reanudar
                      </button>
                    )}
                    <button
                      onClick={finalizarPractica}
                      disabled={loading}
                      className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-semibold py-2 px-3 sm:px-4 rounded-lg transition-colors flex items-center justify-center text-sm sm:text-base"
                    >
                      <Square size={18} className="mr-1 sm:mr-2" />
                      Finalizar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Lista de Prácticas Activas */}
            {practicasActivas.length > 0 && (
              <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Prácticas Activas</h2>
                <div className="space-y-2">
                  {practicasActivas.map((practica) => (
                    <div
                      key={practica.id}
                      className="p-2 sm:p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <p className="font-semibold text-xs sm:text-sm">{practica.estudiante.nombre_completo}</p>
                      <p className="text-xs text-gray-600 capitalize">{practica.estado}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Panel de Métricas */}
          <div className="lg:col-span-2">
            {practicaActual ? (
              <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
                    <Activity size={24} className="mr-2 text-green-600" />
                    Métricas en Tiempo Real
                  </h2>
                  {practicaActual.estado === 'iniciada' && (
                    <button
                      onClick={() => practicaActual && cargarMetricas(practicaActual.id)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <RefreshCw size={20} />
                    </button>
                  )}
                </div>

                {practicaActual.estado === 'iniciada' && metrica ? (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                      <MetricCard
                        title="Tiempo Transcurrido"
                        value={formatearTiempo(metrica.tiempo_transcurrido)}
                        icon="⏱️"
                      />
                      <MetricCard
                        title="Número de Intentos"
                        value={metrica.numero_intentos.toString()}
                        icon="🎯"
                      />
                      <MetricCard
                        title="Precisión"
                        value={`${metrica.precision_actual.toFixed(1)}%`}
                        icon="📊"
                      />
                      <MetricCard
                        title="Fuerza Actual"
                        value={`${metrica.fuerza_actual.toFixed(1)}g`}
                        icon="💪"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
                      <MetricCard
                        title="Ángulo (Pitch)"
                        value={`${metrica.angulo_actual.toFixed(1)}°`}
                        icon="📐"
                      />
                      <MetricCard
                        title="Últimos Datos"
                        value={metrica.ultimos_datos.length > 0 ? `${metrica.ultimos_datos.length} registros` : 'Sin datos'}
                        icon="📈"
                      />
                    </div>
                  </>
                ) : practicaActual.estado === 'pausada' ? (
                  <div className="text-center py-8 text-gray-500">
                    <Pause size={64} className="mx-auto text-yellow-300 mb-4" />
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">
                      Sesión en pausa
                    </h3>
                    <p className="text-sm sm:text-base">
                      Haz clic en Reanudar para continuar capturando métricas
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Activity size={64} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">
                      Cargando métricas...
                    </h3>
                  </div>
                )}

                {/* Botón Ver Métricas Completas - Solo si está finalizada o se mostró el resumen */}
                {mostrarResumen && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <button
                      onClick={verMetricasCompletas}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <BarChart3 size={20} />
                      Ver Métricas Completas
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-xl p-8 sm:p-12 text-center">
                <Activity 
                  className="mx-auto text-gray-300 mb-4 w-12 h-12 sm:w-16 sm:h-16" 
                />
                <h3 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">
                  No hay sesión activa
                </h3>
                <p className="text-sm sm:text-base text-gray-500">
                  Inicia una sesión de práctica para ver las métricas en tiempo real
                </p>
              </div>

            )}
          </div>
        </div>
      </div>
      <HelpButton />
    </div>
  )
}

function MetricCard({ title, value, icon }: { title: string; value: string; icon: string }) {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 sm:p-4 border border-blue-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xl sm:text-2xl">{icon}</span>
        <p className="text-xs font-medium text-gray-600 text-right">{title}</p>
      </div>
      <p className="text-lg sm:text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}