import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'VeinView AR - Sistema de Prácticas',
  description: 'Sistema de seguimiento de prácticas de canalización venosa',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        {/* 
          AuthProvider envuelve toda la aplicación
          para proporcionar el contexto de autenticación 
        */}
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}