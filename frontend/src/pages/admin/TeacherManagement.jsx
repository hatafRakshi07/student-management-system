import React, { useEffect, useState } from 'react'
import { teacherAPI, authAPI } from '../../services/api'
import toast from 'react-hot-toast'
import Modal from '../../components/common/Modal'
import { Plus, Trash2, Search, Users, Briefcase } from 'lucide-react'

export default function TeacherManagement() {
  const [teachers, setTeachers] = useState([])
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ email: '', full_name: '', password: 'Teacher@123', phone: '', employee_id: '', department: '', qualification: '', experience_years: '' })
  const [loading, setLoading] = useState(false)

  const load = () => teacherAPI.list({ search }).then(r => setTeachers(r.data.teachers || [])).catch(() => {})
  useEffect(() => { load() }, [])

  const create = async () => {
    if (!form.email || !form.employee_id || !form.full_name) return toast.error('Fill required fields')
    setLoading(true)
    try {
      await authAPI.registerTeacher({ ...form, experience_years: Number(form.experience_years) || 0 })
      toast.success('Teacher added!')
      setModal(false)
      setForm({ email: '', full_name: '', password: 'Teacher@123', phone: '', employee_id: '', department: '', qualification: '', experience_years: '' })
      load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
    finally { setLoading(false) }
  }

  const del = async (id) => {
    if (!confirm('Deactivate this teacher?')) return
    await teacherAPI.delete(id)
    toast.success('Teacher deactivated')
    load()
  }

  const filtered = teachers.filter(t =>
    !search || t.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.email?.toLowerCase().includes(search.toLowerCase()) ||
    t.employee_id?.toLowerCase().includes(search.toLowerCase())
  )

  const deptCounts = filtered.reduce((acc, t) => {
    const d = t.department || 'Other'
    acc[d] = (acc[d] || 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-5 animate-page">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="page-title">Teacher Management</h1>
          <p className="page-subtitle">{teachers.length} teachers in the system</p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary flex items-center gap-2 self-start">
          <Plus className="h-4 w-4" /> Add Teacher
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="card p-4 text-center bg-purple-50 dark:bg-purple-900/20">
          <p className="text-2xl font-bold text-purple-600">{teachers.length}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">Total Teachers</p>
        </div>
        <div className="card p-4 text-center bg-emerald-50 dark:bg-emerald-900/20">
          <p className="text-2xl font-bold text-emerald-600">{teachers.filter(t => t.is_active).length}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">Active</p>
        </div>
        <div className="card p-4 text-center bg-blue-50 dark:bg-blue-900/20 col-span-2 sm:col-span-1">
          <p className="text-2xl font-bold text-blue-600">{Object.keys(deptCounts).length}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">Departments</p>
        </div>
      </div>

      <div className="card">
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input className="input pl-9" placeholder="Search by name, email, ID…" value={search}
              onChange={e => { setSearch(e.target.value); load() }} />
          </div>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                {['Teacher', 'Employee ID', 'Department', 'Qualification', 'Experience', 'Actions'].map(h => <th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-xs font-bold text-purple-700 dark:text-purple-300 flex-shrink-0">
                        {t.full_name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">{t.full_name}</p>
                        <p className="text-xs text-gray-400">{t.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-gray-500 text-sm">{t.employee_id}</td>
                  <td>{t.department || '—'}</td>
                  <td>{t.qualification || '—'}</td>
                  <td>{t.experience_years ? `${t.experience_years} yrs` : '—'}</td>
                  <td>
                    <button onClick={() => del(t.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-600 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr><td colSpan={6} className="py-12 text-center">
                  <Users className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-500">No teachers found.</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Add New Teacher" size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            ['full_name', 'Full Name *', 'text'],
            ['email', 'Email *', 'email'],
            ['password', 'Password', 'password'],
            ['phone', 'Phone', 'tel'],
            ['employee_id', 'Employee ID *', 'text'],
            ['department', 'Department', 'text'],
            ['qualification', 'Qualification', 'text'],
            ['experience_years', 'Experience (years)', 'number'],
          ].map(([name, label, type]) => (
            <div key={name}>
              <label className="label">{label}</label>
              <input type={type} className="input" value={form[name]}
                onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))} />
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={() => setModal(false)} className="btn-secondary flex-1">Cancel</button>
          <button onClick={create} disabled={loading} className="btn-primary flex-1">{loading ? 'Adding…' : 'Add Teacher'}</button>
        </div>
      </Modal>
    </div>
  )
}
