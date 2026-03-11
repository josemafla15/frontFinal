'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import { ArrowLeft, User, Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function PerfilContent() {
  const { user, accessToken } = useAuth()

  const [perfil, setPerfil] = useState<any>(null)
  const [loadingPerfil, setLoadingPerfil] = useState(true)

  const [passwordActual, setPasswordActual]   = useState('')
  const [passwordNueva, setPasswordNueva]     = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showActual, setShowActual]           = useState(false)
  const [showNueva, setShowNueva]             = useState(false)
  const [showConfirm, setShowConfirm]         = useState(false)

  const [loadingPass, setLoadingPass] = useState(false)
  const [errorPass, setErrorPass]     = useState<string | null>(null)
  const [successPass, setSuccessPass] = useState(false)

  useEffect(() => {
    if (!accessToken) return
    fetch(`${API_URL}/api/estudiantes/mi_perfil/`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((data) => setPerfil(data))
      .finally(() => setLoadingPerfil(false))
  }, [accessToken])

  const handleCambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorPass(null)
    setSuccessPass(false)

    if (!passwordActual) { setErrorPass('Ingresa tu contraseña actual'); return }
    if (!passwordNueva)  { setErrorPass('Ingresa la nueva contraseña');  return }
    if (passwordNueva.length < 6) { setErrorPass('La nueva contraseña debe tener al menos 6 caracteres'); return }
    if (passwordNueva !== passwordConfirm) { setErrorPass('Las contraseñas no coinciden'); return }

    setLoadingPass(true)
    try {
      const res = await fetch(`${API_URL}/api/estudiantes/cambiar_password/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          password_actual: passwordActual,
          password_nueva:  passwordNueva,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setErrorPass(data.error || 'Error al cambiar la contraseña')
        return
      }

      setSuccessPass(true)
      setPasswordActual('')
      setPasswordNueva('')
      setPasswordConfirm('')
    } catch {
      setErrorPass('Error de conexión con el servidor')
    } finally {
      setLoadingPass(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 p-4 sm:p-6 md:p-8">
      <div className="max-w-xl mx-auto">

        <Link href="/mi-portal/dashboard" className="inline-flex items-center text-indigo-600 hover:text-indigo-800 mb-6">
          <ArrowLeft size={20} className="mr-2" />
          Volver al dashboard
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <User size={24} className="text-indigo-600" />
          Mi Perfil
        </h1>

        {/* ── Datos del perfil ── */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Información personal</h2>

          {loadingPerfil ? (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Loader2 className="animate-spin" size={16} /> Cargando...
            </div>
          ) : perfil ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: 'Nombre',   value: perfil.nombre_completo },
                { label: 'Correo',   value: perfil.correo },
                { label: 'Código',   value: perfil.codigo_estudiante },
                { label: 'Programa', value: perfil.programa },
                { label: 'Semestre', value: `Semestre ${perfil.semestre}` },
                { label: 'Profesor', value: perfil.profesor_nombre ?? '—' },
              ].map(({ label, value }) => (
                <div key={label} className="p-3 bg-indigo-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                  <p className="font-semibold text-gray-900 text-sm break-words">{value}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No se pudo cargar el perfil.</p>
          )}
        </div>

        {/* ── Cambiar contraseña ── */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-1 flex items-center gap-2">
            <Lock size={16} className="text-indigo-500" />
            Cambiar contraseña
          </h2>
          <p className="text-xs text-gray-400 mb-5">
              Si no has cambiado tu contraseña, usa tu código universitario.
          </p>

          {successPass && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 text-sm">
              <CheckCircle size={16} /> Contraseña actualizada correctamente
            </div>
          )}

          {errorPass && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle size={16} /> {errorPass}
            </div>
          )}

          <form onSubmit={handleCambiarPassword} className="space-y-4">

            {/* Contraseña actual */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña actual
              </label>
              <div className="relative">
                <input
                  type={showActual ? 'text' : 'password'}
                  value={passwordActual}
                  onChange={(e) => setPasswordActual(e.target.value)}
                  disabled={loadingPass}
                  className="w-full pl-4 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 text-sm"
                  placeholder="Tu contraseña actual o código universitario"
                />
                <button type="button" onClick={() => setShowActual(v => !v)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600" tabIndex={-1}>
                  {showActual ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Nueva contraseña */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nueva contraseña
              </label>
              <div className="relative">
                <input
                  type={showNueva ? 'text' : 'password'}
                  value={passwordNueva}
                  onChange={(e) => setPasswordNueva(e.target.value)}
                  disabled={loadingPass}
                  className="w-full pl-4 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 text-sm"
                  placeholder="Mínimo 6 caracteres"
                />
                <button type="button" onClick={() => setShowNueva(v => !v)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600" tabIndex={-1}>
                  {showNueva ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirmar contraseña */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar nueva contraseña
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  disabled={loadingPass}
                  className="w-full pl-4 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 text-sm"
                  placeholder="Repite la nueva contraseña"
                />
                <button type="button" onClick={() => setShowConfirm(v => !v)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600" tabIndex={-1}>
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loadingPass}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors flex items-center justify-center text-sm"
            >
              {loadingPass ? (
                <><Loader2 className="animate-spin mr-2" size={16} /> Guardando...</>
              ) : (
                <><Lock size={16} className="mr-2" /> Cambiar contraseña</>
              )}
            </button>
          </form>
        </div>

      </div>
    </div>
  )
}

export default function PerfilPage() {
  return (
    <ProtectedRoute requireEstudiante={true}>
      <PerfilContent />
    </ProtectedRoute>
  )
}