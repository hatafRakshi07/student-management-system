import React, { useEffect, useState } from 'react'
import { assignmentAPI } from '../../services/api'
import toast from 'react-hot-toast'
import Modal from '../../components/common/Modal'
import { Plus, Eye, Trash2, ClipboardList, Clock, CheckCircle, Award } from 'lucide-react'

export default function AssignmentManagement() {
  const [assignments, setAssignments] = useState([])
  const [modal, setModal] = useState(false)
  const [viewSubs, setViewSubs] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [form, setForm] = useState({ title: '', description: '', deadline: '', max_marks: 100 })
  const [loading, setLoading] = useState(false)
  const [gradeModal, setGradeModal] = useState(null)
  const [gradeForm, setGradeForm] = useState({ marks: '', feedback: '' })

  const load = () => assignmentAPI.list().then(r => setAssignments(r.data.assignments || [])).catch(() => {})
  useEffect(() => { load() }, [])

  const create = async () => {
    if (!form.title || !form.deadline) return toast.error('Fill required fields')
    setLoading(true)
    try {
      await assignmentAPI.create({ ...form, max_marks: Number(form.max_marks) })
      toast.success('Assignment created!')
      setModal(false)
      setForm({ title: '', description: '', deadline: '', max_marks: 100 })
      load()
    } catch { toast.error('Failed') } finally { setLoading(false) }
  }

  const del = async (id) => {
    if (!confirm('Delete this assignment?')) return
    await assignmentAPI.delete(id)
    toast.success('Deleted')
    load()
  }

  const viewSubmissions = async (a) => {
    const r = await assignmentAPI.getSubmissions(a.id)
    setSubmissions(r.data.submissions || [])
    setViewSubs(a)
  }

  const gradeSubmission = async () => {
    if (!gradeForm.marks) return toast.error('Enter marks')
    try {
      await assignmentAPI.gradeSubmission(gradeModal.id, { marks_obtained: Number(gradeForm.marks), feedback: gradeForm.feedback })
      toast.success('Graded!')
      setGradeModal(null)
      if (viewSubs) {
        const r = await assignmentAPI.getSubmissions(viewSubs.id)
        setSubmissions(r.data.submissions || [])
      }
    } catch { toast.error('Failed to grade') }
  }

  const isOverdue = (deadline) => new Date(deadline) < new Date()

  return (
    <div className="space-y-5 animate-page">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="page-title">Assignments</h1>
          <p className="page-subtitle">Create and manage class assignments</p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary flex items-center gap-2 self-start">
          <Plus className="h-4 w-4" /> New Assignment
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total', value: assignments.length, color: 'text-primary-600', bg: 'bg-primary-50 dark:bg-primary-900/20' },
          { label: 'Active', value: assignments.filter(a => !isOverdue(a.deadline)).length, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'Overdue', value: assignments.filter(a => isOverdue(a.deadline)).length, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`card text-center p-4 ${bg}`}>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {assignments.map(a => {
          const overdue = isOverdue(a.deadline)
          return (
            <div key={a.id} className={`card border-l-4 ${overdue ? 'border-l-red-400' : 'border-l-emerald-400'} hover:shadow-md transition-shadow`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${overdue ? 'bg-red-100 dark:bg-red-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30'}`}>
                    <ClipboardList className={`h-5 w-5 ${overdue ? 'text-red-600' : 'text-emerald-600'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{a.title}</h3>
                    {a.description && <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{a.description}</p>}
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        Due: {new Date(a.deadline).toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Award className="h-3.5 w-3.5" />
                        Max: {a.max_marks} marks
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => viewSubmissions(a)} className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl text-blue-600 transition-colors" title="View submissions">
                    <Eye className="h-4 w-4" />
                  </button>
                  <button onClick={() => del(a.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-red-600 transition-colors" title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {overdue && <p className="mt-2 text-xs text-red-500 font-medium">Deadline passed</p>}
            </div>
          )
        })}
        {!assignments.length && (
          <div className="card text-center py-12">
            <ClipboardList className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500">No assignments created yet.</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Create Assignment">
        <div className="space-y-4">
          <div>
            <label className="label">Title *</label>
            <input className="input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Assignment title" />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input h-24 resize-none" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Instructions, requirements…" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Deadline *</label>
              <input type="datetime-local" className="input" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} />
            </div>
            <div>
              <label className="label">Max Marks</label>
              <input type="number" className="input" value={form.max_marks} min={1} onChange={e => setForm(p => ({ ...p, max_marks: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={create} disabled={loading} className="btn-primary flex-1">{loading ? 'Creating…' : 'Create'}</button>
          </div>
        </div>
      </Modal>

      {/* Submissions Modal */}
      <Modal open={!!viewSubs} onClose={() => setViewSubs(null)} title={`Submissions — ${viewSubs?.title}`} size="lg">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                {['Student', 'Submitted', 'Status', 'Marks', 'Grade', 'Action'].map(h => <th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {submissions.map(s => (
                <tr key={s.id}>
                  <td className="font-medium">Student #{s.student_id}</td>
                  <td className="text-gray-500 text-xs">{new Date(s.submitted_at).toLocaleDateString()}</td>
                  <td><span className={`badge ${s.status === 'graded' ? 'badge-green' : s.status === 'late' ? 'badge-red' : 'badge-blue'}`}>{s.status}</span></td>
                  <td>{s.marks_obtained ?? '—'}</td>
                  <td>{s.grade ?? '—'}</td>
                  <td>
                    {s.status !== 'graded' && (
                      <button onClick={() => { setGradeModal(s); setGradeForm({ marks: '', feedback: '' }) }}
                        className="text-xs btn-primary py-1 px-3 flex items-center gap-1">
                        <Award className="h-3 w-3" /> Grade
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!submissions.length && <tr><td colSpan={6} className="py-8 text-center text-gray-500">No submissions yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Modal>

      {/* Grade Modal */}
      <Modal open={!!gradeModal} onClose={() => setGradeModal(null)} title="Grade Submission">
        <div className="space-y-4">
          <div>
            <label className="label">Marks Obtained *</label>
            <input type="number" className="input" placeholder={`Out of ${viewSubs?.max_marks}`} value={gradeForm.marks}
              onChange={e => setGradeForm(p => ({ ...p, marks: e.target.value }))} min={0} max={viewSubs?.max_marks} />
          </div>
          <div>
            <label className="label">Feedback</label>
            <textarea className="input h-20 resize-none" value={gradeForm.feedback}
              onChange={e => setGradeForm(p => ({ ...p, feedback: e.target.value }))} placeholder="Optional feedback for student…" />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setGradeModal(null)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={gradeSubmission} className="btn-primary flex-1">Save Grade</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
