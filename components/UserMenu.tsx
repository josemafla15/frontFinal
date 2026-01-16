'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { User, LogOut, ChevronDown } from 'lucide-react'

/**
 * Menú de usuario con opción de logout
 * Muestra el nombre del usuario y su rol
 */
export default function UserMenu() {
  const { user, logout, isProfesor } = useAuth()
  const [isOpen, setIsOpen] = useState(false)

  if (!user) return null

  const displayName = user.first_name 
    ? `${user.first_name} ${user.last_name}`.trim() 
    : user.username

  return (
    <div className="relative">
      {/* Botón del menú */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200"
      >
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
          <User size={18} className="text-white" />
        </div>
        <div className="text-left hidden sm:block">
          <p className="text-sm font-semibold text-gray-900">{displayName}</p>
          <p className="text-xs text-gray-500">
            {isProfesor ? 'Profesor' : 'Usuario'}
          </p>
        </div>
        <ChevronDown 
          size={16} 
          className={`text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Overlay para cerrar al hacer clic fuera */}
          <div 
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menú */}
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-20">
            {/* Información del usuario */}
            <div className="px-4 py-3 border-b border-gray-200">
              <p className="text-sm font-semibold text-gray-900">{displayName}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
              <div className="mt-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {isProfesor ? '👨‍🏫 Profesor' : '👤 Usuario'}
                </span>
              </div>
            </div>

            {/* Opciones */}
            <div className="py-1">
              <button
                onClick={() => {
                  logout()
                  setIsOpen(false)
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
              >
                <LogOut size={16} />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}