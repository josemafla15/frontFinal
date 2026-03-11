'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { estudiantesApi, practicasApi } from '@/lib/api'
import HelpButton from '@/components/HelpButton'
import {
  ArrowLeft, FileText, TrendingUp, TrendingDown, Minus,
  Target, Award, Activity, BarChart3, AlertCircle, Loader2
} from 'lucide-react'
import Link from 'next/link'
// @ts-ignore
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceArea, Legend
} from 'recharts'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ============================================================
// TIPOS
// ============================================================

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

interface SensorData {
  fuerza: number
  angulo_pitch: number
  angulo_roll: number
  tecnica_correcta: boolean
}

/** Métricas calculadas 100% desde datos de sensores reales */
interface MetricasCalculadas {
  fuerzaPromedio: number
  fuerzaMax: number
  fuerzaMin: number
  inclinacionPromedio: number
  precision: number          // % de lecturas con técnica correcta (ángulo + fuerza en rango simultáneamente)
  calificacion: number       // 0–5 basada en precision + rangos de fuerza y ángulo
  totalLecturas: number
  duracionSegundos: number
}

interface MetricasGlobales {
  totalPracticas: number
  precisionPromedio: number
  fuerzaPromedio: number
  inclinacionPromedio: number
  calificacionPromedio: number
  desviacionPrecision: number
  consistencia: 'alta' | 'media' | 'baja'
  tendencia: 'mejora' | 'empeora' | 'estable'
}

// ============================================================
// LÓGICA DE CÁLCULO (todo desde sensores reales)
// ============================================================

async function fetchSensorData(practicaId: number): Promise<SensorData[]> {
  const allData: SensorData[] = []
  let url: string | null = `${API_URL}/api/placa/datos-sensores/?practica=${practicaId}`

  while (url) {
    const res: Response = await fetch(url)
    if (!res.ok) return allData
    const json: any = await res.json()

    const items: any[] = Array.isArray(json) ? json : (json.results ?? [])
    items.forEach((d: any) => {
      allData.push({
        fuerza: parseFloat(d.fuerza) || 0,
        angulo_pitch: parseFloat(d.angulo_pitch) || 0,
        angulo_roll: parseFloat(d.angulo_roll) || 0,
        tecnica_correcta: Boolean(d.tecnica_correcta),
      })
    })

    url = (!Array.isArray(json) && json.next) ? (json.next as string) : null
  }

  return allData
}

function calcularMetricasDesdeSensores(
  practica: Practica,
  datos: SensorData[]
): MetricasCalculadas | null {
  if (datos.length === 0) return null

  const n = datos.length
  const fuerzaPromedio = datos.reduce((s, d) => s + d.fuerza, 0) / n
  const fuerzaMax = Math.max(...datos.map(d => d.fuerza))
  const fuerzaMin = Math.min(...datos.map(d => d.fuerza))
  const inclinacionPromedio = datos.reduce((s, d) => s + d.angulo_pitch, 0) / n
  const lectCorrectas = datos.filter(d => d.tecnica_correcta).length
  const precision = (lectCorrectas / n) * 100

  // Calificación sobre 5.0 — más granular
  // 40% precisión + 30% ángulo (qué tan centrado en 20°) + 30% fuerza (qué tan centrado en 175g)
  const pPrecision = (precision / 100) * 2.0

  // Ángulo: puntaje continuo basado en distancia al centro del rango óptimo (20°)
  const distAngulo = Math.abs(inclinacionPromedio - 20)
  const pAngulo = distAngulo <= 5  ? 1.5
                : distAngulo <= 10 ? 1.5 - ((distAngulo - 5) / 5) * 0.5   // 1.5 → 1.0
                : distAngulo <= 20 ? 1.0 - ((distAngulo - 10) / 10) * 0.5  // 1.0 → 0.5
                : 0.3

  // Fuerza: puntaje continuo basado en distancia al centro del rango óptimo (175g)
  const distFuerza = Math.abs(fuerzaPromedio - 175)
  const pFuerza = distFuerza <= 50  ? 1.5
                : distFuerza <= 100 ? 1.5 - ((distFuerza - 50) / 50) * 0.5   // 1.5 → 1.0
                : distFuerza <= 175 ? 1.0 - ((distFuerza - 100) / 75) * 0.5  // 1.0 → 0.5
                : 0.3

  const calificacion = Math.min(5.0, Math.round((pPrecision + pAngulo + pFuerza) * 10) / 10)

  return {
    fuerzaPromedio: Math.round(fuerzaPromedio * 10) / 10,
    fuerzaMax: Math.round(fuerzaMax * 10) / 10,
    fuerzaMin: Math.round(fuerzaMin * 10) / 10,
    inclinacionPromedio: Math.round(inclinacionPromedio * 10) / 10,
    precision: Math.round(precision * 10) / 10,
    calificacion,
    totalLecturas: n,
    duracionSegundos: practica.duracion_total_segundos,
  }
}

