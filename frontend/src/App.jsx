import React, { useState, useCallback, lazy, Suspense } from 'react'
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

// Auth pages — eager (always needed on first load)
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'

// All other pages — lazy loaded (each becomes its own JS chunk)
const StudentDashboard      = lazy(() => import('./pages/student/Dashboard'))
const Attendance            = lazy(() => import('./pages/student/Attendance'))
const Exams                 = lazy(() => import('./pages/student/Exams'))
const Assignments           = lazy(() => import('./pages/student/Assignments'))
const Fees                  = lazy(() => import('./pages/student/Fees'))
const AIInsights            = lazy(() => import('./pages/student/AIInsights'))
const Leaves                = lazy(() => import('./pages/student/Leaves'))
const Timetable             = lazy(() => import('./pages/student/Timetable'))
const Calendar              = lazy(() => import('./pages/student/Calendar'))
const StudentLMS            = lazy(() => import('./pages/student/StudentLMS'))
const StudentNotes          = lazy(() => import('./pages/student/StudentNotes'))

const TeacherDashboard      = lazy(() => import('./pages/teacher/Dashboard'))
const AttendanceManagement  = lazy(() => import('./pages/teacher/AttendanceManagement'))
const AssignmentManagement  = lazy(() => import('./pages/teacher/AssignmentManagement'))
const MarksManagement       = lazy(() => import('./pages/teacher/MarksManagement'))
const TeacherAnalytics      = lazy(() => import('./pages/teacher/Analytics'))
const PracticalManagement   = lazy(() => import('./pages/teacher/PracticalManagement'))
const LeaveManagement       = lazy(() => import('./pages/teacher/LeaveManagement'))
const TeacherNotesManagement = lazy(() => import('./pages/teacher/TeacherNotesManagement'))

const AdminDashboard        = lazy(() => import('./pages/admin/Dashboard'))
const StudentManagement     = lazy(() => import('./pages/admin/StudentManagement'))
const TeacherManagement     = lazy(() => import('./pages/admin/TeacherManagement'))
const FeeManagement         = lazy(() => import('./pages/admin/FeeManagement'))
const TimetableManagement   = lazy(() => import('./pages/admin/TimetableManagement'))
const AdminAnalytics        = lazy(() => import('./pages/admin/Analytics'))
const ImportModule          = lazy(() => import('./pages/admin/ImportModule'))
const FinancialReports      = lazy(() => import('./pages/admin/FinancialReports'))
const AdminAttendance       = lazy(() => import('./pages/admin/AdminAttendance'))
const AdminExamDashboard    = lazy(() => import('./pages/admin/AdminExamDashboard'))
const AdminHRDashboard      = lazy(() => import('./pages/admin/AdminHRDashboard'))
const AdminParentHub        = lazy(() => import('./pages/admin/AdminParentHub'))
const AdminAcademicPlanner  = lazy(() => import('./pages/admin/AdminAcademicPlanner'))
const AdminLibraryHub       = lazy(() => import('./pages/admin/AdminLibraryHub'))
const AdminFinanceHub       = lazy(() => import('./pages/admin/AdminFinanceHub'))
const AdminAccountingLedger = lazy(() => import('./pages/admin/AdminAccountingLedger'))
const AdminInventoryHub     = lazy(() => import('./pages/admin/AdminInventoryHub'))
const AdminHostelHub        = lazy(() => import('./pages/admin/AdminHostelHub'))
const AdminCertificateHub   = lazy(() => import('./pages/admin/AdminCertificateHub'))
const AdminPlacementHub     = lazy(() => import('./pages/admin/AdminPlacementHub'))
const AdminResearchHub      = lazy(() => import('./pages/admin/AdminResearchHub'))
const AdminAccreditationHub = lazy(() => import('./pages/admin/AdminAccreditationHub'))
const AdminBiometricHub     = lazy(() => import('./pages/admin/AdminBiometricHub'))
const AdminPredictiveAnalytics = lazy(() => import('./pages/admin/AdminPredictiveAnalytics'))
const SuperAdminTenantHub   = lazy(() => import('./pages/admin/SuperAdminTenantHub'))

const StaffAttendance       = lazy(() => import('./pages/staff/StaffAttendance'))
const ParentDashboard       = lazy(() => import('./pages/parent/ParentDashboard'))
const OnlineAdmission       = lazy(() => import('./pages/public/OnlineAdmission'))
const DocumentVerification  = lazy(() => import('./pages/public/DocumentVerification'))

const Notices               = lazy(() => import('./pages/common/Notices'))
const Profile               = lazy(() => import('./pages/common/Profile'))
const MobileAppHub          = lazy(() => import('./pages/common/MobileAppHub'))
const AICampusAssistant     = lazy(() => import('./pages/common/AICampusAssistant'))
const DeveloperApiPortal    = lazy(() => import('./pages/common/DeveloperApiPortal'))

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
    <Suspense fallback={<FullPageLoader />}>
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
      <Route path="/student/notes" element={<ProtectedRoute roles={["student"]}><StudentNotes /></ProtectedRoute>} />
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
      <Route path="/teacher/notes" element={<ProtectedRoute roles={["teacher", "admin"]}><TeacherNotesManagement /></ProtectedRoute>} />
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
      <Route path="/admin/accounting" element={<ProtectedRoute roles={["admin"]}><AdminAccountingLedger /></ProtectedRoute>} />
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
    </Suspense>
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

