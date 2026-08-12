import React, { useState, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { NotificationProvider } from './context/NotificationContext'
import { FullPageLoader } from './components/common/LoadingSpinner'
import Layout from './components/common/Layout'
import SplashScreen from './components/common/SplashScreen'
import ErrorBoundary from './components/common/ErrorBoundary'
import PWAInstallBanner from './components/common/PWAInstallBanner'


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
import FinancialReports from './pages/admin/FinancialReports'
import StaffAttendance from './pages/staff/StaffAttendance'
import AdminAttendance from './pages/admin/AdminAttendance'
import AdminExamDashboard from './pages/admin/AdminExamDashboard'
import AdminHRDashboard from './pages/admin/AdminHRDashboard'
import ParentDashboard from './pages/parent/ParentDashboard'
import AdminParentHub from './pages/admin/AdminParentHub'
import AdminAcademicPlanner from './pages/admin/AdminAcademicPlanner'
import AdminLibraryHub from './pages/admin/AdminLibraryHub'
import StudentLMS from './pages/student/StudentLMS'
import OnlineAdmission from './pages/public/OnlineAdmission'
import AdminFinanceHub from './pages/admin/AdminFinanceHub'
import AdminInventoryHub from './pages/admin/AdminInventoryHub'
import AdminHostelHub from './pages/admin/AdminHostelHub'
import AdminCertificateHub from './pages/admin/AdminCertificateHub'
import DocumentVerification from './pages/public/DocumentVerification'
import AdminPlacementHub from './pages/admin/AdminPlacementHub'
import AdminResearchHub from './pages/admin/AdminResearchHub'
import AdminAccreditationHub from './pages/admin/AdminAccreditationHub'
import AdminBiometricHub from './pages/admin/AdminBiometricHub'
import MobileAppHub from './pages/common/MobileAppHub'
import AICampusAssistant from './pages/common/AICampusAssistant'
import AdminPredictiveAnalytics from './pages/admin/AdminPredictiveAnalytics'
import SuperAdminTenantHub from './pages/admin/SuperAdminTenantHub'
import DeveloperApiPortal from './pages/common/DeveloperApiPortal'

import Notices from './pages/common/Notices'
import Profile from './pages/common/Profile'

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
      <Route path="/admin/financial-reports" element={<ProtectedRoute roles={["admin"]}><FinancialReports /></ProtectedRoute>} />
      <Route path="/admin/attendance" element={<ProtectedRoute roles={["admin"]}><AdminAttendance /></ProtectedRoute>} />
      <Route path="/admin/exams" element={<ProtectedRoute roles={["admin"]}><AdminExamDashboard /></ProtectedRoute>} />
      <Route path="/admin/hr" element={<ProtectedRoute roles={["admin"]}><AdminHRDashboard /></ProtectedRoute>} />
      <Route path="/admin/parents" element={<ProtectedRoute roles={["admin"]}><AdminParentHub /></ProtectedRoute>} />
      <Route path="/admin/academic" element={<ProtectedRoute roles={["admin"]}><AdminAcademicPlanner /></ProtectedRoute>} />
      <Route path="/admin/library" element={<ProtectedRoute roles={["admin"]}><AdminLibraryHub /></ProtectedRoute>} />
      <Route path="/admin/finance" element={<ProtectedRoute roles={["admin"]}><AdminFinanceHub /></ProtectedRoute>} />
      <Route path="/admin/inventory" element={<ProtectedRoute roles={["admin"]}><AdminInventoryHub /></ProtectedRoute>} />
      <Route path="/admin/hostel" element={<ProtectedRoute roles={["admin"]}><AdminHostelHub /></ProtectedRoute>} />
      <Route path="/admin/certificates" element={<ProtectedRoute roles={["admin"]}><AdminCertificateHub /></ProtectedRoute>} />
      <Route path="/admin/placement" element={<ProtectedRoute roles={["admin"]}><AdminPlacementHub /></ProtectedRoute>} />
      <Route path="/admin/research" element={<ProtectedRoute roles={["admin"]}><AdminResearchHub /></ProtectedRoute>} />
      <Route path="/admin/accreditation" element={<ProtectedRoute roles={["admin"]}><AdminAccreditationHub /></ProtectedRoute>} />
      <Route path="/admin/biometric" element={<ProtectedRoute roles={["admin"]}><AdminBiometricHub /></ProtectedRoute>} />
      <Route path="/admin/analytics/predictive" element={<ProtectedRoute roles={["admin"]}><AdminPredictiveAnalytics /></ProtectedRoute>} />
      <Route path="/admin/tenants" element={<ProtectedRoute roles={["admin"]}><SuperAdminTenantHub /></ProtectedRoute>} />
      <Route path="/developer/portal" element={<ProtectedRoute roles={["student", "teacher", "parent", "admin"]}><DeveloperApiPortal /></ProtectedRoute>} />
      <Route path="/mobile/hub" element={<ProtectedRoute roles={["student", "teacher", "parent", "admin"]}><MobileAppHub /></ProtectedRoute>} />
      <Route path="/ai/assistant" element={<ProtectedRoute roles={["student", "teacher", "parent", "admin"]}><AICampusAssistant /></ProtectedRoute>} />
      <Route path="/verify/:docNumber" element={<DocumentVerification />} />
      <Route path="/student/lms" element={<ProtectedRoute roles={["student", "admin"]}><StudentLMS /></ProtectedRoute>} />
      <Route path="/apply" element={<OnlineAdmission />} />
      <Route path="/parent/dashboard" element={<ProtectedRoute roles={["parent", "admin"]}><ParentDashboard /></ProtectedRoute>} />
      <Route path="/staff/attendance" element={<ProtectedRoute roles={["teacher", "admin"]}><StaffAttendance /></ProtectedRoute>} />
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
  const [splash, setSplash] = useState(() => {
    // Only show splash screen once per tab / session
    try {
      return !sessionStorage.getItem('aklank_splash_shown')
    } catch {
      return false
    }
  })

  const handleSplashDone = React.useCallback(() => {
    try {
      sessionStorage.setItem('aklank_splash_shown', 'true')
    } catch {}
    setSplash(false)
  }, [])

  return (
    <ErrorBoundary>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ThemeProvider>
          <AuthProvider>
            <NotificationProvider>
              {splash && <SplashScreen onDone={handleSplashDone} />}
              <AppRoutes />
              <PWAInstallBanner />
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

