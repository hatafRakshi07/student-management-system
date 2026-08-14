import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, ClipboardList,
  BarChart3, Bell, DollarSign, Calendar, CalendarDays, FileText, Brain, Settings,
  UserCheck, BookMarked, ChevronRight, FlaskConical, LogOut, X, Home, Package,
  Briefcase, Library, Award, Database, TrendingUp, Clock,
  PanelLeftClose, PanelLeftOpen, Sparkles
} from 'lucide-react'

// ─── Nav groups by role ───────────────────────────────────────────────────────
const navGroups = {
  student: [
    { label: 'Overview', items: [
      { to: '/student', label: 'Dashboard', icon: LayoutDashboard, end: true },
    ]},
    { label: 'Academic', items: [
      { to: '/student/attendance', label: 'Attendance', icon: UserCheck },
      { to: '/student/marks', label: 'Marks & Exams', icon: BookMarked },
      { to: '/student/assignments', label: 'Assignments', icon: ClipboardList },
      { to: '/student/timetable', label: 'Timetable', icon: Calendar },
      { to: '/student/calendar', label: 'Calendar', icon: CalendarDays },
    ]},
    { label: 'Finance & Admin', items: [
      { to: '/student/fees', label: 'Fees & Receipts', icon: DollarSign },
      { to: '/student/leaves', label: 'Leave Applications', icon: FileText },
      { to: '/student/notices', label: 'Notices', icon: Bell },
    ]},
    { label: 'AI & Profile', items: [
      { to: '/student/ai-insights', label: 'AI Insights', icon: Sparkles },
      { to: '/profile', label: 'My Profile', icon: Settings },
    ]},
  ],

  teacher: [
    { label: 'Overview', items: [
      { to: '/teacher', label: 'Dashboard', icon: LayoutDashboard, end: true },
    ]},
    { label: 'Academic', items: [
      { to: '/teacher/attendance', label: 'Student Attendance', icon: UserCheck },
      { to: '/staff/attendance', label: 'My Biometric Attendance', icon: Clock },
      { to: '/teacher/assignments', label: 'Assignments', icon: ClipboardList },
      { to: '/teacher/marks', label: 'Marks Management', icon: BookMarked },
      { to: '/teacher/practicals', label: 'Practicals', icon: FlaskConical },
    ]},
    { label: 'Administration', items: [
      { to: '/teacher/students', label: 'Student Directory', icon: GraduationCap },
      { to: '/teacher/leaves', label: 'Leave Requests', icon: FileText },
      { to: '/teacher/notices', label: 'Notices', icon: Bell },
      { to: '/teacher/analytics', label: 'Analytics', icon: BarChart3 },
    ]},
    { label: 'Account', items: [
      { to: '/profile', label: 'My Profile', icon: Settings },
    ]},
  ],

  admin: [
    { label: 'Command Center', items: [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    ]},
    { label: 'People', items: [
      { to: '/admin/students', label: 'Students', icon: GraduationCap },
      { to: '/admin/teachers', label: 'Faculty & Teachers', icon: Users },
      { to: '/admin/hr', label: 'HR & Payroll', icon: Briefcase },
    ]},
    { label: 'Finance', items: [
      { to: '/admin/fees', label: 'Fee ERP', icon: DollarSign },
      { to: '/admin/accounting', label: 'Accounting & Ledger', icon: BookOpen },
      { to: '/admin/import', label: 'Data Import', icon: Database },
    ]},
    { label: 'Academic', items: [
      { to: '/admin/exams', label: 'Exams & Results', icon: BookMarked },
      { to: '/admin/attendance', label: 'Attendance Overview', icon: UserCheck },
      { to: '/admin/academic', label: 'Academic Planner', icon: CalendarDays },
      { to: '/admin/timetable', label: 'Timetable', icon: Calendar },
    ]},
    { label: 'Campus', items: [
      { to: '/admin/hostel', label: 'Hostel & Mess', icon: Home },
      { to: '/admin/library', label: 'Library ERP', icon: Library },
      { to: '/admin/inventory', label: 'Inventory & Assets', icon: Package },
      { to: '/admin/placement', label: 'Placements', icon: TrendingUp },
      { to: '/admin/certificates', label: 'Certificates', icon: Award },
      { to: '/admin/notices', label: 'Campus Notices', icon: Bell },
    ]},
    { label: 'Analytics & System', items: [
      { to: '/admin/analytics', label: 'Executive Analytics', icon: BarChart3 },
      { to: '/profile', label: 'Admin Settings', icon: Settings },
    ]},
  ],

  parent: [
    { label: 'Overview', items: [
      { to: '/parent', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/profile', label: 'My Profile', icon: Settings },
    ]},
  ],
}

// ─── Role theme config ────────────────────────────────────────────────────────
const roleTheme = {
  student:  { gradient: 'from-blue-600 to-indigo-700',   activeBorder: '#6366f1', activeBg: 'rgba(99,102,241,0.08)',  activeText: '#6366f1',  badgeCls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',    dot: '#6366f1' },
  teacher:  { gradient: 'from-emerald-600 to-teal-700',  activeBorder: '#10b981', activeBg: 'rgba(16,185,129,0.08)',  activeText: '#10b981',  badgeCls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', dot: '#10b981' },
  admin:    { gradient: 'from-purple-600 to-violet-700', activeBorder: '#8b5cf6', activeBg: 'rgba(139,92,246,0.08)', activeText: '#8b5cf6',  badgeCls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',  dot: '#8b5cf6' },
  parent:   { gradient: 'from-orange-500 to-amber-600',  activeBorder: '#f59e0b', activeBg: 'rgba(245,158,11,0.08)',  activeText: '#d97706',  badgeCls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',   dot: '#f59e0b' },
}

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const groups = navGroups[user?.role] || []
  const theme = roleTheme[user?.role] || roleTheme.student
  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : (user?.role?.[0] || 'U').toUpperCase()

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
        fixed left-0 top-0 h-full z-50 flex flex-col
        bg-white dark:bg-gray-950
        border-r border-gray-100 dark:border-gray-800/80
        shadow-xl lg:shadow-sm
        transform transition-all duration-300 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
        ${collapsed ? 'w-[68px]' : 'w-64'}
      `}>

        {/* ── Header ─────────────────────────────────────── */}
        <div className={`bg-gradient-to-br ${theme.gradient} p-4 relative overflow-hidden shrink-0`}>
          <div className="absolute -top-6 -right-6 w-28 h-28 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-4 -left-4 w-18 h-18 bg-black/10 rounded-full blur-xl pointer-events-none" />

          <div className="relative z-10 flex items-center gap-3">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/30 backdrop-blur-md flex items-center justify-center font-bold text-white text-sm shrink-0 shadow-inner">
              {initials}
            </div>

            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-sm leading-tight truncate">
                  {user?.full_name || 'User'}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse shrink-0" />
                  <span className="text-[11px] text-white/80 capitalize font-medium">{user?.role} Portal</span>
                </div>
              </div>
            )}

            {/* Mobile close */}
            <button onClick={onClose} className="lg:hidden text-white/80 hover:text-white p-1 shrink-0">
              <X className="h-5 w-5" />
            </button>
            {/* Desktop collapse */}
            <button
              onClick={() => setCollapsed(c => !c)}
              className="hidden lg:flex text-white/70 hover:text-white p-1 shrink-0 transition-colors"
              aria-label="Toggle sidebar"
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* ── Navigation ─────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 custom-scrollbar px-2 space-y-0.5">
          {groups.map((group, gi) => (
            <div key={gi}>
              {!collapsed && (
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600 px-3 pt-3 pb-1 select-none">
                  {group.label}
                </p>
              )}
              {collapsed && gi > 0 && (
                <div className="h-px bg-gray-100 dark:bg-gray-800 mx-1.5 my-2" />
              )}

              {group.items.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => onClose?.()}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium
                       transition-all duration-150 cursor-pointer
                       ${isActive
                         ? 'font-semibold'
                         : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                       }
                       ${collapsed ? 'justify-center' : ''}
                      `
                    }
                    style={({ isActive }) => isActive ? {
                      color: theme.activeText,
                      background: theme.activeBg,
                      borderLeft: `3px solid ${theme.activeBorder}`,
                      paddingLeft: collapsed ? '10px' : '9px',
                    } : {
                      borderLeft: '3px solid transparent',
                    }}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0 transition-transform duration-150 group-hover:scale-110" />

                    {!collapsed && (
                      <>
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${theme.badgeCls}`}>
                            {item.badge}
                          </span>
                        )}
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-0 group-hover:opacity-50 transition-opacity -mr-1" />
                      </>
                    )}

                    {/* Collapsed badge dot */}
                    {collapsed && item.badge && (
                      <span
                        className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-2 ring-white dark:ring-gray-950"
                        style={{ background: theme.dot }}
                      />
                    )}
                  </NavLink>
                )
              })}
            </div>
          ))}
        </nav>

        {/* ── Footer ─────────────────────────────────────── */}
        <div className="shrink-0 p-2 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={logout}
            title={collapsed ? 'Sign Out' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
              text-sm font-semibold text-red-500 dark:text-red-400
              hover:bg-red-50 dark:hover:bg-red-900/20
              transition-all duration-150 group
              ${collapsed ? 'justify-center' : ''}
            `}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0 transition-transform group-hover:-translate-x-0.5" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  )
}




