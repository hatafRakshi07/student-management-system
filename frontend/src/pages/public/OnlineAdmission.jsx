import React, { useState } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { GraduationCap, CheckCircle, User, Mail, Phone, BookOpen, Send } from 'lucide-react'

export default function OnlineAdmission() {
  const [form, setForm] = useState({
    applicant_name: '',
    email: '',
    mobile: '',
    father_name: '',
    course_applied: 'B.A. I-SEM',
    tenth_percentage: '78.5',
    twelfth_percentage: '82.0'
  })
  const [submittedApp, setSubmittedApp] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await api.post('/admission/apply', form)
      setSubmittedApp(res.data)
      toast.success('Online Admission Application Submitted Successfully!')
    } catch {
      toast.error('Failed to submit application')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6 animate-page">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/50 text-primary-700 rounded-2xl flex items-center justify-center mx-auto">
          <GraduationCap className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Online Admission Application Portal 2026</h1>
        <p className="text-xs text-gray-500">Apply for Academic Sessions 2026-27 with instant ERP profile generation</p>
      </div>

      {!submittedApp ? (
        <form onSubmit={handleSubmit} className="card p-6 space-y-4 text-xs">
          <div>
            <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Applicant Full Name *</label>
            <input type="text" required value={form.applicant_name} onChange={e => setForm({ ...form, applicant_name: e.target.value })} placeholder="e.g. Rahul Sharma" className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-800" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Email Address *</label>
              <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="rahul@example.com" className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-800" />
            </div>
            <div>
              <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Mobile Number *</label>
              <input type="text" required value={form.mobile} onChange={e => setForm({ ...form, mobile: e.target.value })} placeholder="9876543210" className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-800" />
            </div>
          </div>

          <div>
            <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Father's Name *</label>
            <input type="text" required value={form.father_name} onChange={e => setForm({ ...form, father_name: e.target.value })} placeholder="Mr. Suresh Sharma" className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-800" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Course Applied</label>
              <select value={form.course_applied} onChange={e => setForm({ ...form, course_applied: e.target.value })} className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-800">
                <option value="B.A. I-SEM">B.A. I-SEM</option>
                <option value="B.Sc. I-SEM">B.Sc. I-SEM</option>
                <option value="B.Com. I-SEM">B.Com. I-SEM</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">10th Percentage</label>
              <input type="text" value={form.tenth_percentage} onChange={e => setForm({ ...form, tenth_percentage: e.target.value })} className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-800" />
            </div>
            <div>
              <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">12th Percentage</label>
              <input type="text" value={form.twelfth_percentage} onChange={e => setForm({ ...form, twelfth_percentage: e.target.value })} className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-800" />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full btn-primary py-3 text-xs flex items-center justify-center gap-2">
            <Send className="w-4 h-4" /> Submit Application & Proceed
          </button>
        </form>
      ) : (
        <div className="card p-6 text-center space-y-4 border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/40">
          <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto" />
          <h2 className="text-lg font-bold text-emerald-900 dark:text-emerald-100">Application Submitted Successfully!</h2>
          <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 text-left space-y-2 text-xs">
            <p><span className="font-bold">Registration Number:</span> <span className="font-mono text-primary-700 font-bold">{submittedApp.registration_no}</span></p>
            <p><span className="font-bold">Status:</span> <span className="badge badge-green">{submittedApp.status}</span></p>
          </div>
        </div>
      )}
    </div>
  )
}