function calcularMetricasGlobales(
  practicas: Practica[],
  metricasPorPractica: Record<number, MetricasCalculadas | null>
): MetricasGlobales | null {
  const conDatos = practicas
    .map(p => ({ practica: p, metricas: metricasPorPractica[p.id] ?? null }))
    .filter((x): x is { practica: Practica; metricas: MetricasCalculadas } => x.metricas !== null && x.metricas !== undefined)

  if (conDatos.length === 0) return null

  const n = conDatos.length
  const precisionPromedio = conDatos.reduce((s, x) => s + x.metricas.precision, 0) / n
  const fuerzaPromedio = conDatos.reduce((s, x) => s + x.metricas.fuerzaPromedio, 0) / n
  const inclinacionPromedio = conDatos.reduce((s, x) => s + x.metricas.inclinacionPromedio, 0) / n
  const calificacionPromedio = conDatos.reduce((s, x) => s + x.metricas.calificacion, 0) / n

  const varianza = conDatos.reduce((s, x) => {
    const d = x.metricas.precision - precisionPromedio
    return s + d * d
  }, 0) / n
  const desviacionPrecision = Math.sqrt(varianza)

  const consistencia: 'alta' | 'media' | 'baja' =
    desviacionPrecision < 10 ? 'alta' : desviacionPrecision < 20 ? 'media' : 'baja'

  let tendencia: 'mejora' | 'empeora' | 'estable' = 'estable'
  if (conDatos.length >= 4) {
    const ultimas = conDatos.slice(-3)
    const anteriores = conDatos.slice(0, -3)
    const avgUlt = ultimas.reduce((s, x) => s + x.metricas.precision, 0) / ultimas.length
    const avgAnt = anteriores.reduce((s, x) => s + x.metricas.precision, 0) / anteriores.length
    if (avgUlt > avgAnt + 5) tendencia = 'mejora'
    else if (avgUlt < avgAnt - 5) tendencia = 'empeora'
  }

  return {
    totalPracticas: n,
    precisionPromedio: Math.round(precisionPromedio * 10) / 10,
    fuerzaPromedio: Math.round(fuerzaPromedio * 10) / 10,
    inclinacionPromedio: Math.round(inclinacionPromedio * 10) / 10,
    calificacionPromedio: Math.round(calificacionPromedio * 10) / 10,
    desviacionPrecision: Math.round(desviacionPrecision * 10) / 10,
    consistencia,
    tendencia,
  }
}

// ============================================================
// HELPERS DE UI
// ============================================================

