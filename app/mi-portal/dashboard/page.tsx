'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import {
  LogOut, User, BookOpen, FileText, TrendingUp, TrendingDown,
  Minus, Target, Award, Activity, BarChart3, AlertCircle, Loader2,
  Settings,
} from 'lucide-react'
import Link from 'next/link'
// @ts-ignore
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceArea, Legend,
} from 'recharts'


const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ─────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────

interface PerfilEstudiante {
  id: number
  codigo_estudiante: string
  nombre_completo: string
  correo: string
  programa: string
  semestre: number
  telefono?: string
  profesor_nombre?: string
}

interface Practica {
  id: number
  fecha_inicio: string
  fecha_fin?: string
  duracion_total_segundos: number
  estado: string
}

interface SensorData {
  fuerza: number
  angulo_pitch: number
  tecnica_correcta: boolean
}

interface MetricasCalculadas {
  fuerzaPromedio: number
  fuerzaMax: number
  fuerzaMin: number
  inclinacionPromedio: number
  precision: number
  calificacion: number
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

// ─────────────────────────────────────────────────────────────
// LÓGICA DE CÁLCULO (idéntica a reportes del profesor)
// ─────────────────────────────────────────────────────────────

async function fetchSensorData(practicaId: number, token: string): Promise<SensorData[]> {
  const allData: SensorData[] = []
  let url: string | null = `${API_URL}/api/placa/datos-sensores/?practica=${practicaId}`

  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return allData
    const json: any = await res.json()
    const items: any[] = Array.isArray(json) ? json : (json.results ?? [])
    items.forEach((d: any) => {
      allData.push({
        fuerza:          parseFloat(d.fuerza)       || 0,
        angulo_pitch:    parseFloat(d.angulo_pitch)  || 0,
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

  const fuerzaPromedio     = datos.reduce((s, d) => s + d.fuerza, 0) / n
  const fuerzaMax          = Math.max(...datos.map((d) => d.fuerza))
  const fuerzaMin          = Math.min(...datos.map((d) => d.fuerza))
  const inclinacionPromedio = datos.reduce((s, d) => s + d.angulo_pitch, 0) / n
  const lectCorrectas      = datos.filter((d) => d.tecnica_correcta).length
  const precision          = (lectCorrectas / n) * 100

  const pPrecision = (precision / 100) * 2.0

  const distAngulo = Math.abs(inclinacionPromedio - 20)
  const pAngulo =
    distAngulo <= 5  ? 1.5
    : distAngulo <= 10 ? 1.5 - ((distAngulo - 5)  / 5)  * 0.5
    : distAngulo <= 20 ? 1.0 - ((distAngulo - 10) / 10) * 0.5
    : 0.3

  const distFuerza = Math.abs(fuerzaPromedio - 175)
  const pFuerza =
    distFuerza <= 50  ? 1.5
    : distFuerza <= 100 ? 1.5 - ((distFuerza - 50)  / 50) * 0.5
    : distFuerza <= 175 ? 1.0 - ((distFuerza - 100) / 75) * 0.5
    : 0.3

  const calificacion = Math.min(5.0, Math.round((pPrecision + pAngulo + pFuerza) * 10) / 10)

  return {
    fuerzaPromedio:      Math.round(fuerzaPromedio      * 10) / 10,
    fuerzaMax:           Math.round(fuerzaMax           * 10) / 10,
    fuerzaMin:           Math.round(fuerzaMin           * 10) / 10,
    inclinacionPromedio: Math.round(inclinacionPromedio * 10) / 10,
    precision:           Math.round(precision           * 10) / 10,
    calificacion,
    totalLecturas:       n,
    duracionSegundos:    practica.duracion_total_segundos,
  }
}

function calcularMetricasGlobales(
  practicas: Practica[],
  metricasPorPractica: Record<number, MetricasCalculadas | null>
): MetricasGlobales | null {
  const conDatos = practicas
    .map((p) => ({ p, m: metricasPorPractica[p.id] }))
    .filter((x): x is { p: Practica; m: MetricasCalculadas } => x.m !== null && x.m !== undefined)

  if (conDatos.length === 0) return null

  const n = conDatos.length
  const precisionPromedio     = conDatos.reduce((s, x) => s + x.m.precision, 0) / n
  const fuerzaPromedio        = conDatos.reduce((s, x) => s + x.m.fuerzaPromedio, 0) / n
  const inclinacionPromedio   = conDatos.reduce((s, x) => s + x.m.inclinacionPromedio, 0) / n
  const calificacionPromedio  = conDatos.reduce((s, x) => s + x.m.calificacion, 0) / n

  const varianza = conDatos.reduce((s, x) => {
    const d = x.m.precision - precisionPromedio
    return s + d * d
  }, 0) / n
  const desviacionPrecision = Math.sqrt(varianza)

  const consistencia: MetricasGlobales['consistencia'] =
    desviacionPrecision < 10 ? 'alta' : desviacionPrecision < 20 ? 'media' : 'baja'

  let tendencia: MetricasGlobales['tendencia'] = 'estable'
  if (conDatos.length >= 4) {
    const ultimas    = conDatos.slice(-3)
    const anteriores = conDatos.slice(0, -3)
    const avgUlt = ultimas.reduce((s, x) => s + x.m.precision, 0)    / ultimas.length
    const avgAnt = anteriores.reduce((s, x) => s + x.m.precision, 0) / anteriores.length
    if (avgUlt > avgAnt + 5)      tendencia = 'mejora'
    else if (avgUlt < avgAnt - 5) tendencia = 'empeora'
  }

  return {
    totalPracticas:      n,
    precisionPromedio:   Math.round(precisionPromedio   * 10) / 10,
    fuerzaPromedio:      Math.round(fuerzaPromedio      * 10) / 10,
    inclinacionPromedio: Math.round(inclinacionPromedio * 10) / 10,
    calificacionPromedio:Math.round(calificacionPromedio* 10) / 10,
    desviacionPrecision: Math.round(desviacionPrecision * 10) / 10,
    consistencia,
    tendencia,
  }
}

// ─────────────────────────────────────────────────────────────
// HELPERS DE UI
// ─────────────────────────────────────────────────────────────

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

function nivelDesempeno(p: number): 'optimo' | 'aceptable' | 'riesgo' {
  if (p >= 75) return 'optimo'
  if (p >= 50) return 'aceptable'
  return 'riesgo'
}

// ─────────────────────────────────────────────────────────────
// SUB-COMPONENTES
// ─────────────────────────────────────────────────────────────

function MetricCard({
  icon, title, value, subtitle, color, bg,
}: {
  icon: React.ReactNode; title: string; value: string
  subtitle?: string; color: string; bg: string
}) {
  return (
    <div className={`${bg} rounded-xl p-4`}>
      <div className={`${color} mb-2`}>{icon}</div>
      <p className="text-xs font-medium text-gray-500 mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  )
}

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
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <MetricCard icon={<BarChart3 size={20} />} title="Precisión"        value={precision}    subtitle={precisionSubtitle}    color="text-green-600"  bg="bg-green-50"  />
      <MetricCard icon={<Activity  size={20} />} title="Fuerza Promedio"  value={fuerza}       subtitle={fuerzaSubtitle}       color="text-blue-600"   bg="bg-blue-50"   />
      <MetricCard icon={<Target    size={20} />} title="Inclinación"      value={inclinacion}  subtitle={inclinacionSubtitle}  color="text-purple-600" bg="bg-purple-50" />
      <MetricCard icon={<Award     size={20} />} title="Calificación"     value={calificacion} subtitle={calificacionSubtitle} color="text-yellow-600" bg="bg-yellow-50" />
    </div>
  )
}

function DiffBadge({ value, unit, invert = false }: { value: number; unit: string; invert?: boolean }) {
  const better  = invert ? value < 0 : value > 0
  const neutral = Math.abs(value) < 0.05
  const sign    = value > 0 ? '+' : ''
  const cls     = neutral ? 'text-gray-600 bg-gray-100' : better ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'
  const Icon    = neutral ? Minus : better ? TrendingUp : TrendingDown
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-semibold ${cls}`}>
      <Icon size={13} />{sign}{Math.abs(value).toFixed(1)}{unit}
    </span>
  )
}

function NivelBadge({ nivel }: { nivel: 'optimo' | 'aceptable' | 'riesgo' }) {
  const cfg = {
    optimo:    { label: 'Óptimo',    icon: '🏆', cls: 'bg-green-100 text-green-800 border-green-300' },
    aceptable: { label: 'Aceptable', icon: '✅', cls: 'bg-blue-100 text-blue-800 border-blue-300'   },
    riesgo:    { label: 'En Riesgo', icon: '⚠️', cls: 'bg-red-100 text-red-800 border-red-300'     },
  }[nivel]
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-semibold ${cfg.cls}`}>
      {cfg.icon} {cfg.label}
    </span>
  )
}

function TendenciaBadge({ t }: { t: MetricasGlobales['tendencia'] }) {
  const cfg = {
    mejora:   { label: 'Mejorando',    Icon: TrendingUp,   cls: 'text-green-700 bg-green-100' },
    empeora:  { label: 'Descendiendo', Icon: TrendingDown, cls: 'text-red-700 bg-red-100'     },
    estable:  { label: 'Estable',      Icon: Minus,        cls: 'text-gray-700 bg-gray-100'   },
  }[t]
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${cfg.cls}`}>
      <cfg.Icon size={14} /> {cfg.label}
    </span>
  )
}

function PracticaItem({
  practica, index, metricas, sinDatos,
}: {
  practica: Practica; index: number
  metricas: MetricasCalculadas | null; sinDatos: boolean
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
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
              {sinDatos ? 'Esta práctica no tiene datos de sensores registrados.' : 'Cargando métricas...'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────

function EstudianteDashboardContent() {
  const { user, logout, accessToken } = useAuth()

  const [perfil,   setPerfil]   = useState<PerfilEstudiante | null>(null)
  const [practicas, setPracticas] = useState<Practica[]>([])
  const [metricasPorPractica, setMetricasPorPractica] = useState<Record<number, MetricasCalculadas | null>>({})
  const [sinDatosPorPractica, setSinDatosPorPractica] = useState<Record<number, boolean>>({})
  const [loading,          setLoading]          = useState(true)
  const [loadingMetricas,  setLoadingMetricas]  = useState(false)
  const [error,            setError]            = useState<string | null>(null)

  // ── Cargar datos al montar ──────────────────────────────────
  useEffect(() => {
    if (!accessToken) return
    cargarDatos(accessToken)
  }, [accessToken])

  async function cargarDatos(token: string) {
    setLoading(true)
    setError(null)

    try {
      // Perfil
      const resPerfil = await fetch(`${API_URL}/api/estudiantes/mi_perfil/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!resPerfil.ok) throw new Error('No se pudo cargar el perfil')
      const perfilData = await resPerfil.json()
      setPerfil(perfilData)

      // Prácticas finalizadas
      const resPracticas = await fetch(`${API_URL}/api/estudiantes/mis_practicas/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!resPracticas.ok) throw new Error('No se pudo cargar las prácticas')
      const practicasData = await resPracticas.json()
      const lista: Practica[] = practicasData.practicas || []
      setPracticas(lista)
      setLoading(false)

      if (lista.length === 0) return

      // Cargar métricas de cada práctica
      setLoadingMetricas(true)
      const results = await Promise.allSettled(
        lista.map((p) => fetchSensorData(p.id, token))
      )

      const nuevasMetricas: Record<number, MetricasCalculadas | null> = {}
      const nuevasSinDatos: Record<number, boolean> = {}

      results.forEach((result, i) => {
        const practica = lista[i]
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
      setError(err.message || 'Error al cargar tus datos')
      setLoading(false)
      setLoadingMetricas(false)
    }
  }

  // ── Métricas derivadas ──────────────────────────────────────
  const globales = useMemo(
    () => (loadingMetricas ? null : calcularMetricasGlobales(practicas, metricasPorPractica)),
    [practicas, metricasPorPractica, loadingMetricas]
  )

  const ultimaPractica = useMemo(() => (practicas.length > 0 ? practicas[practicas.length - 1] : null), [practicas])
  const metricasUltima = useMemo(
    () => (ultimaPractica ? metricasPorPractica[ultimaPractica.id] ?? null : null),
    [ultimaPractica, metricasPorPractica]
  )

  const comparativo = useMemo(() => {
    if (!metricasUltima || !globales) return null
    return {
      difPrecision:    metricasUltima.precision           - globales.precisionPromedio,
      difFuerza:       metricasUltima.fuerzaPromedio      - globales.fuerzaPromedio,
      difInclinacion:  metricasUltima.inclinacionPromedio - globales.inclinacionPromedio,
      difCalificacion: metricasUltima.calificacion        - globales.calificacionPromedio,
      nivel:           nivelDesempeno(metricasUltima.precision),
    }
  }, [metricasUltima, globales])

  // ── Render ──────────────────────────────────────────────────
  const displayName = user?.first_name
    ? `${user.first_name} ${user.last_name}`.trim()
    : user?.username ?? 'Estudiante'

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 p-3 sm:p-5 md:p-8">
      <div className="max-w-5xl mx-auto">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-indigo-600 rounded-full flex items-center justify-center">
              <User size={22} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Bienvenido/a,</p>
              <p className="font-semibold text-gray-900">{displayName}</p>
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                👨‍🎓 Estudiante
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Link
              href="/mi-portal/perfil"
              className="flex items-center gap-2 px-3 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg text-sm transition-colors"
            >
              <Settings size={16} /> Mi perfil
            </Link>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
            >
              <LogOut size={16} /> Salir
            </button>
          </div>
        </div>

        {/* ── Título ─────────────────────────────────────────── */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen size={28} className="text-indigo-600" />
            Mi Portal de Prácticas
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Aquí puedes ver tus prácticas y métricas de desempeño
          </p>
        </div>

        {/* ── Error global ───────────────────────────────────── */}
        {error && (
          <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-xl mb-4 flex items-center gap-2 text-sm">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {/* ── Loading inicial ─────────────────────────────────── */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-indigo-500 mr-3" size={32} />
            <p className="text-gray-500">Cargando tu información...</p>
          </div>
        )}

        {!loading && (
          <div className="space-y-5">

            {/* ── PERFIL ─────────────────────────────────────── */}
            {perfil && (
              <div className="bg-white rounded-xl shadow-lg p-5">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <User size={20} className="text-indigo-600" /> Mi Perfil
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: 'Nombre',    value: perfil.nombre_completo },
                    { label: 'Código',    value: perfil.codigo_estudiante },
                    { label: 'Correo',    value: perfil.correo },
                    { label: 'Programa',  value: perfil.programa },
                    { label: 'Semestre',  value: `Semestre ${perfil.semestre}` },
                    { label: 'Profesor',  value: perfil.profesor_nombre ?? '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="p-3 bg-indigo-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                      <p className="font-semibold text-gray-900 text-sm break-words">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── SIN PRÁCTICAS ──────────────────────────────── */}
            {practicas.length === 0 && !loading && (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <FileText size={52} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">
                  Aún no tienes prácticas finalizadas
                </h3>
                <p className="text-sm text-gray-400">
                  Cuando tu instructor inicie y finalice una sesión contigo,
                  tus resultados aparecerán aquí.
                </p>
              </div>
            )}

            {/* ── CON PRÁCTICAS ──────────────────────────────── */}
            {practicas.length > 0 && (
              <>

                {/* Loading métricas */}
                {loadingMetricas && (
                  <div className="bg-white rounded-xl shadow p-4 flex items-center gap-3 text-gray-500 text-sm">
                    <Loader2 className="animate-spin text-indigo-400" size={18} />
                    Calculando métricas desde datos de sensores...
                  </div>
                )}

                {/* ── REPORTE ÚLTIMA PRÁCTICA ─────────────────── */}
                {metricasUltima && ultimaPractica && (
                  <div className="bg-white rounded-xl shadow-lg p-5">
                    <div className="flex items-start justify-between mb-1">
                      <h2 className="text-lg font-bold text-gray-900">📋 Mi Última Práctica</h2>
                      <span className="text-xs text-gray-400 mt-0.5">{fmtFecha(ultimaPractica.fecha_inicio)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-4">
                      Calculado desde {metricasUltima.totalLecturas} lecturas de sensores
                    </p>
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

                {/* ── MÉTRICAS GLOBALES ───────────────────────── */}
                {globales && (
                  <div className="bg-white rounded-xl shadow-lg p-5">
                    <h2 className="text-lg font-bold text-gray-900 mb-1">📊 Mi Promedio General</h2>
                    <p className="text-xs text-gray-500 mb-4">
                      Basado en {globales.totalPracticas} práctica(s) con datos de sensores
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

                {/* ── ANÁLISIS COMPARATIVO ───────────────────── */}
                {comparativo && globales && metricasUltima && globales.totalPracticas >= 2 && (
                  <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl shadow-lg p-5 border border-orange-200">
                    <h2 className="text-lg font-bold text-gray-900 mb-1">🔍 Mi Análisis Comparativo</h2>
                    <p className="text-xs text-gray-500 mb-4">Última práctica vs tu promedio histórico</p>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Tabla de diferencias */}
                      <div className="bg-white rounded-xl p-4">
                        <h3 className="font-semibold text-gray-800 mb-3 text-sm flex items-center gap-2">
                          <BarChart3 size={15} /> Última práctica vs promedio
                        </h3>
                        <div className="space-y-3">
                          {[
                            { label: 'Precisión',    diff: comparativo.difPrecision,    unit: '%', invert: false },
                            { label: 'Fuerza',       diff: comparativo.difFuerza,       unit: 'g', invert: true  },
                            { label: 'Inclinación',  diff: comparativo.difInclinacion,  unit: '°', invert: true  },
                            { label: 'Calificación', diff: comparativo.difCalificacion, unit: '',  invert: false },
                          ].map(({ label, diff, unit, invert }) => (
                            <div key={label} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                              <span className="text-sm font-medium text-gray-700">{label}</span>
                              <DiffBadge value={diff} unit={unit} invert={invert} />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Evaluación */}
                      <div className="bg-white rounded-xl p-4">
                        <h3 className="font-semibold text-gray-800 mb-3 text-sm flex items-center gap-2">
                          <Award size={15} /> Tu evaluación
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <p className="text-xs text-gray-500 mb-1.5">Nivel de desempeño</p>
                            <NivelBadge nivel={comparativo.nivel} />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1.5">Tendencia
                              {globales.totalPracticas < 4 && (
                                <span className="ml-1 text-gray-400">(disponible desde 4 prácticas)</span>
                              )}
                            </p>
                            <TendenciaBadge t={globales.tendencia} />
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 leading-relaxed">
                            {comparativo.difPrecision > 5
                              ? `Tu última práctica supera tu promedio en precisión (+${comparativo.difPrecision.toFixed(1)}%). ¡Sigue así!`
                              : comparativo.difPrecision < -5
                                ? `Tu precisión bajó respecto a tu promedio (${comparativo.difPrecision.toFixed(1)}%). Practica más.`
                                : 'Tu precisión es consistente con tu promedio histórico.'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Gráficos de evolución */}
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
                        <div className="bg-white rounded-xl p-4 mt-4">
                          <h3 className="font-semibold text-gray-800 mb-1 text-sm flex items-center gap-2">
                            <TrendingUp size={15} /> Mi progreso
                          </h3>
                          <p className="text-xs text-gray-400 mb-4">Evolución a través de tus prácticas</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-2">Precisión (%)</p>
                              <ResponsiveContainer width="100%" height={180}>
                                <LineChart data={datosGrafico} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                                  <Tooltip formatter={(v: any) => [`${v}%`, 'Precisión']} />
                                  <ReferenceLine y={75} stroke="#22c55e" strokeDasharray="4 4" label="75%" />
                                  <Line type="monotone" dataKey="precision" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>

                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-2">Calificación (0–5)</p>
                              <ResponsiveContainer width="100%" height={180}>
                                <LineChart data={datosGrafico} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                  <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                                  <Tooltip formatter={(v: any) => [`${parseFloat(v).toFixed(1)} / 5.0`, 'Calificación']} />
                                  <Line type="monotone" dataKey="calificacionReal" stroke="#eab308" strokeWidth={2} dot={{ r: 4 }} />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>

                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-2">Fuerza promedio (g)</p>
                              <ResponsiveContainer width="100%" height={180}>
                                <LineChart data={datosGrafico} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                  <YAxis domain={[0, 400]} tick={{ fontSize: 11 }} />
                                  <Tooltip formatter={(v: any) => [`${v}g`, 'Fuerza']} />
                                  <ReferenceArea y1={50} y2={300} fill="#3b82f6" fillOpacity={0.07} />
                                  <Line type="monotone" dataKey="fuerza" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>

                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-2">Inclinación promedio (°)</p>
                              <ResponsiveContainer width="100%" height={180}>
                                <LineChart data={datosGrafico} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                  <YAxis domain={[0, 50]} tick={{ fontSize: 11 }} />
                                  <Tooltip formatter={(v: any) => [`${v}°`, 'Inclinación']} />
                                  <ReferenceArea y1={10} y2={30} fill="#a855f7" fillOpacity={0.07} />
                                  <Line type="monotone" dataKey="inclinacion" stroke="#a855f7" strokeWidth={2} dot={{ r: 4 }} />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>

                          </div>
                        </div>
                      )
                    })()}

                    {/* Primera vs última */}
                    {(() => {
                      const conDatos = practicas
                        .map((p, i) => ({ p, i, m: metricasPorPractica[p.id] }))
                        .filter((x): x is { p: Practica; i: number; m: MetricasCalculadas } => x.m !== null && x.m !== undefined)

                      if (conDatos.length < 2) return null
                      const primera = conDatos[0]
                      const ultima  = conDatos[conDatos.length - 1]

                      const filas = [
                        { label: 'Precisión',    vp: `${primera.m.precision}%`,            vu: `${ultima.m.precision}%`,            dif: ultima.m.precision           - primera.m.precision,            positivo: ultima.m.precision           > primera.m.precision ? true : ultima.m.precision           < primera.m.precision ? false : null },
                        { label: 'Fuerza',       vp: `${primera.m.fuerzaPromedio}g`,        vu: `${ultima.m.fuerzaPromedio}g`,        dif: ultima.m.fuerzaPromedio       - primera.m.fuerzaPromedio,       positivo: null },
                        { label: 'Inclinación',  vp: `${primera.m.inclinacionPromedio}°`,   vu: `${ultima.m.inclinacionPromedio}°`,   dif: ultima.m.inclinacionPromedio  - primera.m.inclinacionPromedio,  positivo: null },
                        { label: 'Calificación', vp: primera.m.calificacion.toFixed(1),     vu: ultima.m.calificacion.toFixed(1),     dif: ultima.m.calificacion         - primera.m.calificacion,         positivo: ultima.m.calificacion        > primera.m.calificacion ? true : ultima.m.calificacion        < primera.m.calificacion ? false : null },
                      ]

                      return (
                        <div className="bg-white rounded-xl p-4 mt-4">
                          <h3 className="font-semibold text-gray-800 mb-1 text-sm flex items-center gap-2">
                            <TrendingUp size={15} /> Mi primera vs mi última práctica
                          </h3>
                          <p className="text-xs text-gray-400 mb-3">
                            #{1} ({fmtFecha(primera.p.fecha_inicio)}) → #{ultima.i + 1} ({fmtFecha(ultima.p.fecha_inicio)})
                          </p>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-gray-100">
                                  <th className="text-left py-2 text-xs font-medium text-gray-500">Métrica</th>
                                  <th className="text-center py-2 text-xs font-medium text-gray-500">Primera</th>
                                  <th className="text-center py-2 text-xs font-medium text-blue-600">Última</th>
                                  <th className="text-center py-2 text-xs font-medium text-gray-500">Cambio</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filas.map(({ label, vp, vu, dif, positivo }) => (
                                  <tr key={label} className="border-b border-gray-50 last:border-0">
                                    <td className="py-2 text-gray-600 font-medium">{label}</td>
                                    <td className="py-2 text-center"><span className="text-gray-600 bg-gray-50 px-2 py-0.5 rounded-lg font-medium">{vp}</span></td>
                                    <td className="py-2 text-center"><span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg">{vu}</span></td>
                                    <td className="py-2 text-center">
                                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${
                                        positivo === true  ? 'text-green-700 bg-green-50' :
                                        positivo === false ? 'text-red-600 bg-red-50'    :
                                        'text-gray-500 bg-gray-50'
                                      }`}>
                                        {dif > 0 ? '+' : ''}{dif.toFixed(1)}
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

                {/* ── HISTORIAL ──────────────────────────────── */}
                <div className="bg-white rounded-xl shadow-lg p-5">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">📅 Historial de mis Prácticas</h2>
                  {loadingMetricas && (
                    <div className="flex items-center gap-2 text-gray-400 text-sm mb-3">
                      <Loader2 className="animate-spin" size={15} />
                      Calculando métricas...
                    </div>
                  )}
                  <div className="space-y-2">
                    {practicas.map((p, i) => (
                      <PracticaItem
                        key={p.id}
                        practica={p}
                        index={i}
                        metricas={metricasPorPractica[p.id] ?? null}
                        sinDatos={sinDatosPorPractica[p.id] ?? false}
                      />
                    ))}
                  </div>
                </div>

              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// EXPORT — envuelto en ProtectedRoute para estudiantes
// ─────────────────────────────────────────────────────────────
export default function EstudianteDashboard() {
  return (
    <ProtectedRoute requireEstudiante={true}>
      <EstudianteDashboardContent />
    </ProtectedRoute>
  )
}