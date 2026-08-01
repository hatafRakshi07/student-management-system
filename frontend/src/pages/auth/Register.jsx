import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authAPI } from '../../services/api'
import toast from 'react-hot-toast'
import LoadingSpinner from '../../components/common/LoadingSpinner'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    email: '', full_name: '', password: '', phone: '',
    roll_number: '', department: '', class_name: '', section: '', semester: '', year: ''
  })
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!form.full_name.trim()) return 'Full name is required'
    if (!form.email || !emailRe.test(form.email)) return 'Please enter a valid email address'
    if (form.password.length < 8) return 'Password must be at least 8 characters'
    if (!form.roll_number.trim()) return 'Roll number is required'
    return null
  }

  const handle = async (e) => {
    e.preventDefault()
    const err = validate()
    if (err) return toast.error(err)
    setLoading(true)
    try {
      await authAPI.registerStudent({ ...form, semester: Number(form.semester), year: Number(form.year) })
      toast.success('Registered successfully! Please login.')
      navigate('/login')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const f = (name) => ({ value: form[name], onChange: e => setForm(p => ({...p, [name]: e.target.value})) })

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg p-1.5">
            <img src="/logo.png" alt="Aklank College" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Student Registration</h2>
          <p className="text-gray-400 dark:text-gray-500 mt-1.5 text-sm">Aklank Girls P.G. College, Kota — Student Portal</p>
        </div>
        <div className="card">
          <form onSubmit={handle}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {[
                ['full_name', 'Full Name *', 'text', 'Arjun Mehta'],
                ['email', 'Email *', 'email', 'arjun@school.com'],
                ['password', 'Password *', 'password', '••••••••'],
                ['phone', 'Phone', 'tel', '+91 9876543210'],
                ['roll_number', 'Roll Number *', 'text', 'S001'],
                ['department', 'Department', 'text', 'Computer Science'],
                ['class_name', 'Class', 'text', 'CS-3A'],
                ['section', 'Section', 'text', 'A'],
                ['semester', 'Semester', 'number', '3'],
                ['year', 'Year', 'number', '2'],
              ].map(([name, label, type, placeholder]) => (
                <div key={name}>
                  <label className="label">{label}</label>
                  <input type={type} className="input" placeholder={placeholder} {...f(name)} />
                </div>
              ))}
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base">
              {loading ? <LoadingSpinner size="sm" /> : 'Create Account'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 dark:text-primary-400 font-semibold">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
