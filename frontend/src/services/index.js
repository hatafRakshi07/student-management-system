import api, {
  authAPI,
  studentAPI,
  teacherAPI,
  attendanceAPI,
  assignmentAPI,
  examAPI,
  feeAPI,
  feesAPI,
  noticeAPI,
  notificationAPI,
  analyticsAPI,
  aiAPI,
  leaveAPI,
  timetableAPI,
  parentAPI,
} from './api'

export {
  authAPI,
  studentAPI,
  teacherAPI,
  attendanceAPI,
  assignmentAPI,
  examAPI,
  feeAPI,
  feesAPI,
  noticeAPI,
  notificationAPI,
  analyticsAPI,
  aiAPI,
  leaveAPI,
  timetableAPI,
  parentAPI,
}

export { default } from './api'

export const leaveService = {
  apply: (data) => api.post('/leaves', data),
  getMyLeaves: () => api.get('/leaves/my'),
  getPending: () => api.get('/leaves'),
  processLeave: (id, data) => api.put(`/leaves/${id}/review`, data),
  getAll: (params) => api.get('/leaves', { params }),
}

export const noticeService = {
  create: (data) => api.post('/notices', data),
  getAll: (params) => api.get('/notices', { params }),
  getById: (id) => api.get(`/notices/${id}`),
  delete: (id) => api.delete(`/notices/${id}`),
}

export const examService = {
  create: (data) => api.post('/exams', data),
  createPractical: (data) => api.post('/exams/practical', data),
  getAll: (params) => api.get('/exams', { params }),
  getUpcoming: () => api.get('/exams/upcoming'),
  uploadMarks: (data) => api.post('/exams/marks', data),
  bulkUploadMarks: (data) => api.post('/exams/marks/bulk', data),
  getStudentMarks: (studentId) => api.get(`/exams/marks/student/${studentId}`),
}

export const timetableService = {
  create: (data) => api.post('/timetable', data),
  getByClass: (classId) => api.get(`/timetable/class/${classId}`),
  getMine: () => api.get('/timetable/my'),
}

export const analyticsService = {
  getStudentAnalytics: (studentId) => api.get(`/analytics/student/${studentId}`),
  getTeacherClassAnalytics: (classId) => api.get(`/analytics/teacher/class/${classId}`),
  getAdminOverview: () => api.get('/analytics/dashboard'),
  exportStudents: () => api.get('/analytics/admin/export/students', { responseType: 'blob' }),
}

export const aiService = {
  getPrediction: (studentId) => api.get(`/ai/grade-prediction/${studentId}`),
  getAttendancePrediction: (studentId) => api.get(`/analytics/attendance-forecast`),
  getRecommendations: (studentId) => api.get(`/ai/recommendations/${studentId}`),
  getAIDashboard: (studentId) => api.get(`/ai/performance/${studentId}`),
}

export const chatbotService = {
  sendMessage: (message, conversationId) =>
    api.post('/chatbot/chat', { message, conversation_id: conversationId }),
  getHistory: (conversationId) =>
    api.get('/chatbot/history', { params: { conversation_id: conversationId } }),
}

export const notificationService = {
  getAll: (params) => api.get('/notifications', { params }),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
}

export const parentService = {
  getChildInfo: () => api.get('/parent/dashboard'),
  getChildAttendance: () => api.get('/parent/child/attendance'),
  getChildFees: () => api.get('/parent/child/fees'),
  getChildMarks: () => api.get('/parent/child/marks'),
  getChildNotifications: () => api.get('/notifications'),
}

export const teacherService = {
  getAll: (params) => api.get('/teachers', { params }),
  getById: (id) => api.get(`/teachers/${id}`),
  update: (id, data) => api.put(`/teachers/${id}`, data),
  delete: (id) => api.delete(`/teachers/${id}`),
  getMyClasses: () => api.get('/teachers/my-classes'),
}
