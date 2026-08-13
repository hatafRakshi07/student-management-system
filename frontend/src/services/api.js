import axios from 'axios'
import toast from 'react-hot-toast'

// ─── Compute the absolute API base URL once, at module load time ─────────────
export const getBaseURL = () => {
  // 1 ─ Explicit env var from Vite build-time injection
  const raw = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '').trim()

  if (raw && raw !== 'undefined' && raw !== 'null') {
    if (/^https?:\/\//i.test(raw)) {
      return raw.replace(/\/api\/?$/, '') + '/api'
    }
  }

  // 2 ─ Auto-detect from browser location
  if (typeof window !== 'undefined' && window.location) {
    const { hostname, protocol, port } = window.location

    // Local dev → Vite proxy or direct FastAPI backend
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8000/api'
    }

    // Local WiFi / LAN mobile testing (e.g. 192.168.x.x, 10.x.x.x) in dev mode
    if (import.meta.env.DEV && (hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.'))) {
      return `http://${hostname}:8000/api`
    }

    // Hosted on Render directly
    if (hostname.includes('onrender.com')) {
      const p = port ? `:${port}` : ''
      return `${protocol}//${hostname}${p}/api`
    }
  }

  // 3 ─ Production Backend URL (for Vercel and production deployments)
  return 'https://student-management-system-9yuf.onrender.com/api'
}

// Resolve once — never changes for the lifetime of this module
const BASE_URL = getBaseURL()

// ─── Axios instance (45s base timeout for cloud spin-up tolerance) ─────────────
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 45000,
  headers: { 'Content-Type': 'application/json' },
})

// ─── Request interceptor: Attach auth token and normalize /api/ prefix ────────
api.interceptors.request.use((config) => {
  if (config.url) {
    if (config.url.startsWith('/api/')) {
      config.url = config.url.replace(/^\/api\//, '/')
    } else if (config.url.startsWith('api/')) {
      config.url = '/' + config.url.replace(/^api\//, '')
    } else if (config.url === '/api' || config.url === 'api') {
      config.url = '/'
    }
  }

  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ─── Response interceptor with Cold-Start Resilience ─────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config || {}
    const isLoginReq = config.url?.includes('/auth/login')
    const isPingReq = config.url?.includes('/auth/ping') || config.url?.includes('/health')

    // Detect true offline (no WiFi, no mobile data)
    if (typeof navigator !== 'undefined' && !navigator.onLine && !config._offlineToasted) {
      config._offlineToasted = true
      toast.error('No internet connection. Please check your WiFi or mobile data.', { id: 'offline-toast', duration: 4000 })
      return Promise.reject(error)
    }

    const isServerErrorOrTimeout =
      !error.response ||
      error.response?.status === 500 ||
      error.response?.status === 502 ||
      error.response?.status === 503 ||
      error.response?.status === 504 ||
      error.code === 'ECONNABORTED' ||
      error.code === 'ETIMEDOUT' ||
      error.message?.includes('Network Error') ||
      error.message?.includes('timeout')

    // Don't toast for silent ping/health checks
    if (isPingReq) {
      return Promise.reject(error)
    }

    // Auto retry once for cold-start tolerance
    if (isServerErrorOrTimeout && !config._retried) {
      config._retried = true
      config.timeout = 65000
      if (!isLoginReq) {
        toast.loading('Server connecting, please wait…', { id: 'backend-retry-toast', duration: 8000 })
      }
      await new Promise((resolve) => setTimeout(resolve, 1200))
      try {
        const res = await api(config)
        toast.dismiss('backend-retry-toast')
        return res
      } catch (retryErr) {
        toast.dismiss('backend-retry-toast')
        return Promise.reject(retryErr)
      }
    }

    if (config._retried) {
      toast.dismiss('backend-retry-toast')
    }

    if (error.response?.status === 401 && !isLoginReq) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    } else if (error.response?.status === 403) {
      toast.error('Access denied')
    } else if (error.response?.status === 500) {
      let rawErr = error.response?.data?.error || error.response?.data?.detail
      let msg = 'Server internal error (500). Please try again.'
      if (typeof rawErr === 'string') {
        msg = rawErr
      } else if (rawErr && typeof rawErr === 'object') {
        msg = rawErr.message || rawErr.msg || rawErr.detail || JSON.stringify(rawErr)
      }
      toast.error(String(msg))
    }
    return Promise.reject(error)
  }
)

// ─── Proactive Server Warmup & Keep-Alive Heartbeat ───────────────────────────
let _warmupPromise = null
export const warmupServer = () => {
  if (!_warmupPromise) {
    _warmupPromise = api.get('/auth/ping', { timeout: 40000 })
      .then((res) => {
        return res.data
      })
      .catch(() => null)
      .finally(() => {
        // Reset after 30s so future calls can re-test if needed
        setTimeout(() => { _warmupPromise = null }, 30000)
      })
  }
  return _warmupPromise
}

// Start immediate non-blocking warmup on script evaluation
if (typeof window !== 'undefined') {
  try {
    warmupServer()
  } catch {}

  // Keep-alive heartbeat every 4 minutes (240,000 ms) so backend never sleeps during active session
  setInterval(() => {
    try {
      if (document.visibilityState === 'visible') {
        api.get('/auth/ping', { timeout: 15000 }).catch(() => {})
      }
    } catch {}
  }, 240000)

  // Wake up when user switches back to the tab/app
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      try {
        api.get('/auth/ping', { timeout: 15000 }).catch(() => {})
      } catch {}
    }
  })
}

