import React, { useEffect, useState } from 'react'
import { studentAPI, authAPI } from '../../services/api'
import toast from 'react-hot-toast'
import Modal from '../../components/common/Modal'
import { Plus, Trash2, Search, GraduationCap, Users, ChevronLeft, ChevronRight } from 'lucide-react'

export default function StudentManagement() {
  const [students, setStudents] = useState([])
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({
    email: '', full_name: '', password: 'Student@123', phone: '',
    roll_number: '', department: 'Computer Science', class_name: 'CS-3A',
    section: 'A', semester: '3', year: '2',
  })
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState({ total: 0, skip: 0 })

  const load = (q = search, skip = 0) => {
    studentAPI.list({ search: q, skip, limit: 20 }).then(r => {
      setStudents(r.data.students || [])
      setPage({ total: r.data.total || 0, skip })
    }).catch(() => {})
  }
  useEffect(() => { load() }, [])

  const create = async () => {
    if (!form.email || !form.roll_number || !form.full_name) return toast.error('Fill required fields')
    setLoading(true)
    try {
      await authAPI.registerStudent({ ...form, semester: Number(form.semester), year: Number(form.year) })
      toast.success('Student added!')
      setModal(false)
      setForm({ email: '', full_name: '', password: 'Student@123', phone: '', roll_number: '', department: 'Computer Science', class_name: 'CS-3A', section: 'A', semester: '3', year: '2' })
      load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
    finally { setLoading(false) }
  }

  const del = async (id) => {
    if (!confirm('Deactivate this student?')) return
    await studentAPI.delete(id)
    toast.success('Student deactivated')
    load()
  }

  const totalPages = Math.ceil(page.total / 20)
  const currentPage = Math.floor(page.skip / 20) + 1

  return (
    <div className="space-y-5 animate-page">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="page-title">Student Management</h1>
          <p className="page-subtitle">{page.total} students enrolled</p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary flex items-center gap-2 self-start">
          <Plus className="h-4 w-4" /> Add Student
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="card p-4 text-center bg-blue-50 dark:bg-blue-900/20">
          <p className="text-2xl font-bold text-blue-600">{page.total}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">Total Students</p>
        </div>
        <div className="card p-4 text-center bg-emerald-50 dark:bg-emerald-900/20">
          <p className="text-2xl font-bold text-emerald-600">{students.filter(s => s.is_active).length}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">Active</p>
        </div>
        <div className="card p-4 text-center bg-purple-50 dark:bg-purple-900/20 col-span-2 sm:col-span-1">
          <p className="text-2xl font-bold text-purple-600">{new Set(students.map(s => s.department)).size}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">Departments</p>
        </div>
      </div>

      <div className="card">
        {/* Search bar */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input className="input pl-9" placeholder="Search by name, email, roll no…" value={search}
              onChange={e => { setSearch(e.target.value); load(e.target.value, 0) }} />
          </div>
        </div>

        {/* Table */}
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                {['Student', 'Roll No', 'Class', 'Department', 'Semester', 'Actions'].map(h => <th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xs font-bold text-primary-700 dark:text-primary-300 flex-shrink-0">
                        {s.full_name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">{s.full_name}</p>
                        <p className="text-xs text-gray-400">{s.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-gray-500 text-sm">{s.roll_number}</td>
                  <td>{s.class_name || '—'}</td>
                  <td>{s.department || '—'}</td>
                  <td>{s.semester ? `Sem ${s.semester}` : '—'}</td>
                  <td>
                    <button onClick={() => del(s.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-600 transition-colors" title="Deactivate">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {!students.length && (
                <tr><td colSpan={6} className="py-12 text-center">
                  <GraduationCap className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-500">No students found.</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-500">Page {currentPage} of {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => load(search, page.skip - 20)} disabled={page.skip === 0}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-40">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => load(search, page.skip + 20)} disabled={page.skip + 20 >= page.total}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-40">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Student Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Add New Student" size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            ['full_name', 'Full Name *', 'text'],
            ['email', 'Email *', 'email'],
            ['password', 'Password', 'password'],
            ['phone', 'Phone', 'tel'],
            ['roll_number', 'Roll Number *', 'text'],
            ['department', 'Department', 'text'],
            ['class_name', 'Class', 'text'],
            ['section', 'Section', 'text'],
            ['semester', 'Semester', 'number'],
            ['year', 'Year', 'number'],
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
          <button onClick={create} disabled={loading} className="btn-primary flex-1">{loading ? 'Adding…' : 'Add Student'}</button>
        </div>
      </Modal>
    </div>
  )
}
