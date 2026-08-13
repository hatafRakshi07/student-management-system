import React, { useEffect, useState } from 'react'
import { studentAPI, assignmentAPI } from '../../services/api'
import toast from 'react-hot-toast'
import Modal from '../../components/common/Modal'
import { Upload, CheckCircle, Clock, AlertCircle, FileText, GraduationCap, BookOpen, Award } from 'lucide-react'

export default function Assignments() {
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitModal, setSubmitModal] = useState(null)
  const [textContent, setTextContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = () => {
    studentAPI.assignments()
      .then(r => { setAssignments(r.data.assignments || []); setLoading(false) })
      .catch(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const submit = async () => {
    if (!textContent.trim()) return toast.error('Please enter your answer or solution')
    setSubmitting(true)
    try {
      await assignmentAPI.submit(submitModal.id, textContent)
      toast.success('Assignment submitted successfully!')
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
    <div className="space-y-6 animate-page pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-primary-600 dark:text-primary-400" />
            My Class Assignments
          </h1>
          <p className="page-subtitle">View and submit coursework assigned to your class and semester</p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <span className="badge badge-yellow px-3 py-1 text-xs font-bold">{pending.length} Pending</span>
          <span className="badge badge-green px-3 py-1 text-xs font-bold">{submitted.length} Completed</span>
        </div>
      </div>

      {/* Pending Tasks */}
      {pending.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-500" />
            Pending Submissions ({pending.length})
          </h2>
          <div className="space-y-3.5">
            {pending.map(a => {
              const isOverdue = new Date(a.deadline) < new Date()
              const formattedDate = new Date(a.deadline).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })

              return (
                <div
                  key={a.id}
                  className={`card p-5 border-l-4 ${isOverdue ? 'border-l-rose-500' : 'border-l-amber-500'} bg-white dark:bg-gray-800 hover:shadow-md transition-all`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Badges & Title */}
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-base text-gray-900 dark:text-white leading-tight">
                          {a.title}
                        </h3>

                        {/* Class Badge */}
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                          <GraduationCap className="w-3 h-3" />
                          {a.class_name || 'BCA'} · Sem {a.semester || 1}
                        </span>

                        {/* Subject Badge */}
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                          <BookOpen className="w-3 h-3" />
                          {a.subject_name || 'Subject Task'}
                        </span>
                      </div>

                      {a.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                          {a.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1.5 font-medium">
                          {isOverdue ? (
                            <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
                          ) : (
                            <Clock className="h-3.5 w-3.5 text-amber-500" />
                          )}
                          <span className={isOverdue ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-gray-700 dark:text-gray-200'}>
                            {isOverdue ? 'Overdue Deadline: ' : 'Due: '} {formattedDate}
                          </span>
                        </div>
                        <span className="flex items-center gap-1 font-medium">
                          <Award className="h-3.5 w-3.5 text-amber-500" />
                          Max Marks: <strong>{a.max_marks}</strong>
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setSubmitModal(a)}
                      className="btn-primary text-xs px-4 py-2 flex items-center gap-2 flex-shrink-0 self-end sm:self-start active:scale-95 shadow-sm"
                    >
                      <Upload className="h-4 w-4" />
                      Submit Solution
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Submitted Tasks */}
      {submitted.length > 0 && (
        <div className="space-y-3 pt-2">
          <h2 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            Submitted & Graded ({submitted.length})
          </h2>
          <div className="space-y-3.5">
            {submitted.map(a => (
              <div key={a.id} className="card p-5 border-l-4 border-l-emerald-500 bg-white dark:bg-gray-800">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-base text-gray-900 dark:text-white leading-tight">
                        {a.title}
                      </h3>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                        <GraduationCap className="w-3 h-3" />
                        {a.class_name || 'BCA'} · Sem {a.semester || 1}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                        <BookOpen className="w-3 h-3" />
                        {a.subject_name || 'Subject Task'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                      Submitted on {new Date(a.submission?.submitted_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>

                    {a.submission?.feedback && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-xs text-blue-800 dark:text-blue-200 border border-blue-100 dark:border-blue-800/40">
                        <strong>Teacher Feedback: </strong>{a.submission.feedback}
                      </div>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0 space-y-1">
                    {a.submission?.marks_obtained != null ? (
                      <p className="font-black text-primary-600 dark:text-primary-400 text-lg">
                        {a.submission.marks_obtained} <span className="text-xs text-gray-400 font-normal">/ {a.max_marks}</span>
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400 font-medium">Awaiting Grade</p>
                    )}
                    <span className={`badge ${a.submission?.status === 'graded' ? 'badge-green' : 'badge-blue'}`}>
                      {a.submission?.status || 'submitted'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!assignments.length && (
        <div className="card text-center py-16 space-y-3 bg-white dark:bg-gray-800">
          <FileText className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No assignments posted for your class yet.</p>
        </div>
      )}

      {/* Submission Modal */}
      <Modal
        open={!!submitModal}
        onClose={() => { setSubmitModal(null); setTextContent('') }}
        title={`Submit: ${submitModal?.title}`}
        size="lg"
      >
        <div className="space-y-4 pt-1">
          <div className="p-3 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-100 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-300 space-y-1">
            <p>Subject: <strong className="text-gray-900 dark:text-white">{submitModal?.subject_name}</strong></p>
            <p>Target Class: <strong className="text-gray-900 dark:text-white">{submitModal?.class_name} · Semester {submitModal?.semester}</strong></p>
            <p>Due: <strong>{submitModal && new Date(submitModal.deadline).toLocaleString()}</strong></p>
          </div>

          <div>
            <label className="label">Your Submission Answer / Solutions *</label>
            <textarea
              className="input min-h-[160px] resize-none leading-relaxed font-mono text-xs"
              value={textContent}
              onChange={e => setTextContent(e.target.value)}
              placeholder="Paste your source code, answers, or assignment solution details here..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setSubmitModal(null)} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={submitting}
              className="btn-primary flex-1 shadow-md active:scale-95"
            >
              {submitting ? 'Submitting…' : 'Submit Assignment'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
