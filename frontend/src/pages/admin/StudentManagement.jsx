import React, { useEffect, useState } from 'react'
import { studentAPI, authAPI, feeAPI } from '../../services/api'
import toast from 'react-hot-toast'
import Modal from '../../components/common/Modal'
import {
  Plus, Trash2, Search, GraduationCap, Users, ChevronLeft, ChevronRight,
  Eye, DollarSign, UserCheck, Shield, Phone, FileText, Calendar, CheckCircle2, AlertCircle, RefreshCw
} from 'lucide-react'

export default function StudentManagement() {
  const [students, setStudents] = useState([])
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [modal, setModal] = useState(false)
  const [detailModal, setDetailModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState({ total: 0, skip: 0 })

  const [form, setForm] = useState({
    email: '', full_name: '', password: 'Student@123', phone: '',
    roll_number: '', department: 'Computer Science', class_name: 'CS-3A',
    section: 'A', semester: '3', year: '2',
  })

  const load = (q = search, skip = 0, cls = classFilter) => {
    setLoading(true)
    studentAPI.search({ query: q, class_name: cls, skip, limit: 25 }).then(r => {
      setStudents(r.data.students || [])
      setPage({ total: r.data.total || 0, skip })
    }).catch(() => {
      toast.error('Failed to search student records')
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [classFilter])

  const openStudentDetail = (s) => {
    setSelectedStudent(s)
    setDetailModal(true)
  }

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
    if (!confirm('Deactivate this student account?')) return
    await studentAPI.delete(id)
    toast.success('Student deactivated')
    load()
  }

  const totalPages = Math.ceil(page.total / 25)
  const currentPage = Math.floor(page.skip / 25) + 1

  return (
    <div className="space-y-5 animate-page">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-primary-700 dark:text-primary-400" /> Student Profile & Ledger Directory
          </h1>
          <p className="page-subtitle">{page.total} Total Registered Students in Database</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => load(search, page.skip)} className="btn-secondary flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={() => setModal(true)} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Student
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-4 text-center bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40">
          <p className="text-2xl font-black text-blue-700 dark:text-blue-300">{page.total}</p>
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mt-1">Total Enrolled</p>
        </div>
        <div className="card p-4 text-center bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40">
          <p className="text-2xl font-black text-emerald-600">
            {students.filter(s => s.status === 'ACTIVE').length}
          </p>
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mt-1">Active Batch</p>
        </div>
        <div className="card p-4 text-center bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/40">
          <p className="text-2xl font-black text-purple-600">
            {new Set(students.map(s => s.department)).size}
          </p>
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mt-1">Courses / Depts</p>
        </div>
        <div className="card p-4 text-center bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/40">
          <p className="text-2xl font-black text-amber-600">
            {students.filter(s => s.pending_fee > 0).length}
          </p>
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mt-1">Fee Pending</p>
        </div>
      </div>

      <div className="card">
        {/* Search & Filter bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              className="input pl-9 text-sm"
              placeholder="Search by Name, Scholar No, Reg No, Mobile, Father Name…"
              value={search}
              onChange={e => { setSearch(e.target.value); load(e.target.value, 0) }}
            />
          </div>
          <select
            className="input sm:w-48 text-sm"
            value={classFilter}
            onChange={e => { setClassFilter(e.target.value); load(search, 0, e.target.value) }}
          >
            <option value="">All Classes</option>
            <option value="B.A">B.A</option>
            <option value="B.C.A">B.C.A</option>
            <option value="B.Com">B.Com</option>
            <option value="B.Sc">B.Sc</option>
            <option value="M.A">M.A</option>
          </select>
        </div>

        {/* Table */}
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Scholar / Reg No</th>
                <th>Father's Name</th>
                <th>Class / Dept</th>
                <th>Mobile</th>
                <th>Fee Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => {
                const name = s.student_name || s.full_name || 'Student'
                const scholarReg = s.scholar_no || s.reg_no || s.roll_number || s.admission_no || '—'
                const father = s.father_name || '—'
                const mobile = s.mobile || s.phone || '—'

                return (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer" onClick={() => openStudentDetail(s)}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-sm font-bold text-primary-700 dark:text-primary-300 flex-shrink-0">
                          {name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white text-sm">{name}</p>
                          <p className="text-xs text-gray-400">{s.category || 'General'}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <p className="font-semibold text-gray-900 dark:text-white text-xs">{scholarReg}</p>
                      {s.reg_no && s.reg_no !== scholarReg && <p className="text-[11px] text-gray-400">{s.reg_no}</p>}
                    </td>
                    <td className="text-gray-700 dark:text-gray-300 text-sm font-medium">{father}</td>
                    <td>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{s.class_name || '—'}</p>
                      <p className="text-xs text-gray-400">{s.department}</p>
                    </td>
                    <td className="text-sm font-medium text-gray-600 dark:text-gray-300">{mobile}</td>
                  <td>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      s.pending_fee <= 0
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    }`}>
                      {s.pending_fee <= 0 ? 'PAID' : `DUES ₹${s.pending_fee}`}
                    </span>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openStudentDetail(s)} className="p-1.5 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg text-primary-600 transition-colors" title="View Full Details">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button onClick={() => del(s.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-600 transition-colors" title="Deactivate">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
              {!students.length && !loading && (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <GraduationCap className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-500 font-semibold">No student records found matching query.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-500">Page {currentPage} of {totalPages} ({page.total} records)</p>
            <div className="flex gap-2">
              <button onClick={() => load(search, page.skip - 25)} disabled={page.skip === 0}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-40">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => load(search, page.skip + 25)} disabled={page.skip + 25 >= page.total}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-40">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Student Detailed Profile Modal */}
      {selectedStudent && (
        <Modal open={detailModal} onClose={() => setDetailModal(false)} title={`Student Master Dossier — ${selectedStudent.student_name}`} size="lg">
          <div className="space-y-6">
            {/* Header info */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-primary-900 to-primary-800 text-white flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-black text-white">
                  {(selectedStudent.student_name || 'S').charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-black">{selectedStudent.student_name}</h2>
                  <p className="text-xs text-primary-200">Scholar / Roll No: <span className="font-bold text-amber-300">{selectedStudent.scholar_no || 'N/A'}</span></p>
                  <p className="text-xs text-primary-200">Reg No: {selectedStudent.reg_no || 'N/A'} | Admission No: {selectedStudent.admission_no || 'N/A'}</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold">
                {selectedStudent.status || 'ACTIVE'}
              </span>
            </div>

            {/* Grid Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card p-4 space-y-3 bg-gray-50/50 dark:bg-gray-800/40 border border-gray-200/60 dark:border-gray-700/60">
                <h3 className="font-bold text-gray-900 dark:text-white text-sm border-b border-gray-200 dark:border-gray-700 pb-2">Academic & Personal Profile</h3>
                <div className="text-xs space-y-2 text-gray-700 dark:text-gray-300">
                  <p><span className="font-semibold text-gray-500">Class Name:</span> {selectedStudent.class_name || 'N/A'}</p>
                  <p><span className="font-semibold text-gray-500">Department:</span> {selectedStudent.department || 'N/A'}</p>
                  <p><span className="font-semibold text-gray-500">Father's Name:</span> {selectedStudent.father_name || 'N/A'}</p>
                  <p><span className="font-semibold text-gray-500">Mother's Name:</span> {selectedStudent.mother_name || 'N/A'}</p>
                  <p><span className="font-semibold text-gray-500">Mobile Number:</span> {selectedStudent.mobile || 'N/A'}</p>
                  <p><span className="font-semibold text-gray-500">DOB / Gender:</span> {selectedStudent.dob || 'N/A'} ({selectedStudent.gender || 'Female'})</p>
                </div>
              </div>

              <div className="card p-4 space-y-3 bg-gray-50/50 dark:bg-gray-800/40 border border-gray-200/60 dark:border-gray-700/60">
                <h3 className="font-bold text-gray-900 dark:text-white text-sm border-b border-gray-200 dark:border-gray-700 pb-2">Fee Ledger & Login Credentials</h3>
                <div className="text-xs space-y-2 text-gray-700 dark:text-gray-300">
                  <p><span className="font-semibold text-gray-500">Total Fee:</span> ₹{selectedStudent.total_fee || 0}</p>
                  <p><span className="font-semibold text-gray-500">Total Paid:</span> <span className="text-emerald-600 font-bold">₹{selectedStudent.total_paid || 0}</span></p>
                  <p><span className="font-semibold text-gray-500">Pending Balance:</span> <span className="text-amber-600 font-bold">₹{selectedStudent.pending_fee || 0}</span></p>
                  <p className="pt-2 border-t border-gray-200 dark:border-gray-700"><span className="font-semibold text-gray-500">Student Username:</span> <span className="font-mono text-primary-600 dark:text-primary-400 font-bold">{selectedStudent.student_name?.toLowerCase().replace(/[^a-z0-9]/g, '')}</span></p>
                  <p><span className="font-semibold text-gray-500">Student Password:</span> <span className="font-mono bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded font-bold text-gray-900 dark:text-white">{selectedStudent.mobile || selectedStudent.scholar_no}</span></p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setDetailModal(false)} className="btn-secondary text-xs">Close</button>
              <button onClick={() => toast.success(`Receipt printed for ${selectedStudent.student_name}`)} className="btn-primary text-xs flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" /> Print Fee Receipt
              </button>
            </div>
          </div>
        </Modal>
      )}

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
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
          <button onClick={create} disabled={loading} className="btn-primary">
            {loading ? 'Adding…' : 'Add Student'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
