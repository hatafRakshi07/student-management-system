"""Write all frontend files."""
import os
import json

BASE = r"c:\Users\iSN_kota_T52\Desktop\rag pipeline\frontend"

def w(rel_path, content):
    full_path = os.path.join(BASE, rel_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Written: {rel_path}")

# ============ PACKAGE.JSON (Vite-based) ============
pkg = {
    "name": "student-management-frontend",
    "version": "1.0.0",
    "private": True,
    "type": "module",
    "scripts": {
        "dev": "vite",
        "build": "vite build",
        "preview": "vite preview"
    },
    "dependencies": {
        "react": "^18.3.1",
        "react-dom": "^18.3.1",
        "react-router-dom": "^6.24.0",
        "axios": "^1.7.2",
        "recharts": "^2.12.7",
        "react-hot-toast": "^2.4.1",
        "date-fns": "^3.6.0",
        "lucide-react": "^0.395.0",
        "@radix-ui/react-dialog": "^1.0.5",
        "@radix-ui/react-dropdown-menu": "^2.0.6",
        "@radix-ui/react-select": "^2.0.0",
        "@radix-ui/react-tabs": "^1.0.4",
        "@radix-ui/react-toast": "^1.1.5",
        "@radix-ui/react-avatar": "^1.0.4",
        "@radix-ui/react-badge": "^1.0.3",
        "clsx": "^2.1.1",
        "tailwind-merge": "^2.3.0"
    },
    "devDependencies": {
        "@vitejs/plugin-react": "^4.3.1",
        "autoprefixer": "^10.4.19",
        "postcss": "^8.4.39",
        "tailwindcss": "^3.4.4",
        "vite": "^5.3.1"
    }
}
w("package.json", json.dumps(pkg, indent=2))

# ============ VITE CONFIG ============
w("vite.config.js", '''import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
''')

# ============ INDEX.HTML ============
w("index.html", '''<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Student Management System</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
''')

# ============ TAILWIND CONFIG ============
w("tailwind.config.js", '''/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          900: '#1e3a8a',
        },
        accent: {
          500: '#8b5cf6',
          600: '#7c3aed',
        },
      },
    },
  },
  plugins: [],
}
''')

# ============ POSTCSS CONFIG ============
w("postcss.config.js", '''export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
''')

# ============ SRC/MAIN.JSX ============
w("src/main.jsx", '''import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
''')

# ============ SRC/INDEX.CSS ============
w("src/index.css", '''@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    box-sizing: border-box;
  }
  body {
    @apply bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans;
    margin: 0;
  }
}

@layer components {
  .btn-primary {
    @apply bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed;
  }
  .btn-secondary {
    @apply bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 font-semibold py-2 px-4 rounded-lg transition-colors duration-200;
  }
  .btn-danger {
    @apply bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200;
  }
  .card {
    @apply bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6;
  }
  .input {
    @apply w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent;
  }
  .label {
    @apply block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1;
  }
  .badge {
    @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium;
  }
  .badge-green {
    @apply badge bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200;
  }
  .badge-red {
    @apply badge bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200;
  }
  .badge-yellow {
    @apply badge bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200;
  }
  .badge-blue {
    @apply badge bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200;
  }
}
''')

# ============ SERVICES/API.JS ============
w("src/services/api.js", '''import axios from 'axios'
import toast from 'react-hot-toast'

const getBaseURL = () => {
  const rawEnv = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || ''

  if (typeof rawEnv === 'string' && rawEnv.trim() && rawEnv !== 'undefined' && rawEnv !== 'null') {
    let envUrl = rawEnv.trim()

    if (envUrl.startsWith('/')) {
      const cleanPath = envUrl.endsWith('/api') ? envUrl : `${envUrl.replace(/\/+$/, '')}/api`
      if (typeof window !== 'undefined' && window.location && window.location.origin && window.location.origin.startsWith('http')) {
        return `${window.location.origin.replace(/\/+$/, '')}${cleanPath}`
      }
      return `http://localhost:8000${cleanPath}`
    }

    if (!envUrl.startsWith('http://') && !envUrl.startsWith('https://')) {
      envUrl = `https://${envUrl}`
    }

    try {
      const parsed = new URL(envUrl)
      const origin = parsed.origin
      let pathname = parsed.pathname.replace(/\/+$/, '')
      if (!pathname || pathname === '/') {
        pathname = '/api'
      } else if (!pathname.endsWith('/api')) {
        pathname = `${pathname}/api`
      }
      return `${origin}${pathname}`
    } catch {}
  }

  if (typeof window !== 'undefined' && window.location) {
    const { origin, hostname, protocol, port } = window.location

    if (hostname && hostname.includes('onrender.com')) {
      return 'https://student-management-system-9yuf.onrender.com/api'
    }

    if (origin && origin !== 'null' && (origin.startsWith('http://') || origin.startsWith('https://'))) {
      return `${origin.replace(/\/+$/, '')}/api`
    }

    if (hostname && hostname.trim() && hostname !== 'null') {
      const p = (protocol && protocol.startsWith('http')) ? protocol : 'http:'
      const pt = port ? `:${port}` : ''
      return `${p}//${hostname}${pt}/api`
    }
  }

  return 'http://localhost:8000/api'
}

const apiBaseURL = getBaseURL()

const api = axios.create({
  baseURL: apiBaseURL,
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor - attach JWT token & ensure valid absolute baseURL
api.interceptors.request.use((config) => {
  if (!config.baseURL || (!config.baseURL.startsWith('http://') && !config.baseURL.startsWith('https://'))) {
    config.baseURL = getBaseURL()
  }
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor - handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    } else if (error.response?.status === 403) {
      toast.error('Access denied')
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  registerStudent: (data) => api.post('/auth/register/student', data),
  registerTeacher: (data) => api.post('/auth/register/teacher', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  getMe: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data),
}

export const studentAPI = {
  list: (params) => api.get('/students', { params }),
  profile: () => api.get('/students/profile'),
  attendance: () => api.get('/students/attendance'),
  marks: () => api.get('/students/marks'),
  assignments: () => api.get('/students/assignments'),
  fees: () => api.get('/students/fees'),
  get: (id) => api.get(`/students/${id}`),
  delete: (id) => api.delete(`/students/${id}`),
}

export const teacherAPI = {
  list: (params) => api.get('/teachers', { params }),
  profile: () => api.get('/teachers/profile'),
  delete: (id) => api.delete(`/teachers/${id}`),
}

export const attendanceAPI = {
  mark: (data) => api.post('/attendance', data),
  markBulk: (data) => api.post('/attendance/bulk', data),
  studentAttendance: (id) => api.get(`/attendance/student/${id}`),
  overview: (params) => api.get('/attendance/overview', { params }),
}

export const assignmentAPI = {
  list: () => api.get('/assignments'),
  create: (data) => api.post('/assignments', data),
  update: (id, data) => api.put(`/assignments/${id}`, data),
  delete: (id) => api.delete(`/assignments/${id}`),
  submit: (id, formData) => api.post(`/assignments/${id}/submit`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getSubmissions: (id) => api.get(`/assignments/${id}/submissions`),
  gradeSubmission: (id, data) => api.put(`/assignments/submissions/${id}/grade`, data),
}

export const examAPI = {
  list: (params) => api.get('/exams', { params }),
  create: (data) => api.post('/exams', data),
  addMarks: (data) => api.post('/exams/marks', data),
  getMarks: (examId) => api.get(`/exams/${examId}/marks`),
}

export const feeAPI = {
  list: (params) => api.get('/fees', { params }),
  create: (data) => api.post('/fees', data),
  pay: (id, data) => api.put(`/fees/${id}/pay`, data),
  stats: () => api.get('/fees/stats'),
}

export const noticeAPI = {
  list: () => api.get('/notices'),
  create: (data) => api.post('/notices', data),
  delete: (id) => api.delete(`/notices/${id}`),
}

export const notificationAPI = {
  list: () => api.get('/notifications'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
}

export const analyticsAPI = {
  dashboard: () => api.get('/analytics/dashboard'),
  attendanceTrend: () => api.get('/analytics/attendance-trend'),
  studentAnalytics: (id) => api.get(`/analytics/student/${id}`),
}

export const aiAPI = {
  performance: (id) => api.get(`/ai/performance/${id}`),
  recommendations: (id) => api.get(`/ai/recommendations/${id}`),
  chat: (message) => api.post('/ai/chat', { message }),
}

export const leaveAPI = {
  apply: (data) => api.post('/leaves', data),
  myLeaves: () => api.get('/leaves/my'),
  allLeaves: () => api.get('/leaves'),
  review: (id, data) => api.put(`/leaves/${id}/review`, data),
}

export const timetableAPI = {
  get: (params) => api.get('/timetable', { params }),
  create: (data) => api.post('/timetable', data),
  delete: (id) => api.delete(`/timetable/${id}`),
}

export default api
''')

# ============ CONTEXT/AUTHCONTEXT.JSX ============
w("src/context/AuthContext.jsx", '''import React, { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    const savedUser = localStorage.getItem('user')
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch {
        localStorage.clear()
      }
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password })
    const { access_token, user: userData } = res.data
    localStorage.setItem('access_token', access_token)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
    return userData
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    setUser(null)
  }

  const updateUser = (updates) => {
    const updated = { ...user, ...updates }
    localStorage.setItem('user', JSON.stringify(updated))
    setUser(updated)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
''')

# ============ CONTEXT/THEMECONTEXT.JSX ============
w("src/context/ThemeContext.jsx", '''import React, { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme')
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)
  })

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [dark])

  return (
    <ThemeContext.Provider value={{ dark, toggle: () => setDark(d => !d) }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
''')

# ============ CONTEXT/NOTIFICATIONCONTEXT.JSX ============
w("src/context/NotificationContext.jsx", '''import React, { createContext, useContext, useState, useEffect } from 'react'
import { notificationAPI } from '../services/api'
import { useAuth } from './AuthContext'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread] = useState(0)

  const fetch = async () => {
    if (!user) return
    try {
      const res = await notificationAPI.list()
      setNotifications(res.data.notifications || [])
      setUnread(res.data.unread || 0)
    } catch {}
  }

  useEffect(() => {
    fetch()
    const interval = setInterval(fetch, 60000)
    return () => clearInterval(interval)
  }, [user])

  const markRead = async (id) => {
    await notificationAPI.markRead(id)
    fetch()
  }

  return (
    <NotificationContext.Provider value={{ notifications, unread, markRead, refetch: fetch }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  return useContext(NotificationContext)
}
''')

print("\nContext & services files written successfully!")
