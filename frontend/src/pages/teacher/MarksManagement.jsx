import React, { useEffect, useState } from 'react'
import { examAPI, studentAPI } from '../../services/api'
import toast from 'react-hot-toast'
import Modal from '../../components/common/Modal'
import { Plus, BookOpen, Award, Calendar, ChevronRight } from 'lucide-react'

const EXAM_TYPES = ['midterm', 'final', 'quiz', 'practical', 'unit_test']

export default function MarksManagement() {
  const [exams, setExams] = useState([])
  const [students, setStudents] = useState([])
  const [examModal, setExamModal] = useState(false)
  const [marksModal, setMarksModal] = useState(null)
  const [examForm, setExamForm] = useState({ title: '', exam_date: '', exam_type: 'midterm', total_marks: 100, class_name: '' })
  const [marks, setMarks] = useState({})
  const [loading, setLoading] = useState(false)
  const [marksLoading, setMarksLoading] = useState(false)
  const [existingMarks, setExistingMarks] = useState([])

  const loadExams = () => examAPI.list().then(r => setExams(r.data.exams || [])).catch(() => {})
  const loadStudents = () => studentAPI.list({ limit: 100 }).then(r => setStudents(r.data.students || [])).catch(() => {})
  useEffect(() => { loadExams(); loadStudents() }, [])

  const createExam = async () => {
    if (!examForm.title || !examForm.exam_date) return toast.error('Fill required fields')
    setLoading(true)
    try {
      await examAPI.create({ ...examForm, total_marks: Number(examForm.total_marks) })
      toast.success('Exam created!')
      setExamModal(false)
      loadExams()
    } catch { toast.error('Failed to create exam') } finally { setLoading(false) }
  }

  const openMarksModal = async (exam) => {
    setMarksModal(exam)
    setMarksLoading(true)
    try {
      const r = await examAPI.getMarks(exam.id)
      const existing = {}
      const existingList = r.data?.marks || []
      existingList.forEach(m => { existing[m.student_id] = m.marks_obtained })
      setExistingMarks(existingList)
      setMarks(existing)
    } catch { setMarks({}) } finally { setMarksLoading(false) }
  }

  const saveMarks = async () => {
    setLoading(true)
    let count = 0
    try {
      for (const [student_id, val] of Object.entries(marks)) {
        if (val !== '' && val !== undefined) {
          await examAPI.addMarks({ student_id: Number(student_id), exam_id: marksModal.id, marks_obtained: Number(val) })
          count++
        }
      }
      toast.success(`Marks saved for ${count} student(s)!`)
      setMarksModal(null)
      loadExams()
    } catch { toast.error('Some marks failed to save') } finally { setLoading(false) }
  }

  const isPast = (date) => new Date(date) < new Date()

  return (
    <div className="space-y-5 animate-page">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="page-title">Marks Management</h1>
          <p className="page-subtitle">Create exams and enter student marks</p>
        </div>
        <button onClick={() => setExamModal(true)} className="btn-primary flex items-center gap-2 self-start">
          <Plus className="h-4 w-4" /> Create Exam
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Exams', value: exams.length, color: 'text-primary-600', bg: 'bg-primary-50 dark:bg-primary-900/20' },
          { label: 'Completed', value: exams.filter(e => isPast(e.exam_date)).length, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'Upcoming', value: exams.filter(e => !isPast(e.exam_date)).length, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`card text-center p-4 ${bg}`}>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Exam list */}
      <div className="space-y-3">
        {exams.map(e => {
          const past = isPast(e.exam_date)
          return (
            <div key={e.id} className={`card border-l-4 ${past ? 'border-l-emerald-400' : 'border-l-amber-400'} hover:shadow-md transition-shadow`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${past ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
                    <BookOpen className={`h-5 w-5 ${past ? 'text-emerald-600' : 'text-amber-600'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{e.title}</h3>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(e.exam_date).toLocaleDateString()}
                      </span>
                      <span className="capitalize">{e.exam_type}</span>
                      <span className="flex items-center gap-1">
                        <Award className="h-3.5 w-3.5" />
                        {e.total_marks} marks
                      </span>
                      {e.class_name && <span>Class: {e.class_name}</span>}
                    </div>
                  </div>
                </div>
                <button onClick={() => openMarksModal(e)} className="btn-primary text-sm flex items-center gap-1.5 flex-shrink-0">
                  Enter Marks <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <span className={`badge mt-2 ${past ? 'badge-green' : 'badge-yellow'}`}>{past ? 'Completed' : 'Upcoming'}</span>
            </div>
          )
        })}
        {!exams.length && (
          <div className="card text-center py-12">
            <BookOpen className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500">No exams created yet.</p>
          </div>
        )}
      </div>

      {/* Create Exam Modal */}
      <Modal open={examModal} onClose={() => setExamModal(false)} title="Create Exam">
        <div className="space-y-4">
          <div>
            <label className="label">Title *</label>
            <input className="input" value={examForm.title} onChange={e => setExamForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Mid-Term Examination" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Date &amp; Time *</label>
              <input type="datetime-local" className="input" value={examForm.exam_date} onChange={e => setExamForm(p => ({ ...p, exam_date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Exam Type</label>
              <select className="input" value={examForm.exam_type} onChange={e => setExamForm(p => ({ ...p, exam_type: e.target.value }))}>
                {EXAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Total Marks</label>
              <input type="number" className="input" value={examForm.total_marks} min={1} onChange={e => setExamForm(p => ({ ...p, total_marks: e.target.value }))} />
            </div>
            <div>
              <label className="label">Class</label>
              <input className="input" value={examForm.class_name} placeholder="e.g. CS-3A" onChange={e => setExamForm(p => ({ ...p, class_name: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setExamModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={createExam} disabled={loading} className="btn-primary flex-1">{loading ? 'Creating…' : 'Create Exam'}</button>
          </div>
        </div>
      </Modal>

      {/* Enter Marks Modal */}
      <Modal open={!!marksModal} onClose={() => setMarksModal(null)} title={`Marks — ${marksModal?.title}`} size="lg">
        {marksLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-600 border-t-transparent" />
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">Total marks: <strong>{marksModal?.total_marks}</strong></p>
            <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1">
              {students.map(s => (
                <div key={s.id} className="flex items-center gap-4 py-2.5 px-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xs font-bold text-primary-700 dark:text-primary-300 flex-shrink-0">
                    {s.full_name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{s.full_name}</p>
                    <p className="text-xs text-gray-400">{s.roll_number}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <input type="number" className="input w-20 text-center text-sm" placeholder="—" min={0} max={marksModal?.total_marks}
                      value={marks[s.id] ?? ''} onChange={e => setMarks(p => ({ ...p, [s.id]: e.target.value }))} />
                    <span className="text-xs text-gray-400 w-12">/{marksModal?.total_marks}</span>
                    {marks[s.id] !== undefined && marks[s.id] !== '' && (
                      <span className={`text-xs font-medium ${(marks[s.id] / marksModal.total_marks) * 100 >= 60 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {Math.round((marks[s.id] / marksModal.total_marks) * 100)}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <button onClick={() => setMarksModal(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={saveMarks} disabled={loading} className="btn-primary flex-1">{loading ? 'Saving…' : 'Save All Marks'}</button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
