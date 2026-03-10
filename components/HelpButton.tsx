'use client'

import { useState } from 'react'
import { HelpCircle, X } from 'lucide-react'

export default function HelpButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all hover:scale-110 z-50"
        aria-label="Ayuda"
      >
        <HelpCircle size={24} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Instrucciones de Ayuda</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                aria-label="Cerrar"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6 text-gray-700 space-y-4">
              <section>
                <h3 className="text-xl font-semibold mb-2">Crear Perfil de Estudiante</h3>
                <p className="text-justify">
                  Ve a la sección de Estudiantes desde el dashboard del instructor. Completa el formulario
                  con el código del estudiante, nombre completo, correo, programa y semestre. El sistema
                  crea automáticamente un usuario asociado al estudiante con su código como nombre de
                  usuario.
                </p>
              </section>

              <section>
                <h3 className="text-xl font-semibold mb-2">Iniciar Sesión de Práctica</h3>
                <p className="text-justify">
                  Desde el dashboard del instructor, selecciona un estudiante activo y haz clic en
                  &ldquo;Iniciar Práctica&rdquo;. El instructor vincula al estudiante con el sensor de punción
                  registrado. El sensor comenzará a capturar datos automáticamente al detectar la
                  práctica activa.
                </p>
              </section>

              <section>
                <h3 className="text-xl font-semibold mb-2">Controlar Sesión de Práctica</h3>
                <p className="text-justify">
                  Durante una práctica activa puedes <strong>pausarla</strong> — el sensor de punción
                  dejará de registrar datos y el tiempo se congela — o <strong>reanudarla</strong> para
                  continuar desde donde se pausó. Al hacer clic en <strong>Finalizar</strong>, el sistema
                  calcula las métricas finales desde todos los datos registrados durante la sesión.
                </p>
              </section>

              <section>
                <h3 className="text-xl font-semibold mb-2">Métricas en Tiempo Real</h3>
                <p className="text-justify">
                  Mientras la práctica está activa, el dashboard muestra el ángulo de inclinación y la
                  fuerza de inserción en tiempo real. El rango óptimo es <strong>10°–30°</strong> de
                  inclinación y <strong>50–300g</strong> de fuerza. Cuando ambos están en rango
                  simultáneamente, el sistema cuenta esa lectura como técnica correcta.
                </p>
              </section>

              <section>
                <h3 className="text-xl font-semibold mb-2">Ver Reportes</h3>
                <p className="text-justify">
                  Ve a la sección de Reportes y selecciona un estudiante. El sistema carga todas sus
                  prácticas finalizadas y calcula las métricas directamente desde los datos capturados:
                  precisión (% de lecturas con técnica correcta), fuerza promedio, inclinación promedio
                  y calificación sobre 5.0. Con 2 o más prácticas se activa el análisis comparativo
                  con gráficos de evolución.
                </p>
              </section>
            </div>
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}