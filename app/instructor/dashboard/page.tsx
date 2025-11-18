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
import { ArrowLeft, Play, Pause, Square, RefreshCw, Users, Activity } from 'lucide-react'
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

  useEffect(() => {
    cargarDatos()
    const interval = setInterval(() => {
      cargarPracticas()
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (practicaActual) {
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
      // Asegurarse de que siempre sean arrays
      setEstudiantes(Array.isArray(estudiantesData) ? estudiantesData : [])
      setDispositivos(Array.isArray(dispositivosData) ? dispositivosData : [])
      const practicasArray = Array.isArray(practicasData) ? practicasData : []
      setPracticasActivas(practicasArray.filter((p) => p.estado !== 'finalizada'))

      // Buscar práctica activa
      const activa = practicasArray.find((p) => p.estado === 'iniciada' || p.estado === 'pausada')
      if (activa) {
        setPracticaActual(activa)
        setSelectedEstudiante(activa.estudiante.id)
        setSelectedDispositivo(activa.dispositivo.id)
        cargarMetricas(activa.id)
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
      setPracticaActual(null)
      setSelectedEstudiante(null)
      setSelectedDispositivo(null)
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

  const metrica = practicaActual ? metricas[practicaActual.id] : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="max-w-7xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6"
        >
          <ArrowLeft size={20} className="mr-2" />
          Volver al inicio
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Panel de Instructor</h1>
          <p className="text-gray-600">Gestiona sesiones de práctica y visualiza métricas en tiempo real</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Panel de Control */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-lg shadow-xl p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
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
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
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
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
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
                      className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
                    >
                      <Play size={20} className="mr-2" />
                      Iniciar Sesión de Práctica
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-gray-600">Estudiante:</p>
                    <p className="font-semibold text-gray-900">
                      {practicaActual.estudiante.nombre_completo}
                    </p>
                    <p className="text-sm text-gray-600 mt-2">Dispositivo:</p>
                    <p className="font-semibold text-gray-900">
                      {practicaActual.dispositivo.nombre}
                    </p>
                    <p className="text-sm text-gray-600 mt-2">Estado:</p>
                    <p className="font-semibold text-gray-900 capitalize">
                      {practicaActual.estado}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {practicaActual.estado === 'iniciada' ? (
                      <button
                        onClick={pausarPractica}
                        disabled={loading}
                        className="flex-1 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-300 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
                      >
                        <Pause size={18} className="mr-2" />
                        Pausar
                      </button>
                    ) : (
                      <button
                        onClick={reanudarPractica}
                        disabled={loading}
                        className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
                      >
                        <Play size={18} className="mr-2" />
                        Reanudar
                      </button>
                    )}
                    <button
                      onClick={finalizarPractica}
                      disabled={loading}
                      className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
                    >
                      <Square size={18} className="mr-2" />
                      Finalizar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Lista de Prácticas Activas */}
            {practicasActivas.length > 0 && (
              <div className="bg-white rounded-lg shadow-xl p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Prácticas Activas</h2>
                <div className="space-y-2">
                  {practicasActivas.map((practica) => (
                    <div
                      key={practica.id}
                      className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <p className="font-semibold text-sm">{practica.estudiante.nombre_completo}</p>
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
              <div className="bg-white rounded-lg shadow-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <Activity size={24} className="mr-2 text-green-600" />
                    Métricas en Tiempo Real
                  </h2>
                  <button
                    onClick={() => practicaActual && cargarMetricas(practicaActual.id)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <RefreshCw size={20} />
                  </button>
                </div>

                {metrica ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                      title="Ángulo Actual"
                      value={`${metrica.angulo_actual.toFixed(1)}°`}
                      icon="📐"
                    />
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Cargando métricas...
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-xl p-12 text-center">
                <Activity size={64} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  No hay sesión activa
                </h3>
                <p className="text-gray-500">
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
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <p className="text-xs text-gray-600 font-medium">{title}</p>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

