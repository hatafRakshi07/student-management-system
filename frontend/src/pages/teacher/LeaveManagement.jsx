import React, { useEffect, useState } from 'react'
import { leaveAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { CheckCircle, XCircle, Clock, FileText, Users, Search, Filter } from 'lucide-react'

const statusConfig = {
  pending: {
    badge: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    border: 'border-l-amber-400',
    icon: <Clock className="h-4 w-4 text-amber-500" />,
  },
  approved: {
    badge: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    border: 'border-l-emerald-400',
    icon: <CheckCircle className="h-4 w-4 text-emerald-500" />,
  },
  rejected: {
    badge: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    border: 'border-l-red-400',
    icon: <XCircle className="h-4 w-4 text-red-500" />,
  },
}

export default function LeaveManagement() {
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [reviewing, setReviewing] = useState(null)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const load = () => {
    setLoading(true)
    leaveAPI.allLeaves()
      .then(r => setLeaves(r.data.leaves || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const review = async (id, status) => {
    setReviewing(id)
    try {
      await leaveAPI.review(id, { status })
      toast.success(`Leave ${status}!`)
      load()
    } catch {
      toast.error('Action failed')
    } finally {
      setReviewing(null)
    }
  }

  const counts = {
    pending: leaves.filter(l => l.status === 'pending').length,
    approved: leaves.filter(l => l.status === 'approved').length,
    rejected: leaves.filter(l => l.status === 'rejected').length,
  }

  const getDays = (from, to) => {
    const diff = new Date(to) - new Date(from)
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1)
  }

  const filtered = leaves.filter(l => {
    const matchesFilter = filter === 'all' || l.status === filter
    const matchesSearch = !search ||
      l.student_name?.toLowerCase().includes(search.toLowerCase()) ||
      l.roll_number?.toLowerCase().includes(search.toLowerCase()) ||
      l.reason?.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  return (
    <div className="space-y-5 animate-page">
      <div>
        <h1 className="page-title">Leave Management</h1>
        <p className="page-subtitle">Review and manage student leave applications</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pending', count: counts.pending, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', icon: Clock },
          { label: 'Approved', count: counts.approved, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: CheckCircle },
          { label: 'Rejected', count: counts.rejected, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', icon: XCircle },
        ].map(({ label, count, color, bg, icon: Icon }) => (
          <div key={label} className={`card text-center p-4 ${bg}`}>
            <Icon className={`h-6 w-6 ${color} mx-auto mb-1`} />
            <p className={`text-2xl font-bold ${color}`}>{count}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Pending alert */}
      {counts.pending > 0 && (
        <div className="alert-warning text-sm">
          <p className="font-semibold">{counts.pending} leave application{counts.pending > 1 ? 's' : ''} awaiting your review</p>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              className="input pl-9"
              placeholder="Search by student name or reason…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {['all', 'pending', 'approved', 'rejected'].map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                  filter === s
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {s} {s !== 'all' && `(${counts[s] ?? leaves.length})`}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No leave applications found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(leave => {
              const cfg = statusConfig[leave.status] || statusConfig.pending
              const days = getDays(leave.from_date, leave.to_date)
              const isPending = leave.status === 'pending'
              return (
                <div
                  key={leave.id}
                  className={`p-4 rounded-xl border border-gray-100 dark:border-gray-700 border-l-4 ${cfg.border} bg-white dark:bg-gray-800/60 shadow-sm hover:shadow-md transition-shadow`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-sm font-bold text-primary-700 dark:text-primary-300 flex-shrink-0">
                        {(leave.student_name || 'S').charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm text-gray-900 dark:text-white">
                            {leave.student_name || `Student #${leave.student_id}`}
                          </p>
                          {leave.roll_number && (
                            <span className="text-xs text-gray-400">({leave.roll_number})</span>
                          )}
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${cfg.badge}`}>
                            {cfg.icon}
                            <span className="capitalize">{leave.status}</span>
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 line-clamp-2">{leave.reason}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 flex-wrap">
                          <span>
                            {new Date(leave.from_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            {' → '}
                            {new Date(leave.to_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </span>
                          <span className="font-medium text-primary-600 dark:text-primary-400">{days} day{days > 1 ? 's' : ''}</span>
                          <span>Applied {new Date(leave.created_at || leave.from_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </div>
                      </div>
                    </div>

                    {isPending && (
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => review(leave.id, 'rejected')}
                          disabled={reviewing === leave.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50 flex items-center gap-1"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Reject</span>
                        </button>
                        <button
                          onClick={() => review(leave.id, 'approved')}
                          disabled={reviewing === leave.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors disabled:opacity-50 flex items-center gap-1"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Approve</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
