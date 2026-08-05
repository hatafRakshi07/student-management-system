import React, { useEffect, useState } from 'react'
import { leaveAPI } from '../../services/api'
import toast from 'react-hot-toast'
import Modal from '../../components/common/Modal'
import { FileText, Plus, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react'

const statusConfig = {
  pending: { badge: 'badge-yellow', icon: <Clock className="h-4 w-4 text-amber-500" />, bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' },
  approved: { badge: 'badge-green', icon: <CheckCircle className="h-4 w-4 text-emerald-500" />, bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' },
  rejected: { badge: 'badge-red', icon: <XCircle className="h-4 w-4 text-red-500" />, bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' },
}

export default function Leaves() {
  const [leaves, setLeaves] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ reason: '', from_date: '', to_date: '' })
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all')

  const load = () => leaveAPI.myLeaves().then(r => setLeaves(r.data.leaves || [])).catch(() => {})
  useEffect(() => { load() }, [])

  const submit = async () => {
    if (!form.reason || !form.from_date || !form.to_date) return toast.error('Fill all fields')
    setLoading(true)
    try {
      await leaveAPI.apply(form)
      toast.success('Leave application submitted')
      setModal(false)
      setForm({ reason: '', from_date: '', to_date: '' })
      load()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  const filtered = filter === 'all' ? leaves : leaves.filter(l => l.status === filter)
  const counts = { pending: leaves.filter(l => l.status === 'pending').length, approved: leaves.filter(l => l.status === 'approved').length, rejected: leaves.filter(l => l.status === 'rejected').length }

  const getDays = (from, to) => {
    const diff = new Date(to) - new Date(from)
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1)
  }

  return (
    <div className="space-y-5 animate-page">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="page-title">Leave Applications</h1>
          <p className="page-subtitle">Apply and track your leave requests</p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary flex items-center gap-2 self-start sm:self-auto">
          <Plus className="h-4 w-4" /> Apply for Leave
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pending', count: counts.pending, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
          { label: 'Approved', count: counts.approved, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'Rejected', count: counts.rejected, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
        ].map(({ label, count, color, bg }) => (
          <div key={label} className={`card text-center p-4 ${bg}`}>
            <p className={`text-2xl font-bold ${color}`}>{count}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'pending', 'approved', 'rejected'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === s ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
            {s === 'all' ? 'All' : s} {s !== 'all' && counts[s] > 0 ? `(${counts[s]})` : ''}
          </button>
        ))}
      </div>

      {/* Leave cards */}
      <div className="space-y-3">
        {filtered.map(l => {
          const cfg = statusConfig[l.status] || statusConfig.pending
          return (
            <div key={l.id} className={`card border ${cfg.bg} p-4`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="mt-0.5">{cfg.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{l.reason}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(l.from_date).toLocaleDateString()} – {new Date(l.to_date).toLocaleDateString()}
                      </span>
                      <span className="text-xs text-gray-400">({getDays(l.from_date, l.to_date)} day{getDays(l.from_date, l.to_date) > 1 ? 's' : ''})</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Applied: {new Date(l.applied_at).toLocaleDateString()}</p>
                    {l.remarks && <p className="text-xs text-gray-500 italic mt-1">"{l.remarks}"</p>}
                  </div>
                </div>
                <span className={`badge flex-shrink-0 ${cfg.badge}`}>{l.status}</span>
              </div>
            </div>
          )
        })}
        {!filtered.length && (
          <div className="card text-center py-12">
            <FileText className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500">{filter === 'all' ? 'No leave applications yet.' : `No ${filter} applications.`}</p>
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Apply for Leave">
        <div className="space-y-4">
          <div>
            <label className="label">Reason for Leave *</label>
            <textarea className="input h-24 resize-none" value={form.reason}
              onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
              placeholder="Describe the reason for your leave request..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">From Date *</label>
              <input type="date" className="input" value={form.from_date}
                onChange={e => setForm(p => ({ ...p, from_date: e.target.value }))} />
            </div>
            <div>
              <label className="label">To Date *</label>
              <input type="date" className="input" value={form.to_date}
                min={form.from_date}
                onChange={e => setForm(p => ({ ...p, to_date: e.target.value }))} />
            </div>
          </div>
          {form.from_date && form.to_date && (
            <p className="text-sm text-primary-600 dark:text-primary-400">
              Duration: {getDays(form.from_date, form.to_date)} day(s)
            </p>
          )}
          <div className="flex gap-3 pt-1">
            <button onClick={() => setModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={submit} disabled={loading} className="btn-primary flex-1">
              {loading ? 'Submitting…' : 'Submit Application'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