// ─── API Surface ──────────────────────────────────────────────────────────────
export const authAPI = {
  ping: () => api.get('/auth/ping'),
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
  stats: () => api.get('/teachers/stats'),
  get: (id) => api.get(`/teachers/${id}`),
  profile: () => api.get('/teachers/profile'),
  create: (data) => api.post('/teachers', data),
  update: (id, data) => api.put(`/teachers/${id}`, data),
  delete: (id) => api.delete(`/teachers/${id}`),
  validationReport: () => api.get('/teachers/validation-report'),
  myAssignments: () => api.get('/teachers/my-assignments'),
  getAssignments: (id) => api.get(`/teachers/${id}/assignments`),
  createAssignment: (data) => api.post('/teachers/assignments', data),
  deleteAssignment: (id) => api.delete(`/teachers/assignments/${id}`),
}

export const attendanceAPI = {
  mark: (data) => api.post('/attendance', data),
  markBulk: (data) => api.post('/attendance/bulk', data),
  submitSession: (data) => api.post('/attendance/session/submit', data),
  getClassStudents: (params) => api.get('/attendance/class-students', { params }),
  studentAttendance: (id) => api.get(`/attendance/student/${id}`),
  studentHistory: (id) => api.get(`/attendance/history/student/${id}`),
  overview: (params) => api.get('/attendance/overview', { params }),
  staffList: (date) => api.get('/attendance/staff/admin/list', { params: date ? { attendance_date: date } : {} }),
  staffMark: (data) => api.post('/attendance/staff/admin/mark', data),
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
  getReceipt: (id) => api.get(`/fees/receipt/${id}`),
  studentHistory: (id) => api.get(`/fees/student/${id}/history`),
  myHistory: () => api.get('/fees/my/history'),
}
export const feesAPI = feeAPI


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
  dashboard: (studentId) => api.get(studentId ? `/parent/dashboard/${studentId}` : '/parent/dashboard'),
  requestPTM: (data) => api.post('/parent/meetings/request', data),
  getMeetings: () => api.get('/parent/meetings'),
  childAttendance: (id) => api.get(id ? `/parent/child/attendance?student_id=${id}` : '/parent/child/attendance'),
  childMarks: (id) => api.get(id ? `/parent/child/marks?student_id=${id}` : '/parent/child/marks'),
  childFees: (id) => api.get(id ? `/parent/child/fees?student_id=${id}` : '/parent/child/fees'),
}

export const subjectAPI = {
  list: () => api.get('/subjects'),
}

export default api
