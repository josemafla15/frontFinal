# VeinView AR - Frontend

Frontend en Next.js para el sistema de prácticas de canalización venosa VeinView AR.

## Características

- ✅ Creación de perfiles de estudiantes
- ✅ Dashboard de instructor con control de sesiones
- ✅ Panel de métricas en tiempo real
- ✅ Reportes individuales de desempeño
- ✅ Botón de ayuda con instrucciones

## Instalación

```bash
cd FrontFinal
npm install
```

## Configuración

El frontend se conecta al backend Django por defecto en `http://localhost:8000`. Para cambiar la URL del API, crea un archivo `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Estructura del Proyecto

```
FrontFinal/
├── app/                      # Páginas de Next.js
│   ├── estudiantes/          # Páginas relacionadas con estudiantes
│   │   └── crear/            # Crear perfil de estudiante
│   ├── instructor/           # Panel de instructor
│   │   └── dashboard/        # Dashboard principal
│   ├── reportes/             # Página de reportes
│   ├── layout.tsx            # Layout principal
│   ├── page.tsx              # Página de inicio
│   └── globals.css           # Estilos globales
├── components/               # Componentes reutilizables
│   └── HelpButton.tsx        # Botón de ayuda
├── lib/                      # Utilidades
│   └── api.ts                # Cliente API y tipos TypeScript
└── package.json              # Dependencias
```

## Páginas Principales

### 1. Página de Inicio (`/`)
- Acceso a todas las funcionalidades principales

### 2. Crear Perfil de Estudiante (`/estudiantes/crear`)
- Formulario para registrar nuevos estudiantes
- Campos: código, nombre, correo, programa, semestre, teléfono

### 3. Dashboard de Instructor (`/instructor/dashboard`)
- Selección de estudiante y dispositivo
- Control de sesiones: iniciar, pausar, reanudar, finalizar
- Panel de métricas en tiempo real:
  - Tiempo transcurrido
  - Número de intentos
  - Precisión actual
  - Ángulo actual
  - Fuerza actual

### 4. Reportes (`/reportes`)
- Selección de estudiante
- Visualización de estadísticas:
  - Precisión promedio
  - Intentos promedio
  - Tiempo promedio
  - Calificación promedio
  - Mejor práctica
  - Última práctica

## API Endpoints Utilizados

- `GET /api/estudiantes/` - Listar estudiantes
- `POST /api/estudiantes/` - Crear estudiante
- `GET /api/placa/dispositivos/` - Listar dispositivos
- `GET /api/placa/practicas/` - Listar prácticas
- `POST /api/placa/practicas/` - Crear práctica
- `PATCH /api/placa/practicas/{id}/` - Actualizar práctica
- `GET /api/profesor/metricas-tiempo-real/` - Métricas en tiempo real
- `GET /api/profesor/estadisticas-estudiante/` - Estadísticas de estudiante

## Tecnologías

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Axios
- Lucide React (iconos)

## Build para Producción

```bash
npm run build
npm start
```

