import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, ClipboardList,
  BarChart3, Bell, DollarSign, Calendar, CalendarDays, FileText, Brain, Settings,
  UserCheck, BookMarked, ChevronRight, FlaskConical, LogOut, X, Home, Package,
  Briefcase, Library, Award, FileCheck, Database, Fingerprint, Activity, Layers, HelpCircle
} from 'lucide-react'

const navItems = {
  student: [
    { to: '/student', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/student/attendance', label: 'Attendance', icon: UserCheck },
    { to: '/student/marks', label: 'Marks & Exams', icon: BookMarked },
    { to: '/student/assignments', label: 'Assignments', icon: ClipboardList },
    { to: '/student/fees', label: 'Fees & Receipts', icon: DollarSign },
    { to: '/student/timetable', label: 'Timetable', icon: Calendar },
    { to: '/student/calendar', label: 'Calendar', icon: CalendarDays },
    { to: '/student/leaves', label: 'Leave Applications', icon: FileText },
    { to: '/student/notices', label: 'Notices', icon: Bell },
    { to: '/student/ai-insights', label: 'AI Insights', icon: Brain },
    { to: '/profile', label: 'My Profile', icon: Settings },
  ],
  teacher: [
    { to: '/teacher', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/teacher/attendance', label: 'Attendance', icon: UserCheck },
    { to: '/teacher/assignments', label: 'Assignments', icon: ClipboardList },
    { to: '/teacher/marks', label: 'Marks Management', icon: BookMarked },
    { to: '/teacher/practicals', label: 'Practicals', icon: FlaskConical },
    { to: '/teacher/leaves', label: 'Leave Requests', icon: FileText },
    { to: '/teacher/students', label: 'Student Directory', icon: GraduationCap },
    { to: '/teacher/notices', label: 'Notices', icon: Bell },
    { to: '/teacher/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/profile', label: 'My Profile', icon: Settings },
  ],
  admin: [
    { to: '/admin', label: 'Command Center', icon: LayoutDashboard, end: true },
    { to: '/admin/students', label: 'Students (755 Active)', icon: GraduationCap },
    { to: '/admin/teachers', label: 'Faculty & Teachers', icon: Users },
    { to: '/admin/fees', label: 'Fee ERP (2527 Receipts)', icon: DollarSign },
    { to: '/admin/hostel', label: 'Hostel & Mess ERP', icon: Home },
    { to: '/admin/inventory', label: 'Inventory & Assets', icon: Package },
    { to: '/admin/hr', label: 'HR & Payroll', icon: Briefcase },
    { to: '/admin/library', label: 'Library ERP', icon: Library },
    { to: '/admin/exams', label: 'Exams & Results', icon: BookMarked },
    { to: '/admin/attendance', label: 'Attendance Overview', icon: UserCheck },
    { to: '/admin/academic', label: 'Academic Planner', icon: CalendarDays },
    { to: '/admin/certificates', label: 'Certificates Hub', icon: Award },
    { to: '/admin/placement', label: 'Placements & Training', icon: Briefcase },
    { to: '/admin/import', label: 'Data Import Module', icon: Database },
    { to: '/admin/notices', label: 'Campus Notices', icon: Bell },
    { to: '/admin/timetable', label: 'Timetable Manager', icon: Calendar },
    { to: '/admin/analytics', label: 'Executive Analytics', icon: BarChart3 },
    { to: '/profile', label: 'Admin Settings', icon: Settings },
  ],
  parent: [
    { to: '/parent', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/profile', label: 'My Profile', icon: Settings },
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
          <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full" />
          <div className="absolute -bottom-2 -left-2 w-14 h-14 bg-white/10 rounded-full" />
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-white shadow-inner">
                {user?.full_name?.charAt(0) || 'A'}
              </div>
              <div className="overflow-hidden">
                <p className="font-bold text-white text-sm truncate">{user?.full_name}</p>
                <p className="text-xs text-white/75 capitalize font-medium">{user?.role} Portal</p>
              </div>
            </div>
            <button onClick={onClose} className="lg:hidden text-white/80 hover:text-white p-1">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 mb-2">
            Main Navigation
          </p>
          {items.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => onClose?.()}
                className={({ isActive }) => `
                  sidebar-link group text-xs font-semibold
                  ${isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'}
                `}
              >
                <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
                <span className="truncate">{item.label}</span>
                <ChevronRight className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </NavLink>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-800/50">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  )
}
