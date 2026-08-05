import React, { useEffect, useState } from 'react'
import { feeAPI, studentAPI } from '../../services/api'
import toast from 'react-hot-toast'
import Modal from '../../components/common/Modal'
import { Plus, DollarSign, CheckCircle, Clock, AlertTriangle, TrendingUp } from 'lucide-react'

export default function FeeManagement() {
  const [fees, setFees] = useState([])
  const [students, setStudents] = useState([])
  const [stats, setStats] = useState(null)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ student_id: '', amount: '', fee_type: 'Tuition', due_date: '' })
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('')
  const [markingPaid, setMarkingPaid] = useState(null)

  const load = () => {
    feeAPI.list(filter ? { status: filter } : {}).then(r => setFees(r.data.fees || [])).catch(() => {})
    feeAPI.stats().then(r => setStats(r.data)).catch(() => {})
  }
  useEffect(() => {
    load()
    studentAPI.list({ limit: 200 }).then(r => setStudents(r.data.students || [])).catch(() => {})
  }, [])
  useEffect(() => { load() }, [filter])

  const create = async () => {
    if (!form.student_id || !form.amount || !form.due_date) return toast.error('Fill required fields')
    setLoading(true)
    try {
      await feeAPI.create({ ...form, student_id: Number(form.student_id), amount: Number(form.amount) })
      toast.success('Fee record created!')
      setModal(false)
      setForm({ student_id: '', amount: '', fee_type: 'Tuition', due_date: '' })
      load()
    } catch { toast.error('Failed') } finally { setLoading(false) }
  }

  const markPaid = async (id) => {
    setMarkingPaid(id)
    try {
      await feeAPI.pay(id, { status: 'paid' })
      toast.success('Marked as paid')
      load()
    } catch { toast.error('Failed') } finally { setMarkingPaid(null) }
  }

  const getStudentName = (id) => students.find(s => s.id === id)?.full_name || `#${id}`
  const collectRate = stats?.total > 0 ? Math.round((stats.paid / stats.total) * 100) : 0

  return (
    <div className="space-y-5 animate-page">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="page-title">Fee Management</h1>
          <p className="page-subtitle">Track and collect student fees</p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary flex items-center gap-2 self-start">
          <Plus className="h-4 w-4" /> Add Fee Record
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label: 'Total', value: `₹${stats.total?.toLocaleString()}`, icon: DollarSign, bg: 'bg-gray-100 dark:bg-gray-700', iconColor: 'text-gray-600 dark:text-gray-300' },
            { label: 'Collected', value: `₹${stats.paid?.toLocaleString()}`, icon: CheckCircle, bg: 'bg-emerald-100 dark:bg-emerald-900/30', iconColor: 'text-emerald-600' },
            { label: 'Pending', value: `₹${stats.pending?.toLocaleString()}`, icon: Clock, bg: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600' },
            { label: 'Collection Rate', value: `${collectRate}%`, icon: TrendingUp, bg: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600' },
          ].map(({ label, value, icon: Icon, bg, iconColor }) => (
            <div key={label} className="card card-hover flex items-center gap-3 p-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
                <Icon className={`h-5 w-5 ${iconColor}`} />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{value}</p>
                <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Collection progress bar */}
      {stats?.total > 0 && (
        <div className="card">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600 dark:text-gray-400">Fee collection progress</span>
            <span className="font-bold text-emerald-600">{collectRate}%</span>
          </div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-700" style={{ width: `${collectRate}%` }} />
          </div>
        </div>
      )}

      <div className="card">
        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          {['', 'paid', 'unpaid', 'overdue'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === s ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
              {s === '' ? 'All' : s}
            </button>
          ))}
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                {['Student', 'Type', 'Amount', 'Due Date', 'Status', 'Action'].map(h => <th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {fees.map(f => (
                <tr key={f.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-300 flex-shrink-0">
                        {getStudentName(f.student_id)?.charAt(0)}
                      </div>
                      <span className="font-medium text-sm">{getStudentName(f.student_id)}</span>
                    </div>
                  </td>
                  <td>{f.fee_type}</td>
                  <td className="font-bold text-gray-900 dark:text-white">₹{f.amount?.toLocaleString()}</td>
                  <td className="text-gray-500 text-xs">{new Date(f.due_date).toLocaleDateString()}</td>
                  <td>
                    <span className={`badge ${f.status === 'paid' ? 'badge-green' : f.status === 'overdue' ? 'badge-red' : 'badge-yellow'}`}>{f.status}</span>
                  </td>
                  <td>
                    {f.status !== 'paid' && (
                      <button onClick={() => markPaid(f.id)} disabled={markingPaid === f.id}
                        className="text-xs btn-primary py-1 px-3">
                        {markingPaid === f.id ? '…' : 'Mark Paid'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!fees.length && (
                <tr><td colSpan={6} className="py-12 text-center">
                  <DollarSign className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-500">No fee records.</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Add Fee Record">
        <div className="space-y-4">
          <div>
            <label className="label">Student *</label>
            <select className="input" value={form.student_id} onChange={e => setForm(p => ({ ...p, student_id: e.target.value }))}>
              <option value="">Select student…</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.roll_number})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Fee Type</label>
              <select className="input" value={form.fee_type} onChange={e => setForm(p => ({ ...p, fee_type: e.target.value }))}>
                {['Tuition', 'Library', 'Lab', 'Sports', 'Exam', 'Hostel'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Amount (₹) *</label>
              <input type="number" className="input" value={form.amount} min={1} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="label">Due Date *</label>
              <input type="datetime-local" className="input" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={create} disabled={loading} className="btn-primary flex-1">{loading ? 'Creating…' : 'Create'}</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
