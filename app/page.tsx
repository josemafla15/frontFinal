import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            VeinView AR
          </h1>
          <p className="text-xl text-gray-600">
            Sistema de Prácticas de Canalización Venosa
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-12">
          <Link
            href="/estudiantes/crear"
            className="block p-8 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow border-2 border-blue-200 hover:border-blue-400"
          >
            <div className="text-center">
              <div className="text-4xl mb-4">👨‍🎓</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Crear Perfil de Estudiante
              </h2>
              <p className="text-gray-600">
                Registra un nuevo estudiante en el sistema
              </p>
            </div>
          </Link>

          <Link
            href="/instructor/dashboard"
            className="block p-8 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow border-2 border-green-200 hover:border-green-400"
          >
            <div className="text-center">
              <div className="text-4xl mb-4">👨‍🏫</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Panel de Instructor
              </h2>
              <p className="text-gray-600">
                Gestiona sesiones de práctica y visualiza métricas
              </p>
            </div>
          </Link>

          <Link
            href="/reportes"
            className="block p-8 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow border-2 border-purple-200 hover:border-purple-400"
          >
            <div className="text-center">
              <div className="text-4xl mb-4">📊</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Reportes
              </h2>
              <p className="text-gray-600">
                Visualiza reportes de desempeño de estudiantes
              </p>
            </div>
          </Link>
        </div>
      </div>
    </main>
  )
}

