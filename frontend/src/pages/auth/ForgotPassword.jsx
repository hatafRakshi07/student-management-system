import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { authAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import DarkModeToggle from '../../components/common/DarkModeToggle'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handle = async (e) => {
    e.preventDefault()
    if (!email) return toast.error('Enter your email')
    setLoading(true)
    try {
      await authAPI.forgotPassword({ email })
      setSent(true)
    } catch {
      // Don't reveal if email exists or not (security)
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col">
      <div className="flex items-center justify-between p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm p-0.5">
            <img src="/logo.png" alt="Aklank College" className="w-full h-full object-contain" />
          </div>
          <span className="font-bold text-gray-900 dark:text-white">Aklank College</span>
        </div>
        <DarkModeToggle />
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {sent ? (
            <div className="card text-center p-8 animate-slide-up">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Check Your Email</h2>
              <p className="text-gray-500 mb-6">
                If <strong>{email}</strong> is registered, a password reset link has been sent. Please check your inbox.
              </p>
              <Link to="/login" className="btn-primary w-full block text-center">
                Back to Login
              </Link>
            </div>
          ) : (
            <div className="card p-8 animate-slide-up">
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Mail className="h-7 w-7 text-primary-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Reset Password</h2>
                <p className="text-gray-500 text-sm mt-2">Enter your email and we'll send you a reset link</p>
              </div>

              <form onSubmit={handle} className="space-y-4">
                <div>
                  <label className="label">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="email"
                      className="input pl-10"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@school.com"
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Sending…
                    </span>
                  ) : 'Send Reset Link'}
                </button>
              </form>

              <p className="text-center text-sm mt-4">
                <Link to="/login" className="text-primary-600 hover:text-primary-700 dark:text-primary-400 flex items-center justify-center gap-1">
                  <ArrowLeft className="h-4 w-4" /> Back to Login
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
