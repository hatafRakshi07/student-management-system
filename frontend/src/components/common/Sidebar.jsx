import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, ClipboardList,
  BarChart3, Bell, DollarSign, Calendar, CalendarDays, FileText, Brain, Settings,
  UserCheck, BookMarked, ChevronRight, FlaskConical, LogOut, X
} from 'lucide-react'

const navItems = {
  student: [
    { to: '/student', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/student/attendance', label: 'Attendance', icon: UserCheck },
    { to: '/student/marks', label: 'Marks & Exams', icon: BookMarked },
    { to: '/student/assignments', label: 'Assignments', icon: ClipboardList },
    { to: '/student/fees', label: 'Fees', icon: DollarSign },
    { to: '/student/timetable', label: 'Timetable', icon: Calendar },
    { to: '/student/calendar', label: 'Calendar', icon: CalendarDays },
    { to: '/student/leaves', label: 'Leave Applications', icon: FileText },
    { to: '/student/notices', label: 'Notices', icon: Bell },
    { to: '/student/ai-insights', label: 'AI Insights', icon: Brain },
  ],
  teacher: [
    { to: '/teacher', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/teacher/attendance', label: 'Attendance', icon: UserCheck },
    { to: '/teacher/assignments', label: 'Assignments', icon: ClipboardList },
    { to: '/teacher/marks', label: 'Marks', icon: BookMarked },
    { to: '/teacher/practicals', label: 'Practicals', icon: FlaskConical },
    { to: '/teacher/leaves', label: 'Leave Requests', icon: FileText },
    { to: '/teacher/students', label: 'Students', icon: GraduationCap },
    { to: '/teacher/notices', label: 'Notices', icon: Bell },
    { to: '/teacher/analytics', label: 'Analytics', icon: BarChart3 },
  ],
  admin: [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/students', label: 'Students', icon: GraduationCap },
    { to: '/admin/teachers', label: 'Teachers', icon: Users },
    { to: '/admin/fees', label: 'Fee Management', icon: DollarSign },
    { to: '/admin/notices', label: 'Notices', icon: Bell },
    { to: '/admin/timetable', label: 'Timetable', icon: Calendar },
    { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  ],
  parent: [
    { to: '/parent', label: 'Dashboard', icon: LayoutDashboard, end: true },
  ],
}

const roleColors = {
  student: 'from-primary-600 to-primary-700',
  teacher: 'from-emerald-600 to-emerald-700',
  admin: 'from-purple-600 to-purple-700',
  parent: 'from-orange-500 to-orange-600',
}

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth()
  const items = navItems[user?.role] || []
  const gradientClass = roleColors[user?.role] || 'from-primary-600 to-primary-700'

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      <aside className={`
        fixed left-0 top-0 h-full w-64 bg-white dark:bg-gray-800
        border-r border-gray-100 dark:border-gray-700/60
        z-50 transform transition-transform duration-300 ease-in-out flex flex-col
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto shadow-xl lg:shadow-none
      `}>
        {/* Header */}
        <div className={`p-5 bg-gradient-to-br ${gradientClass} relative overflow-hidden`}>
          {/* decorative circles */}
          <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full" />
          <div className="absolute -bottom-2 -left-2 w-14 h-14 bg-white/10 rounded-full" />
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                <img src="/logo.png" alt="Aklank College" className="w-9 h-9 object-contain rounded-lg" />
              </div>
              <div>
                <p className="font-bold text-white text-sm leading-tight">Aklank College</p>
                <p className="text-xs text-white/70 capitalize mt-0.5">{user?.role} Portal</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden w-7 h-7 flex items-center justify-center rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* User info strip */}
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-700/20">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{user?.full_name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto no-scrollbar">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                  isActive
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/60 hover:text-gray-900 dark:hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400'
                      : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                  }`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1">{label}</span>
                  {isActive && <ChevronRight className="h-3.5 w-3.5 text-primary-500 dark:text-primary-400 opacity-60" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-700/60">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-150 group"
          >
            <span className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 group-hover:bg-red-100 dark:group-hover:bg-red-900/40 transition-colors">
              <LogOut className="h-4 w-4" />
            </span>
            Sign Out
          </button>
          <p className="text-[10px] text-gray-300 dark:text-gray-600 text-center mt-2">Aklank College Portal v1.0</p>
        </div>
      </aside>
    </>
  )
}


