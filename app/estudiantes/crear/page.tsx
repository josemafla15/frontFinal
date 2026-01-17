'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { estudiantesApi, EstudianteCreate } from '@/lib/api'
import { AuthService } from '@/lib/auth'
import HelpButton from '@/components/HelpButton'
import { ArrowLeft, Save, UserPlus, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function CrearEstudiantePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [formData, setFormData] = useState<EstudianteCreate>({
    codigo_estudiante: '',
    nombre_completo: '',
    correo: '',
    programa: 'Enfermería',
    semestre: 1,
    telefono: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'semestre' ? parseInt(value) || 1 : value,
    }))
    setError(null)
    setDebugInfo(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)
    setDebugInfo(null)

    // 🔍 DEBUG: Información antes de enviar
    const token = AuthService.getAccessToken()
    const user = AuthService.getUser()
    
    console.log('🔐 DEBUG - Antes de crear estudiante:')
    console.log('   Token existe:', token ? 'SÍ ✅' : 'NO ❌')
    console.log('   Token (primeros 50 chars):', token?.substring(0, 50))
    console.log('   Usuario:', user)
    console.log('   Datos a enviar:', formData)

    try {
      const resultado = await estudiantesApi.crear(formData)
      console.log('✅ Estudiante creado:', resultado)
      setSuccess(true)
      setDebugInfo({
        tipo: 'success',
        mensaje: 'Estudiante creado exitosamente',
        data: resultado
      })
    } catch (err: any) {
      console.error('❌ Error completo:', err)
      console.error('Response data:', err.response?.data)
      console.error('Status:', err.response?.status)
      console.error('Headers:', err.response?.headers)
      
      // 🔍 Capturar información de debug del backend
      const backendDebug = err.response?.data?.debug
      
      let errorMessage = 'Error al crear el estudiante.'
      
      if (err.response?.data) {
        const errorData = err.response.data
        
        if (typeof errorData === 'object') {
          const errorMessages = []
          
          for (const [field, messages] of Object.entries(errorData)) {
            if (field === 'error' || field === 'detail') {
              errorMessages.push(messages as string)
            } else if (Array.isArray(messages)) {
              errorMessages.push(`${field}: ${messages.join(', ')}`)
            } else if (typeof messages === 'string') {
              errorMessages.push(`${field}: ${messages}`)
            }
          }
          
          if (errorMessages.length > 0) {
            errorMessage = errorMessages.join(' | ')
          }
        } else if (typeof errorData === 'string') {
          errorMessage = errorData
        }
      }
      
      setError(errorMessage)
      
      // Mostrar información de debug
      setDebugInfo({
        tipo: 'error',
        frontend: {
          token_existe: !!token,
          token_preview: token?.substring(0, 50),
          usuario: user,
          is_authenticated: AuthService.isAuthenticated(),
          is_profesor: AuthService.isProfesor()
        },
        backend: backendDebug || err.response?.data,
        status: err.response?.status,
        mensaje_error: errorMessage
      })
    } finally {
      setLoading(false)
    }
  }

  const irAPractica = () => {
    router.push('/instructor/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-2 sm:p-4 md:p-6">
      <div className="max-w-2xl mx-auto mt-4 sm:mt-8">
        <Link
          href="/"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4 sm:mb-6"
        >
          <ArrowLeft size={20} className="mr-2" />
          Volver al inicio
        </Link>

        <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 md:p-8">
          <div className="flex items-center mb-4 sm:mb-6">
            <UserPlus className="text-blue-600 mr-2 sm:mr-3" size={28} />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Crear Perfil de Estudiante</h1>
          </div>

          {success && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg text-sm sm:text-base">
              ¡Estudiante creado exitosamente!
            </div>
          )}

          {error && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm sm:text-base">
              <p className="font-semibold mb-1">Error al crear estudiante:</p>
              <p className="whitespace-pre-wrap">{error}</p>
            </div>
          )}

          {debugInfo && (
            <div className="mb-6 p-4 bg-gray-100 border border-gray-300 rounded-lg">
              <h3 className="font-bold text-gray-900 mb-2">
                🔍 Información de Debug
              </h3>
              
              {debugInfo.tipo === 'error' && (
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold text-sm text-gray-700">Frontend:</p>
                    <pre className="text-xs bg-white p-2 rounded overflow-x-auto">
{JSON.stringify(debugInfo.frontend, null, 2)}
                    </pre>
                  </div>
                  
                  <div>
                    <p className="font-semibold text-sm text-gray-700">Backend Response:</p>
                    <pre className="text-xs bg-white p-2 rounded overflow-x-auto">
{JSON.stringify(debugInfo.backend, null, 2)}
                    </pre>
                  </div>
                  
                  <div>
                    <p className="font-semibold text-sm text-gray-700">Status Code:</p>
                    <p className="text-sm text-gray-900">{debugInfo.status}</p>
                  </div>
                </div>
              )}
              
              {debugInfo.tipo === 'success' && (
                <div>
                  <p className="text-sm text-green-700">{debugInfo.mensaje}</p>
                  <pre className="text-xs bg-white p-2 rounded overflow-x-auto mt-2">
{JSON.stringify(debugInfo.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Los campos del formulario aquí - mismo código que antes */}
          <div className="space-y-4 sm:space-y-6">
            <div>
              <label htmlFor="codigo_estudiante" className="block text-sm font-medium text-gray-700 mb-2">
                Código de Estudiante *
              </label>
              <input
                type="text"
                id="codigo_estudiante"
                name="codigo_estudiante"
                value={formData.codigo_estudiante}
                onChange={handleChange}
                required
                disabled={success}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base disabled:bg-gray-100"
                placeholder="Ej: 202310001"
              />
            </div>

            <div>
              <label htmlFor="nombre_completo" className="block text-sm font-medium text-gray-700 mb-2">
                Nombre Completo *
              </label>
              <input
                type="text"
                id="nombre_completo"
                name="nombre_completo"
                value={formData.nombre_completo}
                onChange={handleChange}
                required
                disabled={success}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base disabled:bg-gray-100"
                placeholder="Ej: Juan Pérez"
              />
            </div>

            <div>
              <label htmlFor="correo" className="block text-sm font-medium text-gray-700 mb-2">
                Correo Electrónico *
              </label>
              <input
                type="email"
                id="correo"
                name="correo"
                value={formData.correo}
                onChange={handleChange}
                required
                disabled={success}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base disabled:bg-gray-100"
                placeholder="Ej: juan.perez@universidad.edu.co"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="programa" className="block text-sm font-medium text-gray-700 mb-2">
                  Programa *
                </label>
                <select
                  id="programa"
                  name="programa"
                  value={formData.programa}
                  onChange={handleChange}
                  required
                  disabled={success}
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white text-sm sm:text-base disabled:bg-gray-100"
                >
                  <option value="Enfermería">Enfermería</option>
                  <option value="Medicina">Medicina</option>
                  <option value="Técnico en Enfermería">Técnico en Enfermería</option>
                </select>
              </div>

              <div>
                <label htmlFor="semestre" className="block text-sm font-medium text-gray-700 mb-2">
                  Semestre *
                </label>
                <input
                  type="number"
                  id="semestre"
                  name="semestre"
                  value={formData.semestre}
                  onChange={handleChange}
                  required
                  min="1"
                  max="12"
                  disabled={success}
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base disabled:bg-gray-100"
                />
              </div>
            </div>

            <div>
              <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-2">
                Teléfono (Opcional)
              </label>
              <input
                type="tel"
                id="telefono"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                disabled={success}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base disabled:bg-gray-100"
                placeholder="Ej: +57 300 123 4567"
              />
            </div>

            <div className="pt-4">
              {!success ? (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2 sm:py-3 px-4 sm:px-6 rounded-lg transition-colors flex items-center justify-center text-sm sm:text-base"
                >
                  {loading ? (
                    'Guardando...'
                  ) : (
                    <>
                      <Save size={20} className="mr-2" />
                      Guardar Estudiante
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={irAPractica}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 sm:py-3 px-4 sm:px-6 rounded-lg transition-colors flex items-center justify-center text-sm sm:text-base"
                >
                  <ArrowRight size={20} className="mr-2" />
                  Ir a Práctica
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <HelpButton />
    </div>
  )
}