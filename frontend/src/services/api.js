import axios from 'axios'
import toast from 'react-hot-toast'

const getBaseURL = () => {
  const rawEnv = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || ''

  if (typeof rawEnv === 'string' && rawEnv.trim() && rawEnv !== 'undefined' && rawEnv !== 'null') {
    let envUrl = rawEnv.trim()

    // 1. Relative path like "/api" or "/api/"
    if (envUrl.startsWith('/')) {
      const cleanPath = envUrl.endsWith('/api') ? envUrl : `${envUrl.replace(/\/+$/, '')}/api`
      if (typeof window !== 'undefined' && window.location && window.location.origin && window.location.origin.startsWith('http')) {
        return `${window.location.origin.replace(/\/+$/, '')}${cleanPath}`
      }
      return `http://localhost:8000${cleanPath}`
    }

    // 2. Missing protocol like "student-management-system-9yuf.onrender.com/api" or "localhost:8000"
    if (!envUrl.startsWith('http://') && !envUrl.startsWith('https://')) {
      envUrl = `https://${envUrl}`
    }

    // 3. Ensure valid URL construction & format
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
    } catch {
      // Fall through to window.location detection if parsing fails
    }
  }

  // Auto-detection based on browser location
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
      const msg = error.response?.data?.error || error.response?.data?.detail || 'Server internal error (500). Please try again.'
      toast.error(msg)
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
  logout: () => api.post('/auth/logout'),
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
  // DS endpoints
  attendanceForecast: (daysAhead = 7) => api.get('/analytics/attendance-forecast', { params: { days_ahead: daysAhead } }),
  studentClusters: (nClusters = 3) => api.get('/analytics/student-clusters', { params: { n_clusters: nClusters } }),
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
