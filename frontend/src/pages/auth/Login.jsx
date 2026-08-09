import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Moon, Sun, GraduationCap, BookOpen, BarChart3, MessageSquare, Award, ShieldCheck } from 'lucide-react'
import LoadingSpinner from '../../components/common/LoadingSpinner'

const features = [
  { icon: BarChart3, label: 'AI-Powered Performance Insights' },
  { icon: GraduationCap, label: 'Real-time Attendance Tracking' },
  { icon: BookOpen, label: 'Comprehensive Fee Management' },
  { icon: Award, label: 'Recognized by Govt. of Rajasthan & UOK' },
]

export default function Login() {
  const { login } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  const validate = () => {
    if (!form.email.trim() || !form.password) return 'Please fill all fields'
    if (form.password.length < 4) return 'Password must be at least 4 characters'
    return null
  }

  const executeLogin = async (loginEmail, loginPassword) => {
    setLoading(true)
    try {
      const user = await login(loginEmail, loginPassword)
      const routes = { student: '/student', teacher: '/teacher', admin: '/admin', parent: '/parent' }
      navigate(routes[user.role] || '/')
      toast.success(`Welcome back, ${user.full_name}!`)
    } catch (err) {
      console.error('Login error:', err)
      // Safely extract a plain string message — never pass objects to toast
      const detail = err.response?.data?.detail
      const errorData = err.response?.data?.error
      let msg
      if (typeof detail === 'string') {
        msg = detail
      } else if (detail && typeof detail === 'object') {
        msg = detail.message || detail.msg || detail.error || JSON.stringify(detail)
      } else if (typeof errorData === 'string') {
        msg = errorData
      } else if (errorData && typeof errorData === 'object') {
        msg = errorData.message || errorData.msg || JSON.stringify(errorData)
      } else if (Array.isArray(detail)) {
        msg = detail.map(d => d.msg || d.message || String(d)).join(', ')
      } else if (typeof err.message === 'string') {
        msg = err.message
      } else {
        msg = 'Login failed. Please try again.'
      }
      // Replace Axios internal URL errors with a friendly message
      if (!msg || msg.includes('Invalid URL') || msg.includes('Failed to construct') || msg.includes('Network Error')) {
        msg = 'Unable to connect to server. Please check your connection and try again.'
      }
      toast.error(String(msg))
    } finally {
      setLoading(false)
    }
  }

  const handle = async (e) => {
    e.preventDefault()
    const err = validate()
    if (err) return toast.error(err)
    await executeLogin(form.email, form.password)
  }

  const handleDemoLogin = async (demoEmail, demoPass) => {
    setForm({ email: demoEmail, password: demoPass })
    await executeLogin(demoEmail, demoPass)
  }

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-gray-900 font-sans">
      {/* Left panel - branding sidebar for desktop */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-[#500c1e] items-center justify-center p-12 text-white">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -left-20 w-80 h-80 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute top-1/3 -right-16 w-64 h-64 bg-accent-500/20 rounded-full blur-xl" />
          <div className="absolute -bottom-16 left-1/4 w-56 h-56 bg-white/5 rounded-full blur-lg" />
        </div>

        <div className="relative z-10 max-w-md space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-glow-gold p-2 border-2 border-accent-400/50">
              <img src="/logo.png" alt="Aklank College Kota" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="text-xs font-semibold tracking-[0.2em] text-accent-400 uppercase px-2.5 py-0.5 rounded-full border border-accent-400/40 bg-accent-400/10">
                Est. 1998
              </span>
              <h1 className="text-2xl font-black text-white tracking-wide mt-1">Aklank College</h1>
              <p className="text-xs text-amber-200/90 font-medium">Kota (Rajasthan) India</p>
            </div>
          </div>

          <div className="border-l-4 border-accent-400 pl-4 py-1">
            <p className="text-lg font-bold text-white leading-snug">"Excellence is a Tradition"</p>
            <p className="text-xs text-white/70 italic mt-0.5">चारितं खलु धम्मो · Quality Education & Self-Reliance</p>
          </div>

          <div className="space-y-3 pt-2">
            {features.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-xl px-4 py-3 border border-white/15 shadow-sm">
                <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4 w-4 text-accent-400" />
                </div>
                <span className="text-sm font-medium text-white/90">{label}</span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-white/10 text-xs text-white/60 space-y-1">
            <p className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-accent-400" /> Affiliated to University of Kota</p>
            <p>Basant Vihar, Kota (Rajasthan) - 324009</p>
          </div>
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="flex-1 flex flex-col items-center justify-center p-5 sm:p-10 relative">
        {/* Mobile header bar */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between lg:hidden">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm p-1 border border-gray-200">
              <img src="/logo.png" alt="Aklank College" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="font-bold text-gray-900 dark:text-white block text-sm">Aklank College</span>
              <span className="text-[10px] text-gray-500 dark:text-gray-400">Kota, Rajasthan</span>
            </div>
          </div>
          <button onClick={toggle} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 transition-colors">
            {dark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-gray-600" />}
          </button>
        </div>

        <div className="w-full max-w-[420px]">
          {/* Desktop theme toggle */}
          <div className="hidden lg:flex justify-end mb-6">
            <button onClick={toggle} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              {dark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-gray-600" />}
            </button>
          </div>

          <div className="mt-14 lg:mt-0">
            <div className="inline-block px-3 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-semibold rounded-full mb-3 border border-primary-200/50">
              Portal Access
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Welcome Back 👋</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1.5 text-sm">Sign in to your Aklank College management account</p>
          </div>

          <form onSubmit={handle} className="mt-6 space-y-4">
            <div className="p-3 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/40 rounded-xl text-xs text-amber-900 dark:text-amber-200">
              💡 <strong>Login Option:</strong> You can login using your <strong>Student Name</strong>, <strong>Scholar No / Roll No</strong>, or <strong>Email</strong> with your <strong>Password</strong> or <strong>Mobile Number</strong>.
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1.5">
                Student Name / Scholar No / Roll No / Email
              </label>
              <input
                type="text"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 text-sm outline-none transition"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="Enter Student Name, Scholar No, Roll No, or Email"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1.5">
                Password / Mobile Number
              </label>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 text-sm outline-none pr-11 transition"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="Enter Password or Registered Mobile No."
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
              <Link to="/forgot-password" className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 font-semibold">
                Forgot password?
              </Link>
            </div>

            <button type="submit" disabled={loading} className="w-full py-3 bg-gradient-to-r from-primary-700 to-primary-800 hover:from-primary-800 hover:to-primary-900 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition duration-150 flex items-center justify-center gap-2 text-sm disabled:opacity-50">
              {loading ? <LoadingSpinner size="sm" /> : 'Sign In to Portal'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-6">
            New student registration?{' '}
            <Link to="/register" className="text-primary-600 hover:text-primary-700 dark:text-primary-400 font-bold">
              Register here
            </Link>
          </p>

          {/* Quick Demo Credentials */}
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm">
            <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2.5">Quick Demo Login Shortcuts</p>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { role: 'Student', email: 'student@school.com', pass: 'student123', color: 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border-primary-200' },
                { role: 'Teacher', email: 'teacher@school.com', pass: 'teacher123', color: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200' },
                { role: 'Admin', email: 'admin@school.com', pass: 'admin123', color: 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200' },
                { role: 'Parent', email: 'parent@school.com', pass: 'parent123', color: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200' },
              ].map(({ role, email, pass, color }) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleDemoLogin(email, pass)}
                  className={`text-[11px] font-semibold py-1.5 px-2 rounded-lg border transition active:scale-95 text-center ${color}`}
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
