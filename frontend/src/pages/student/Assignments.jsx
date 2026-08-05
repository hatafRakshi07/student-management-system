import React, { useEffect, useState } from 'react'
import { studentAPI, assignmentAPI } from '../../services/api'
import toast from 'react-hot-toast'
import Modal from '../../components/common/Modal'
import { Upload, CheckCircle, Clock, AlertCircle, FileText } from 'lucide-react'

export default function Assignments() {
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitModal, setSubmitModal] = useState(null)
  const [textContent, setTextContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = () => {
    studentAPI.assignments().then(r => { setAssignments(r.data.assignments || []); setLoading(false) }).catch(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const submit = async () => {
    if (!textContent.trim()) return toast.error('Please enter your answer')
    setSubmitting(true)
    try {
      await assignmentAPI.submit(submitModal.id, textContent)
      toast.success('Assignment submitted!')
      setSubmitModal(null)
      setTextContent('')
      load()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" />
    </div>
  )

  const pending = assignments.filter(a => !a.submitted)
  const submitted = assignments.filter(a => a.submitted)

  return (
    <div className="space-y-5 animate-page">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Assignments</h1>
          <p className="page-subtitle">Your academic tasks</p>
        </div>
        <div className="flex gap-2">
          <span className="badge badge-yellow">{pending.length} Pending</span>
          <span className="badge badge-green">{submitted.length} Done</span>
        </div>
      </div>

      {pending.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Pending</h2>
          <div className="space-y-3">
            {pending.map(a => {
              const isOverdue = new Date(a.deadline) < new Date()
              return (
                <div key={a.id} className={`card border-l-4 ${isOverdue ? 'border-l-red-400' : 'border-l-amber-400'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{a.title}</h3>
                      {a.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{a.description}</p>}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                        <div className="flex items-center gap-1">
                          {isOverdue
                            ? <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                            : <Clock className="h-3.5 w-3.5 text-amber-500" />
                          }
                          <span className={`text-xs font-medium ${isOverdue ? 'text-red-500' : 'text-gray-500'}`}>
                            {isOverdue ? 'Overdue · ' : 'Due · '}{new Date(a.deadline).toLocaleDateString()}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">{a.max_marks} marks</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setSubmitModal(a)}
                      className="btn-primary text-xs px-3 py-2 flex items-center gap-1.5 flex-shrink-0"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span className="hidden xs:inline">Submit</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {submitted.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Submitted</h2>
          <div className="space-y-3">
            {submitted.map(a => (
              <div key={a.id} className="card border-l-4 border-l-emerald-400">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{a.title}</h3>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-xs text-emerald-600 dark:text-emerald-400">
                        Submitted {new Date(a.submission?.submitted_at).toLocaleDateString()}
                      </span>
                    </div>
                    {a.submission?.feedback && (
                      <div className="mt-2 p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-xs text-blue-700 dark:text-blue-300">
                        <span className="font-medium">Feedback: </span>{a.submission.feedback}
                      </div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    {a.submission?.marks_obtained != null && (
                      <p className="font-bold text-primary-600 dark:text-primary-400 text-sm">{a.submission.marks_obtained}/{a.max_marks}</p>
                    )}
                    <span className={`badge mt-1 ${a.submission?.status === 'graded' ? 'badge-blue' : 'badge-green'}`}>
                      {a.submission?.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!assignments.length && (
        <div className="card text-center py-12">
          <FileText className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 dark:text-gray-500 text-sm">No assignments yet.</p>
        </div>
      )}

      <Modal open={!!submitModal} onClose={() => { setSubmitModal(null); setTextContent('') }} title={`Submit: ${submitModal?.title}`}>
        <div className="space-y-4">
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            <span>Due: {submitModal && new Date(submitModal.deadline).toLocaleString()}</span>
          </div>
          <div>
            <label className="label">Your Answer</label>
            <textarea
              className="input min-h-[120px] resize-none"
              value={textContent}
              onChange={e => setTextContent(e.target.value)}
              placeholder="Type your answer here..."
            />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setSubmitModal(null)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={submit} disabled={submitting} className="btn-primary flex-1">
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
