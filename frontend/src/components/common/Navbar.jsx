import React from 'react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { Bell, Moon, Sun, LogOut, User, Menu } from 'lucide-react'
import { useNotifications } from '../../context/NotificationContext'
import { Link } from 'react-router-dom'

const roleAvatarColors = {
  student: 'from-primary-600 to-primary-800',
  teacher: 'from-emerald-600 to-emerald-800',
  admin: 'from-purple-600 to-purple-800',
  parent: 'from-amber-600 to-amber-800',
}

export default function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const { unread } = useNotifications()
  const avatarGrad = roleAvatarColors[user?.role] || 'from-primary-600 to-primary-800'
  const initials = user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'

  return (
    <nav className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-700/80 px-3 sm:px-5 py-2.5 flex items-center justify-between sticky top-0 z-40 shadow-xs safe-top"
      style={{ paddingTop: 'max(10px, env(safe-area-inset-top))' }}
    >
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={onMenuClick}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 lg:hidden transition-colors active:scale-95"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        </button>
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center p-0.5 shadow-xs border border-gray-100 group-hover:scale-105 transition">
            <img src="/logo.png" alt="Aklank College Kota" className="w-full h-full object-contain" />
          </div>
          <div className="hidden sm:block leading-tight">
            <span className="font-extrabold text-gray-900 dark:text-white block text-sm tracking-tight">Aklank College</span>
            <span className="text-[10px] font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-widest block">Kota (Raj.)</span>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors active:scale-95"
          aria-label="Toggle theme"
        >
          {dark
            ? <Sun className="h-4.5 w-4.5 text-amber-400" />
            : <Moon className="h-4.5 w-4.5 text-gray-600" />
          }
        </button>

        {/* Notifications */}
        <Link
          to={`/${user?.role}`}
          className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors active:scale-95"
          aria-label="Notifications"
        >
          <Bell className="h-4.5 w-4.5" />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-gray-800">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Link>

        {/* User menu link to /profile */}
        <div className="flex items-center gap-2 ml-1 pl-2 sm:pl-3 border-l border-gray-200 dark:border-gray-700">
          <Link to="/profile" className="flex items-center gap-2 group">
            <div className={`w-8 h-8 bg-gradient-to-br ${avatarGrad} rounded-xl flex items-center justify-center shadow-xs flex-shrink-0 group-hover:scale-105 transition`}>
              <span className="text-white text-xs font-bold">{initials}</span>
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-bold text-gray-900 dark:text-white leading-tight truncate max-w-[120px] group-hover:text-primary-600 dark:group-hover:text-primary-400 transition">{user?.full_name}</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 capitalize font-medium">{user?.role}</p>
            </div>
          </Link>

          <button
            onClick={logout}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-all active:scale-95 ml-1"
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </nav>
  )
}