function fmtFecha(f: string) {
  return new Date(f).toLocaleString('es-CO', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function calLabel(c: number) {
  if (c >= 4.5) return 'Sobresaliente'
  if (c >= 4.0) return 'Excelente'
  if (c >= 3.5) return 'Bueno'
  if (c >= 3.0) return 'Aceptable'
  return 'Necesita mejorar'
}

function nivelDesempeno(precision: number): 'optimo' | 'aceptable' | 'riesgo' {
  if (precision >= 75) return 'optimo'
  if (precision >= 50) return 'aceptable'
  return 'riesgo'
}

// ============================================================
// SUB-COMPONENTES
// ============================================================

function MetricCard({
  icon, title, value, subtitle, color, bg,
}: {
  icon: React.ReactNode; title: string; value: string
  subtitle?: string; color: string; bg: string
}) {
  return (
    <div className={`${bg} rounded-xl p-4 border border-transparent hover:border-gray-300 transition-colors`}>
      <div className={`${color} mb-2`}>{icon}</div>
      <p className="text-xs font-medium text-gray-500 mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  )
}

function DiffBadge({ value, unit, invert = false }: { value: number; unit: string; invert?: boolean }) {
  const better = invert ? value < 0 : value > 0
  const neutral = Math.abs(value) < 0.05
  const sign = value > 0 ? '+' : ''
  const colorClass = neutral
    ? 'text-gray-600 bg-gray-100'
    : better ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'
  const Icon = neutral ? Minus : better ? TrendingUp : TrendingDown
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-semibold ${colorClass}`}>
      <Icon size={13} />
      {sign}{Math.abs(value).toFixed(1)}{unit}
    </span>
  )
}

function NivelBadge({ nivel }: { nivel: 'optimo' | 'aceptable' | 'riesgo' }) {
  const cfg = {
    optimo: { label: 'Óptimo', icon: '🏆', cls: 'bg-green-100 text-green-800 border-green-300' },
    aceptable: { label: 'Aceptable', icon: '✅', cls: 'bg-blue-100 text-blue-800 border-blue-300' },
    riesgo: { label: 'En Riesgo', icon: '⚠️', cls: 'bg-red-100 text-red-800 border-red-300' },
  }[nivel]
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-semibold ${cfg.cls}`}>
      {cfg.icon} {cfg.label}
    </span>
  )
}

function TendenciaBadge({ t }: { t: 'mejora' | 'empeora' | 'estable' }) {
  const cfg = {
    mejora: { label: 'Mejorando', Icon: TrendingUp, cls: 'text-green-700 bg-green-100' },
    empeora: { label: 'Descendiendo', Icon: TrendingDown, cls: 'text-red-700 bg-red-100' },
    estable: { label: 'Estable', Icon: Minus, cls: 'text-gray-700 bg-gray-100' },
  }[t]
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${cfg.cls}`}>
      <cfg.Icon size={14} /> {cfg.label}
    </span>
  )
}

/**
 * Grid de métricas con orden fijo:
 * Precisión → Fuerza → Inclinación → Calificación
 */
function MetricasGrid({
  precision, precisionSubtitle,
  fuerza, fuerzaSubtitle,
  inclinacion, inclinacionSubtitle,
  calificacion, calificacionSubtitle,
}: {
  precision: string; precisionSubtitle?: string
  fuerza: string; fuerzaSubtitle?: string
  inclinacion: string; inclinacionSubtitle?: string
  calificacion: string; calificacionSubtitle?: string
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <MetricCard
        icon={<BarChart3 size={20} />}
        title="Precisión"
        value={precision}
        subtitle={precisionSubtitle}
        color="text-green-600"
        bg="bg-green-50"
      />
      <MetricCard
        icon={<Activity size={20} />}
        title="Fuerza Promedio"
        value={fuerza}
        subtitle={fuerzaSubtitle}
        color="text-blue-600"
        bg="bg-blue-50"
      />
      <MetricCard
        icon={<Target size={20} />}
        title="Inclinación"
        value={inclinacion}
        subtitle={inclinacionSubtitle}
        color="text-purple-600"
        bg="bg-purple-50"
      />
      <MetricCard
        icon={<Award size={20} />}
        title="Calificación"
        value={calificacion}
        subtitle={calificacionSubtitle}
        color="text-yellow-600"
        bg="bg-yellow-50"
      />
    </div>
  )
}

function PracticaHistorialItem({
  practica, index, metricas, sinDatos,
}: {
  practica: Practica
  index: number
  metricas: MetricasCalculadas | null
  sinDatos: boolean
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-gray-800">Práctica #{index + 1}</span>
          <span className="text-sm text-gray-500">{fmtFecha(practica.fecha_inicio)}</span>
        </div>
        <div className="flex items-center gap-2">
          {metricas
            ? <span className="text-sm font-bold text-blue-600">{metricas.calificacion.toFixed(1)} / 5.0</span>
            : <span className="text-xs text-gray-400">Sin datos</span>}
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={`text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>
      {open && (
        <div className="p-4 bg-white">
          {metricas ? (
            <MetricasGrid
              precision={`${metricas.precision}%`}
              precisionSubtitle={`${metricas.totalLecturas} lecturas`}
              fuerza={`${metricas.fuerzaPromedio}g`}
              fuerzaSubtitle={`${metricas.fuerzaMin}g – ${metricas.fuerzaMax}g`}
              inclinacion={`${metricas.inclinacionPromedio}°`}
              inclinacionSubtitle="Rango óptimo: 10°–30°"
              calificacion={metricas.calificacion.toFixed(1)}
              calificacionSubtitle={calLabel(metricas.calificacion)}
            />
          ) : (
            <p className="text-sm text-gray-500 py-2">
              {sinDatos
                ? 'Esta práctica no tiene datos de sensores registrados.'
                : 'Cargando métricas...'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function ReportesPage() {
  const searchParams = useSearchParams()
  const estudianteIdParam = searchParams.get('estudiante_id')

  const [estudiantes, setEstudiantes] = useState<any[]>([])
  const [selectedEstudiante, setSelectedEstudiante] = useState<number | null>(
    estudianteIdParam ? parseInt(estudianteIdParam) : null
  )
  const [practicas, setPracticas] = useState<Practica[]>([])
  const [estudianteInfo, setEstudianteInfo] = useState<any>(null)
  const [metricasPorPractica, setMetricasPorPractica] = useState<Record<number, MetricasCalculadas | null>>({})
  const [sinDatosPorPractica, setSinDatosPorPractica] = useState<Record<number, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [loadingMetricas, setLoadingMetricas] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const globales = useMemo(
    () => loadingMetricas ? null : calcularMetricasGlobales(practicas, metricasPorPractica),
    [practicas, metricasPorPractica, loadingMetricas]
  )

  const ultimaPractica = useMemo(
    () => (practicas.length > 0 ? practicas[practicas.length - 1] : null),
    [practicas]
  )

  const metricasUltima = useMemo(
    () => (ultimaPractica ? metricasPorPractica[ultimaPractica.id] ?? null : null),
    [ultimaPractica, metricasPorPractica]
  )

  const comparativo = useMemo(() => {
    if (!metricasUltima || !globales) return null
    return {
      difPrecision: metricasUltima.precision - globales.precisionPromedio,
      difFuerza: metricasUltima.fuerzaPromedio - globales.fuerzaPromedio,
      difInclinacion: metricasUltima.inclinacionPromedio - globales.inclinacionPromedio,
      difCalificacion: metricasUltima.calificacion - globales.calificacionPromedio,
      nivel: nivelDesempeno(metricasUltima.precision),
    }
  }, [metricasUltima, globales])

  useEffect(() => {
    estudiantesApi.listar().then((data: any[]) => {
      setEstudiantes(Array.isArray(data) ? data.filter((e: any) => e.activo) : [])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedEstudiante) return
    cargarDatos(selectedEstudiante)
  }, [selectedEstudiante])

  async function cargarDatos(estudianteId: number) {
    setLoading(true)
    setError(null)
    setPracticas([])
    setMetricasPorPractica({})
    setSinDatosPorPractica({})
    setEstudianteInfo(null)

    try {
      const estList: any[] = await estudiantesApi.listar()
      const est = estList.find((e: any) => e.id === estudianteId)
      setEstudianteInfo(est ?? null)

      const allPracticas: any[] = await practicasApi.listar()
      const finalizadas: Practica[] = (Array.isArray(allPracticas) ? allPracticas : [])
        .filter((p: any) => p.estudiante?.id === estudianteId && p.estado === 'finalizada')
        .sort((a: any, b: any) => new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime())

      setPracticas(finalizadas)
      setLoading(false)

      if (finalizadas.length === 0) return

      setLoadingMetricas(true)
      const results = await Promise.allSettled(
        finalizadas.map(p => fetchSensorData(p.id))
      )

      const nuevasMetricas: Record<number, MetricasCalculadas | null> = {}
      const nuevasSinDatos: Record<number, boolean> = {}

      results.forEach((result, i) => {
        const practica = finalizadas[i]
        if (result.status === 'fulfilled') {
          const datos = result.value
          if (datos.length === 0) {
            nuevasMetricas[practica.id] = null
            nuevasSinDatos[practica.id] = true
          } else {
            nuevasMetricas[practica.id] = calcularMetricasDesdeSensores(practica, datos)
            nuevasSinDatos[practica.id] = false
          }
        } else {
          nuevasMetricas[practica.id] = null
          nuevasSinDatos[practica.id] = false
        }
      })

      setMetricasPorPractica(nuevasMetricas)
      setSinDatosPorPractica(nuevasSinDatos)
      setLoadingMetricas(false)
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos')
      setLoading(false)
      setLoadingMetricas(false)
    }
  }

  const hayDatosParaMostrar = globales !== null && metricasUltima !== null

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-2 sm:p-4 md:p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4 sm:mb-6">
          <ArrowLeft size={20} className="mr-2" />Volver al inicio
        </Link>

        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-1 flex items-center flex-wrap">
            <FileText size={28} className="mr-2 text-purple-600" />
            Análisis de Desempeño
          </h1>
          <p className="text-sm text-gray-500">
            Métricas calculadas directamente desde los datos de los sensores
          </p>
        </div>

        {/* Selector de estudiante */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Seleccionar Estudiante</label>
          <select
            value={selectedEstudiante || ''}
            onChange={e => setSelectedEstudiante(Number(e.target.value))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 bg-white text-sm sm:text-base"
          >
            <option value="">-- Seleccione un estudiante --</option>
            {estudiantes.map(est => (
              <option key={est.id} value={est.id}>
                {est.nombre_completo} ({est.codigo_estudiante})
              </option>
            ))}
          </select>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-xl mb-4 flex items-center gap-2 text-sm">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-purple-500 mr-3" size={32} />
            <p className="text-gray-500">Cargando datos...</p>
          </div>
        )}

        {/* Sin prácticas */}
        {!loading && selectedEstudiante && practicas.length === 0 && !error && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <FileText size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No hay prácticas finalizadas para este estudiante.</p>
          </div>
        )}

        {!loading && practicas.length > 0 && (
          <div className="space-y-5">

            {/* Info del estudiante */}
            {estudianteInfo && (
              <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Información del Estudiante</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Nombre', value: estudianteInfo.nombre_completo },
                    { label: 'Código', value: estudianteInfo.codigo_estudiante },
                    { label: 'Programa', value: estudianteInfo.programa },
                    { label: 'Prácticas finalizadas', value: practicas.length.toString() },
                  ].map(({ label, value }) => (
                    <div key={label} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">{label}</p>
                      <p className="font-semibold text-gray-900 text-sm break-words">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Loading métricas */}
            {loadingMetricas && (
              <div className="bg-white rounded-xl shadow-lg p-6 flex items-center gap-3 text-gray-500">
                <Loader2 className="animate-spin text-purple-400" size={20} />
                <span className="text-sm">Calculando métricas desde datos de sensores...</span>
              </div>
            )}

            {/* Sin datos de sensores */}
            {!loadingMetricas && !hayDatosParaMostrar && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800 text-sm">Sin datos de sensores</p>
                  <p className="text-amber-700 text-sm mt-0.5">
                    Las prácticas finalizadas no tienen lecturas de sensores registradas.
                    Las métricas se muestran cuando el dispositivo ESP32 ha enviado datos durante la sesión.
                  </p>
                </div>
              </div>
            )}

            {/* ── REPORTE ÚLTIMA PRÁCTICA ── */}
            {metricasUltima && ultimaPractica && (
              <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
                <div className="flex items-start justify-between mb-1">
                  <h2 className="text-xl font-bold text-gray-900">📋 Reporte Final — Última Práctica</h2>
                  <span className="text-sm text-gray-400 mt-1">{fmtFecha(ultimaPractica.fecha_inicio)}</span>
                </div>
                
                <MetricasGrid
                  precision={`${metricasUltima.precision}%`}
                  precisionSubtitle="Lecturas con técnica correcta"
                  fuerza={`${metricasUltima.fuerzaPromedio}g`}
                  fuerzaSubtitle={`Rango: ${metricasUltima.fuerzaMin}g – ${metricasUltima.fuerzaMax}g`}
                  inclinacion={`${metricasUltima.inclinacionPromedio}°`}
                  inclinacionSubtitle="Rango óptimo: 10°–30°"
                  calificacion={metricasUltima.calificacion.toFixed(1)}
                  calificacionSubtitle={calLabel(metricasUltima.calificacion)}
                />
              </div>
            )}

            {/* ── MÉTRICAS GLOBALES ── */}
            {globales && (
              <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-1">📊 Métricas Globales</h2>
                <p className="text-sm text-gray-500 mb-5">
                  Promedio de {globales.totalPracticas} práctica(s) con datos de sensores
                </p>
                <MetricasGrid
                  precision={`${globales.precisionPromedio}%`}
                  precisionSubtitle={`Desv: ±${globales.desviacionPrecision}%`}
                  fuerza={`${globales.fuerzaPromedio}g`}
                  fuerzaSubtitle="Promedio histórico"
                  inclinacion={`${globales.inclinacionPromedio}°`}
                  inclinacionSubtitle="Promedio histórico"
                  calificacion={globales.calificacionPromedio.toFixed(1)}
                  calificacionSubtitle={`Consistencia: ${globales.consistencia}`}
                />
              </div>
            )}

            {/* ── ANÁLISIS COMPARATIVO ── */}
            {comparativo && globales && metricasUltima && (
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl shadow-lg p-4 sm:p-6 border border-orange-200">
                <h2 className="text-xl font-bold text-gray-900 mb-1">🔍 Análisis Comparativo</h2>
                <p className="text-sm text-gray-500 mb-5">
                  {globales.totalPracticas} práctica(s) con datos de sensores
                </p>

                {globales.totalPracticas < 2 ? (
                  <div className="bg-white rounded-lg p-4 text-sm text-gray-500">
                    El análisis comparativo estará disponible a partir de 2 prácticas con datos.
                  </div>
                ) : (
                  <div className="space-y-4">

                    {/* PANEL 1 — Última vs promedio histórico */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="bg-white rounded-xl p-4">
                        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                          <BarChart3 size={16} /> Última práctica vs Promedio histórico
                        </h3>
                        <div className="space-y-3">
                          {[
                            { label: 'Precisión',    diff: comparativo.difPrecision,    unit: '%', invert: false, desc: 'Mayor es mejor' },
                            { label: 'Fuerza',       diff: comparativo.difFuerza,       unit: 'g', invert: true,  desc: 'Menor variación es mejor' },
                            { label: 'Inclinación',  diff: comparativo.difInclinacion,  unit: '°', invert: true,  desc: 'Más cercano a 20° es mejor' },
                            { label: 'Calificación', diff: comparativo.difCalificacion, unit: '',  invert: false, desc: 'Mayor es mejor' },
                          ].map(({ label, diff, unit, invert, desc }) => (
                            <div key={label} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                              <div>
                                <span className="text-sm font-medium text-gray-700">{label}</span>
                                <p className="text-xs text-gray-400">{desc}</p>
                              </div>
                              <DiffBadge value={diff} unit={unit} invert={invert} />
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-white rounded-xl p-4">
                        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                          <Award size={16} /> Evaluación
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <p className="text-xs text-gray-500 mb-1.5">Nivel de desempeño (última práctica)</p>
                            <NivelBadge nivel={comparativo.nivel} />
                            <p className="text-xs text-gray-400 mt-1.5">
                              Basado en {metricasUltima.precision}% de precisión
                              {comparativo.nivel === 'optimo' && ' — ¡Por encima del 75%!'}
                              {comparativo.nivel === 'aceptable' && ' — Entre 50% y 75%'}
                              {comparativo.nivel === 'riesgo' && ' — Por debajo del 50%, requiere práctica'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1.5">
                              Tendencia
                              {globales.totalPracticas < 4 && (
                                <span className="ml-1 text-gray-400">(disponible desde 4 prácticas)</span>
                              )}
                            </p>
                            <TendenciaBadge t={globales.tendencia} />
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 leading-relaxed">
                            {comparativo.difPrecision > 5
                              ? `La última práctica supera el promedio histórico en precisión (+${comparativo.difPrecision.toFixed(1)}%). `
                              : comparativo.difPrecision < -5
                                ? `La última práctica está por debajo del promedio en precisión (${comparativo.difPrecision.toFixed(1)}%). `
                                : 'La precisión de la última práctica es consistente con el promedio histórico. '}
                            {comparativo.difCalificacion >= 0.3
                              ? `La calificación mejoró respecto al promedio (+${comparativo.difCalificacion.toFixed(1)}).`
                              : comparativo.difCalificacion <= -0.3
                                ? `La calificación bajó respecto al promedio (${comparativo.difCalificacion.toFixed(1)}).`
                                : 'La calificación se mantiene estable.'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* PANEL 2 — Gráfico de evolución */}
                    {(() => {
                      const datosGrafico = practicas
                        .map((p, i) => {
                          const m = metricasPorPractica[p.id]
                          if (!m) return null
                          return {
                            name: `#${i + 1}`,
                            precision: m.precision,
                            calificacionReal: m.calificacion,
                            fuerza: m.fuerzaPromedio,
                            inclinacion: m.inclinacionPromedio,
                          }
                        })
                        .filter(Boolean) as any[]

                      if (datosGrafico.length < 2) return null

                      return (
                        <div className="bg-white rounded-xl p-4">
                          <h3 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
                            <TrendingUp size={16} /> Progreso entre Prácticas
                          </h3>
                          <p className="text-xs text-gray-400 mb-4">
                            Evolución de métricas clave a lo largo del tiempo
                          </p>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                            {/* Gráfico — Precisión */}
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-0.5">Precisión (%)</p>
                              <p className="text-xs text-gray-400 mb-2">Porcentaje de lecturas con técnica correcta</p>
                              <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={datosGrafico} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                                  <Tooltip formatter={(value: any) => [`${value}%`, 'Precisión']} />
                                  <Legend formatter={() => 'Precisión'} />
                                  <ReferenceLine y={75} stroke="#22c55e" strokeDasharray="4 4" label="75% objetivo" />
                                  <Line type="monotone" dataKey="precision" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>

                            {/* Gráfico — Calificación */}
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-0.5">Calificación (0–5)</p>
                              <p className="text-xs text-gray-400 mb-2">Progreso general del aprendizaje del estudiante</p>
                              <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={datosGrafico} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                  <YAxis domain={[0, 5]} tick={{ fontSize: 12 }} />
                                  <Tooltip formatter={(value: any) => [`${parseFloat(value).toFixed(1)} / 5.0`, 'Calificación']} />
                                  <Legend formatter={() => 'Calificación'} />
                                  <Line type="monotone" dataKey="calificacionReal" stroke="#eab308" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>

                            {/* Gráfico — Fuerza */}
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-0.5">Fuerza promedio (g)</p>
                              <p className="text-xs text-gray-400 mb-2">Menor variación es mejor</p>
                              <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={datosGrafico} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                  <YAxis domain={[0, 400]} tick={{ fontSize: 12 }} />
                                  <Tooltip formatter={(value: any) => [`${value}g`, 'Fuerza']} />
                                  <Legend formatter={() => 'Fuerza'} />
                                  <ReferenceArea y1={50} y2={300} fill="#3b82f6" fillOpacity={0.08} />
                                  <ReferenceLine y={300} stroke="#3b82f6" strokeDasharray="3 3" strokeOpacity={0.5} label={{ value: '300g', position: 'insideTopLeft', fontSize: 10, fill: '#3b82f6' }} />
                                  <ReferenceLine y={50} stroke="#3b82f6" strokeDasharray="3 3" strokeOpacity={0.5} label={{ value: '50g', position: 'insideBottomLeft', fontSize: 10, fill: '#3b82f6' }} />
                                  <ReferenceLine y={175} stroke="none" label={{ value: 'Rango óptimo', position: 'insideTopRight', fontSize: 10, fill: '#3b82f6', opacity: 0.6 }} />
                                  <Line type="monotone" dataKey="fuerza" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>

                            {/* Gráfico — Inclinación */}
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-0.5">Inclinación promedio (°)</p>
                              <p className="text-xs text-gray-400 mb-2">Menor variación es mejor</p>
                              <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={datosGrafico} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                  <YAxis domain={[0, 50]} tick={{ fontSize: 12 }} />
                                  <Tooltip formatter={(value: any) => [`${value}°`, 'Inclinación']} />
                                  <Legend formatter={() => 'Inclinación'} />
                                  <ReferenceArea y1={10} y2={30} fill="#a855f7" fillOpacity={0.08} />
                                  <ReferenceLine y={30} stroke="#a855f7" strokeDasharray="3 3" strokeOpacity={0.5} label={{ value: '30°', position: 'insideTopLeft', fontSize: 10, fill: '#a855f7' }} />
                                  <ReferenceLine y={10} stroke="#a855f7" strokeDasharray="3 3" strokeOpacity={0.5} label={{ value: '10°', position: 'insideBottomLeft', fontSize: 10, fill: '#a855f7' }} />
                                  <ReferenceLine y={20} stroke="none" label={{ value: 'Rango óptimo', position: 'insideTopRight', fontSize: 10, fill: '#a855f7', opacity: 0.6 }} />
                                  <Line type="monotone" dataKey="inclinacion" stroke="#a855f7" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>

                          </div>
                        </div>
                      )
                    })()}

                    {/* PANEL 3 — Primera vs Última práctica */}
                    {(() => {
                      const conDatos = practicas
                        .map((p, i) => ({ p, i, m: metricasPorPractica[p.id] }))
                        .filter((x): x is { p: Practica; i: number; m: MetricasCalculadas } => x.m !== null && x.m !== undefined)

                      if (conDatos.length < 2) return null

                      const primera = conDatos[0]
                      const ultima  = conDatos[conDatos.length - 1]

                      const filas: { label: string; primera: string; ultima: string; diff: string; positivo: boolean | null }[] = [
                        {
                          label: 'Precisión',
                          primera: `${primera.m.precision}%`,
                          ultima: `${ultima.m.precision}%`,
                          diff: `${ultima.m.precision - primera.m.precision > 0 ? '+' : ''}${(ultima.m.precision - primera.m.precision).toFixed(1)}%`,
                          positivo: ultima.m.precision > primera.m.precision ? true : ultima.m.precision < primera.m.precision ? false : null
                        },
                        {
                          label: 'Fuerza',
                          primera: `${primera.m.fuerzaPromedio}g`,
                          ultima: `${ultima.m.fuerzaPromedio}g`,
                          diff: `${ultima.m.fuerzaPromedio - primera.m.fuerzaPromedio > 0 ? '+' : ''}${(ultima.m.fuerzaPromedio - primera.m.fuerzaPromedio).toFixed(1)}g`,
                          positivo: null
                        },
                        {
                          label: 'Inclinación',
                          primera: `${primera.m.inclinacionPromedio}°`,
                          ultima: `${ultima.m.inclinacionPromedio}°`,
                          diff: `${ultima.m.inclinacionPromedio - primera.m.inclinacionPromedio > 0 ? '+' : ''}${(ultima.m.inclinacionPromedio - primera.m.inclinacionPromedio).toFixed(1)}°`,
                          positivo: null
                        },
                        {
                          label: 'Calificación',
                          primera: `${primera.m.calificacion.toFixed(1)}`,
                          ultima: `${ultima.m.calificacion.toFixed(1)}`,
                          diff: `${ultima.m.calificacion - primera.m.calificacion > 0 ? '+' : ''}${(ultima.m.calificacion - primera.m.calificacion).toFixed(1)}`,
                          positivo: ultima.m.calificacion > primera.m.calificacion ? true : ultima.m.calificacion < primera.m.calificacion ? false : null
                        },
                      ]

                      return (
                        <div className="bg-white rounded-xl p-4">
                          <h3 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
                            <TrendingUp size={16} /> Primera vs Última Práctica
                          </h3>
                          <p className="text-xs text-gray-400 mb-4">
                            Práctica #1 ({fmtFecha(primera.p.fecha_inicio)}) → Práctica #{ultima.i + 1} ({fmtFecha(ultima.p.fecha_inicio)})
                          </p>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-gray-100">
                                  <th className="text-left py-2 text-xs font-medium text-gray-500">Métrica</th>
                                  <th className="text-center py-2 text-xs font-medium text-gray-500">📅 Primera</th>
                                  <th className="text-center py-2 text-xs font-medium text-blue-600">📅 Última</th>
                                  <th className="text-center py-2 text-xs font-medium text-gray-500">Cambio</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filas.map(({ label, primera: vp, ultima: vu, diff, positivo }) => (
                                  <tr key={label} className="border-b border-gray-50 last:border-0">
                                    <td className="py-2.5 text-gray-600 font-medium">{label}</td>
                                    <td className="py-2.5 text-center">
                                      <span className="text-gray-600 bg-gray-50 px-2 py-0.5 rounded-lg font-medium">{vp}</span>
                                    </td>
                                    <td className="py-2.5 text-center">
                                      <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg">{vu}</span>
                                    </td>
                                    <td className="py-2.5 text-center">
                                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${
                                        positivo === true  ? 'text-green-700 bg-green-50' :
                                        positivo === false ? 'text-red-600 bg-red-50' :
                                        'text-gray-500 bg-gray-50'
                                      }`}>
                                        {diff}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )
                    })()}

                  </div>
                )}
              </div>
            )}

            {/* ── HISTORIAL ── */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">📅 Historial de Prácticas</h2>
              {loadingMetricas && (
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-3">
                  <Loader2 className="animate-spin" size={16} />
                  Calculando métricas de cada práctica...
                </div>
              )}
              <div className="space-y-2">
                {practicas.map((p, i) => (
                  <PracticaHistorialItem
                    key={p.id}
                    practica={p}
                    index={i}
                    metricas={metricasPorPractica[p.id] ?? null}
                    sinDatos={sinDatosPorPractica[p.id] ?? false}
                  />
                ))}
              </div>
            </div>

          </div>
        )}

        {/* Estado vacío inicial */}
        {!selectedEstudiante && !loading && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <FileText size={48} className="mx-auto text-gray-300 mb-3" />
            <h3 className="text-lg font-semibold text-gray-600 mb-1">Selecciona un estudiante</h3>
            <p className="text-sm text-gray-400">
              Las métricas se calculan en tiempo real desde los datos capturados por el sensor
            </p>
          </div>
        )}

      </div>
      <HelpButton />
    </div>
  )
}