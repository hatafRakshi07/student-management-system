import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { NotificationProvider } from './context/NotificationContext'
import { FullPageLoader } from './components/common/LoadingSpinner'
import Layout from './components/common/Layout'
import SplashScreen from './components/common/SplashScreen'
import ErrorBoundary from './components/common/ErrorBoundary'


import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'

import StudentDashboard from './pages/student/Dashboard'
import Attendance from './pages/student/Attendance'
import Exams from './pages/student/Exams'
import Assignments from './pages/student/Assignments'
import Fees from './pages/student/Fees'
import AIInsights from './pages/student/AIInsights'
import Leaves from './pages/student/Leaves'
import Timetable from './pages/student/Timetable'
import Calendar from './pages/student/Calendar'

import TeacherDashboard from './pages/teacher/Dashboard'
import AttendanceManagement from './pages/teacher/AttendanceManagement'
import AssignmentManagement from './pages/teacher/AssignmentManagement'
import MarksManagement from './pages/teacher/MarksManagement'
import TeacherAnalytics from './pages/teacher/Analytics'
import PracticalManagement from './pages/teacher/PracticalManagement'
import LeaveManagement from './pages/teacher/LeaveManagement'

import AdminDashboard from './pages/admin/Dashboard'
import StudentManagement from './pages/admin/StudentManagement'
import TeacherManagement from './pages/admin/TeacherManagement'
import FeeManagement from './pages/admin/FeeManagement'
import TimetableManagement from './pages/admin/TimetableManagement'
import AdminAnalytics from './pages/admin/Analytics'
import ImportModule from './pages/admin/ImportModule'

import Notices from './pages/common/Notices'
import Profile from './pages/common/Profile'
import ParentDashboard from './pages/parent/Dashboard'

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return <FullPageLoader />
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to={`/${user.role}`} replace />
  return <Layout>{children}</Layout>
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <FullPageLoader />
  if (user) return <Navigate to={`/${user.role}`} replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />

      {/* Student */}
      <Route path="/student" element={<ProtectedRoute roles={["student"]}><StudentDashboard /></ProtectedRoute>} />
      <Route path="/student/attendance" element={<ProtectedRoute roles={["student"]}><Attendance /></ProtectedRoute>} />
      <Route path="/student/marks" element={<ProtectedRoute roles={["student"]}><Exams /></ProtectedRoute>} />
      <Route path="/student/assignments" element={<ProtectedRoute roles={["student"]}><Assignments /></ProtectedRoute>} />
      <Route path="/student/fees" element={<ProtectedRoute roles={["student"]}><Fees /></ProtectedRoute>} />
      <Route path="/student/ai-insights" element={<ProtectedRoute roles={["student"]}><AIInsights /></ProtectedRoute>} />
      <Route path="/student/leaves" element={<ProtectedRoute roles={["student"]}><Leaves /></ProtectedRoute>} />
      <Route path="/student/timetable" element={<ProtectedRoute roles={["student"]}><Timetable /></ProtectedRoute>} />
      <Route path="/student/calendar" element={<ProtectedRoute roles={["student"]}><Calendar /></ProtectedRoute>} />
      <Route path="/student/notices" element={<ProtectedRoute roles={["student"]}><Notices /></ProtectedRoute>} />

      {/* Teacher */}
      <Route path="/teacher" element={<ProtectedRoute roles={["teacher", "admin"]}><TeacherDashboard /></ProtectedRoute>} />
      <Route path="/teacher/attendance" element={<ProtectedRoute roles={["teacher", "admin"]}><AttendanceManagement /></ProtectedRoute>} />
      <Route path="/teacher/assignments" element={<ProtectedRoute roles={["teacher", "admin"]}><AssignmentManagement /></ProtectedRoute>} />
      <Route path="/teacher/marks" element={<ProtectedRoute roles={["teacher", "admin"]}><MarksManagement /></ProtectedRoute>} />
      <Route path="/teacher/students" element={<ProtectedRoute roles={["teacher", "admin"]}><StudentManagement /></ProtectedRoute>} />
      <Route path="/teacher/notices" element={<ProtectedRoute roles={["teacher", "admin"]}><Notices /></ProtectedRoute>} />
      <Route path="/teacher/analytics" element={<ProtectedRoute roles={["teacher", "admin"]}><TeacherAnalytics /></ProtectedRoute>} />
      <Route path="/teacher/practicals" element={<ProtectedRoute roles={["teacher", "admin"]}><PracticalManagement /></ProtectedRoute>} />
      <Route path="/teacher/leaves" element={<ProtectedRoute roles={["teacher", "admin"]}><LeaveManagement /></ProtectedRoute>} />

      {/* Admin */}
      <Route path="/admin" element={<ProtectedRoute roles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/students" element={<ProtectedRoute roles={["admin"]}><StudentManagement /></ProtectedRoute>} />
      <Route path="/admin/teachers" element={<ProtectedRoute roles={["admin"]}><TeacherManagement /></ProtectedRoute>} />
      <Route path="/admin/fees" element={<ProtectedRoute roles={["admin"]}><FeeManagement /></ProtectedRoute>} />
      <Route path="/admin/timetable" element={<ProtectedRoute roles={["admin"]}><TimetableManagement /></ProtectedRoute>} />
      <Route path="/admin/analytics" element={<ProtectedRoute roles={["admin"]}><AdminAnalytics /></ProtectedRoute>} />
      <Route path="/admin/import" element={<ProtectedRoute roles={["admin"]}><ImportModule /></ProtectedRoute>} />
      <Route path="/admin/notices" element={<ProtectedRoute roles={["admin"]}><Notices /></ProtectedRoute>} />

      {/* Parent */}
      <Route path="/parent" element={<ProtectedRoute roles={["parent"]}><ParentDashboard /></ProtectedRoute>} />

      {/* Common */}
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
export default function App() {
  const [splash, setSplash] = useState(true)

  const handleSplashDone = () => {
    setSplash(false)
  }

  return (
    <ErrorBoundary>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ThemeProvider>
          <AuthProvider>
            <NotificationProvider>
              {splash && <SplashScreen onDone={handleSplashDone} />}
              <AppRoutes />
              <Toaster
                position="top-right"
                toastOptions={{
                  className: 'dark:bg-gray-800 dark:text-white',
                  duration: 3000,
                }}
              />
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

