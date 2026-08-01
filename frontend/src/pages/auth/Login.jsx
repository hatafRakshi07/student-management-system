import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Moon, Sun, GraduationCap, BookOpen, BarChart3, MessageSquare } from 'lucide-react'
import LoadingSpinner from '../../components/common/LoadingSpinner'

const features = [
  { icon: BarChart3, label: 'AI-powered performance insights' },
  { icon: GraduationCap, label: 'Real-time attendance tracking' },
  { icon: BookOpen, label: 'Complete fee management' },
  { icon: MessageSquare, label: 'Interactive AI chatbot' },
]

export default function Login() {
  const { login } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!form.email.trim() || !form.password) return 'Please fill all fields'
    if (!emailRe.test(form.email)) return 'Please enter a valid email address'
    if (form.password.length < 6) return 'Password must be at least 6 characters'
    return null
  }

  const handle = async (e) => {
    e.preventDefault()
    const err = validate()
    if (err) return toast.error(err)
    setLoading(true)
    try {
      const user = await login(form.email, form.password)
      const routes = { student: '/student', teacher: '/teacher', admin: '/admin', parent: '/parent' }
      navigate(routes[user.role] || '/')
      toast.success(`Welcome back, ${user.full_name}!`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900">
      {/* Left panel - desktop only */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-accent-700 items-center justify-center p-12">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -left-20 w-72 h-72 bg-white/10 rounded-full" />
          <div className="absolute top-1/3 -right-16 w-56 h-56 bg-accent-500/20 rounded-full" />
          <div className="absolute -bottom-16 left-1/4 w-48 h-48 bg-white/5 rounded-full" />
        </div>
        <div className="relative z-10 text-white max-w-sm">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mb-8 shadow-lg p-1">
            <img src="/logo.png" alt="Aklank College" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-4xl font-bold mb-3 leading-tight">Aklank<br/>College</h1>
          <p className="text-white/70 text-lg mb-10">Aklank Girls P.G. College, Kota</p>
          <div className="space-y-3">
            {features.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10">
                <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm text-white/90">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="flex-1 flex flex-col items-center justify-center p-5 sm:p-10 relative">
        {/* Mobile header bar */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between lg:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm p-0.5">
              <img src="/logo.png" alt="Aklank College" className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-gray-900 dark:text-white">Aklank College</span>
          </div>
          <button onClick={toggle} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 transition-colors">
            {dark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-gray-600" />}
          </button>
        </div>

        <div className="w-full max-w-[400px]">
          {/* Desktop theme toggle */}
          <div className="hidden lg:flex justify-end mb-8">
            <button onClick={toggle} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              {dark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-gray-600" />}
            </button>
          </div>

          <div className="mt-16 lg:mt-0">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Welcome back 👋</h2>
            <p className="text-gray-400 dark:text-gray-500 mt-1.5 text-sm">Sign in to continue to your dashboard</p>
          </div>

          <form onSubmit={handle} className="mt-8 space-y-5">
            <div>
              <label className="label">Email Address</label>
              <input
                type="email"
                className="input"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="you@school.com"
                autoFocus
                autoComplete="email"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  className="input pr-11"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShow(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium">
                Forgot password?
              </Link>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 text-base py-3">
              {loading ? <LoadingSpinner size="sm" /> : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            New student?{' '}
            <Link to="/register" className="text-primary-600 hover:text-primary-700 dark:text-primary-400 font-semibold">
              Register here
            </Link>
          </p>

          {/* Demo credentials */}
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-700/60">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Quick Demo Access</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { role: 'Admin', email: 'admin@school.com', pass: 'Admin@123', color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/40' },
                { role: 'Teacher', email: 'teacher1@school.com', pass: 'Teacher@123', color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40' },
                { role: 'Student', email: 'student1@school.com', pass: 'Student@123', color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/40' },
              ].map(({ role, email, pass, color }) => (
                <button
                  key={role}
                  onClick={() => setForm({ email, password: pass })}
                  className={`text-xs font-medium py-2 px-3 rounded-xl border transition-all active:scale-95 ${color}`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


