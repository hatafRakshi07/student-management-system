import axios from 'axios'
import toast from 'react-hot-toast'

// ─── Compute the absolute API base URL once, at module load time ─────────────
//
// Priority order:
//   1. VITE_API_URL / VITE_API_BASE_URL env var (full https?:// URL)
//   2. Render.com hostname → known Render backend URL
//   3. localhost / 127.0.0.1 → http://localhost:8000/api
//   4. Any other https origin → same-origin /api  (co-located frontend+backend)
//   5. Hard fallback
//
// IMPORTANT: This MUST return a full absolute http(s):// URL.
// Axios 1.7.x internally calls `new URL(relativeUrl, baseURL)` — if baseURL
// is empty, undefined, or relative, it throws "Failed to construct 'URL'".

export const getBaseURL = () => {
  const RENDER_BACKEND = 'https://student-management-system-9yuf.onrender.com/api'

  // 1 ─ Explicit env var from Vite/Render build-time injection
  const raw = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '').trim()

  if (raw && raw !== 'undefined' && raw !== 'null') {
    // Already absolute
    if (/^https?:\/\//i.test(raw)) {
      return raw.replace(/\/api\/?$/, '') + '/api'
    }
  }

  // 2 ─ Auto-detect from browser location
  if (typeof window !== 'undefined' && window.location) {
    const { hostname, protocol, port } = window.location

    // Render-hosted frontend → talk directly to Render backend (same infra)
    if (hostname && hostname.includes('onrender.com')) {
      return RENDER_BACKEND
    }

    // Local dev → Vite proxy forwards /api to localhost:8000
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8000/api'
    }

    // Vercel / Netlify / custom domain → use same-origin /api which vercel.json
    // proxies to the Render backend. This avoids CORS issues entirely.
    if (protocol === 'https:' || protocol === 'http:') {
      const p = port ? `:${port}` : ''
      return `${protocol}//${hostname}${p}/api`
    }
  }

  // 3 ─ Hard fallback
  return RENDER_BACKEND
}

// Resolve once — never changes for the lifetime of this module
const BASE_URL = getBaseURL()

// ─── Axios instance ───────────────────────────────────────────────────────────
// baseURL is set to an absolute URL so Axios 1.7.x can safely resolve
// relative paths like "/auth/login" via combineURLs(), which is safe and
// never calls `new URL()` with an empty/relative base.
const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// ─── Request interceptor: ONLY attach auth token ─────────────────────────────
// Do NOT manipulate config.url or config.baseURL here.
// The baseURL is already correct from axios.create(); touching it causes the
// "Failed to construct 'URL': Invalid URL" error in Axios 1.7.x internals.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ─── Response interceptor ────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginReq = error.config?.url?.includes('/auth/login')

    if (error.response?.status === 401 && !isLoginReq) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    } else if (error.response?.status === 403) {
      toast.error('Access denied')
    } else if (error.response?.status === 500) {
      const msg =
        error.response?.data?.error ||
        error.response?.data?.detail ||
        'Server internal error (500). Please try again.'
      toast.error(msg)
    }
    return Promise.reject(error)
  }
)

// ─── API Surface ──────────────────────────────────────────────────────────────
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  registerStudent: (data) => api.post('/auth/register/student', data),
  registerTeacher: (data) => api.post('/auth/register/teacher', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  changePassword: (data) => api.post('/auth/change-password', data),
}

export const studentAPI = {
  list: (params) => api.get('/students', { params }),
  search: (params) => api.get('/students/search', { params }),
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
  submit: (id, formData) =>
    api.post(`/assignments/${id}/submit`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
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
  attendanceForecast: (daysAhead = 7) =>
    api.get('/analytics/attendance-forecast', { params: { days_ahead: daysAhead } }),
  studentClusters: (nClusters = 3) =>
    api.get('/analytics/student-clusters', { params: { n_clusters: nClusters } }),
  subjectPerformance: () => api.get('/analytics/subject-performance'),
}

export const aiAPI = {
  performance: (id) => api.get(`/ai/performance/${id}`),
  gradePrediction: (id) => api.get(`/ai/grade-prediction/${id}`),
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

export const parentAPI = {
  dashboard: () => api.get('/parents/dashboard'),
  childAttendance: () => api.get('/parents/child/attendance'),
  childMarks: () => api.get('/parents/child/marks'),
}

export const subjectAPI = {
  list: () => api.get('/subjects'),
}

export default api
