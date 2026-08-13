import React, { useEffect, useState } from 'react'
import { assignmentAPI, studentAPI } from '../../services/api'
import toast from 'react-hot-toast'
import Modal from '../../components/common/Modal'
import { Plus, Eye, Trash2, ClipboardList, Clock, Award, BookOpen, GraduationCap, Users, Filter, CheckCircle2 } from 'lucide-react'

const COURSES = ['BCA', 'B.Com', 'B.Sc', 'BBA', 'B.Tech', 'MCA', 'MBA']

const COURSE_SUBJECTS = {
  'BCA': {
    1: ['C Programming', 'PC Software & Office Automation', 'Information Technology Foundations'],
    2: ['Discrete Mathematics', 'DBMS & SQL', 'Data Communication & Computer Networks'],
    3: ['Digital Electronics', 'Data Structures & Algorithms (DSA)', 'Python Programming'],
    4: ['Operating Systems (OS)', 'Java & OOPs', 'Software Engineering Principles'],
    5: ['Computer Graphics & Animation', 'Web Technologies (HTML/JS/PHP)', 'Computer Architecture (COA)'],
    6: ['Artificial Intelligence (AI)', 'Internet of Things (IoT)', 'Major Capstone Project'],
  },
  'B.Com': {
    1: ['Financial Accounting', 'Business Organisation', 'Business Economics'],
    2: ['Corporate Accounting', 'Business Law', 'Business Statistics'],
    3: ['Cost Accounting', 'Income Tax Law & Practice', 'Company Law'],
    4: ['Management Accounting', 'Auditing & Governance', 'Business Finance'],
    5: ['GST & Indirect Taxes', 'E-Commerce Applications', 'Human Resource Management'],
    6: ['Financial Management', 'Entrepreneurship & Startup Management', 'Project Work'],
  },
  'B.Sc': {
    1: ['Physics - Mechanics & Waves', 'Chemistry - Inorganic & Organic', 'Mathematics - Calculus & Geometry'],
    2: ['Physics - Optics & Thermal', 'Chemistry - Physical Chemistry', 'Mathematics - Differential Equations'],
    3: ['Physics - Electromagnetism', 'Chemistry - Analytical Techniques', 'Mathematics - Real Analysis'],
    4: ['Physics - Modern Physics', 'Chemistry - Organic Synthesis', 'Mathematics - Numerical Methods'],
    5: ['Physics - Solid State Electronics', 'Chemistry - Polymer Chemistry', 'Mathematics - Linear Algebra'],
    6: ['Applied Physics Lab & Project', 'Industrial Chemistry Project', 'Applied Mathematics Seminar'],
  },
  'BBA': {
    1: ['Principles of Management', 'Financial Accounting Essentials', 'Business Communication & Soft Skills'],
    2: ['Marketing Management Principles', 'Business Regulatory Framework', 'Business Statistics & Analytics'],
    3: ['Human Resource Management', 'Business Environment & Policy', 'Management Information Systems (MIS)'],
    4: ['Financial Management Fundamentals', 'Operations & Supply Chain', 'Entrepreneurship & Innovation'],
    5: ['Strategic Business Management', 'Consumer Behaviour & CRM', 'Investment & Portfolio Management'],
    6: ['International Business & Trade', 'Business Ethics & Governance', 'Comprehensive Project'],
  },
  'B.Tech': {
    1: ['Engineering Physics', 'Engineering Mathematics-I', 'Basic Electrical & Electronics'],
    2: ['Engineering Chemistry', 'Engineering Mathematics-II', 'Programming for Problem Solving'],
    3: ['Discrete Structures', 'Data Structures & Algorithms', 'Digital Logic Design'],
    4: ['Operating Systems', 'Database Management Systems', 'Theory of Computation'],
    5: ['Computer Networks & Security', 'Compiler Design', 'Design & Analysis of Algorithms'],
    6: ['Software Engineering & Agile', 'Cloud & Distributed Systems', 'Web Engineering & Fullstack'],
  },
  'MCA': {
    1: ['Advanced Java & Enterprise Frameworks', 'Advanced Database Systems & NoSQL', 'Mathematical Foundations of CS'],
    2: ['Python for Data Science & AI', 'Modern Web Architectures & APIs', 'Software Engineering & Architecture'],
    3: ['Cloud Computing & Microservices', 'Machine Learning & Deep Learning', 'DevOps & Containerization'],
    4: ['Big Data & Distributed Analytics', 'Research Thesis & Major Industry Project'],
  },
  'MBA': {
    1: ['Management Concepts & Organizational Behaviour', 'Managerial Economics', 'Accounting for Business Decisions'],
    2: ['Corporate Finance & Valuation', 'Operations & Project Management', 'Business Research Methods'],
    3: ['Specialization Elective - Marketing/Finance', 'Specialization Elective - HR/IT', 'Summer Internship Review'],
    4: ['Strategic Management & Leadership', 'Corporate Governance & Business Ethics', 'Master Project Viva'],
  },
}

export default function AssignmentManagement() {
  const [assignments, setAssignments] = useState([])
  const [students, setStudents] = useState([])
  const [modal, setModal] = useState(false)
  const [viewSubs, setViewSubs] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(false)
  const [gradeModal, setGradeModal] = useState(null)
  const [gradeForm, setGradeForm] = useState({ marks: '', feedback: '' })

  // Filter state
  const [filterClass, setFilterClass] = useState('ALL')
  const [filterSem, setFilterSem] = useState('ALL')

  const [form, setForm] = useState({
    title: '',
    description: '',
    class_name: 'BCA',
    semester: 1,
    section: 'A',
    subject_name: 'C Programming',
    deadline: '',
    max_marks: 100,
  })

  const load = () => {
    assignmentAPI.list()
      .then(r => setAssignments(r.data.assignments || []))
      .catch(() => {})
    studentAPI.list({ limit: 300 })
      .then(r => setStudents(r.data.students || []))
      .catch(() => {})
  }

  useEffect(() => { load() }, [])

  // Auto-update subjects dropdown when class or semester changes in create form
  useEffect(() => {
    const subs = COURSE_SUBJECTS[form.class_name]?.[Number(form.semester)] || ['General Subject']
    if (!subs.includes(form.subject_name)) {
      setForm(p => ({ ...p, subject_name: subs[0] || 'General Subject' }))
    }
  }, [form.class_name, form.semester])

  const create = async () => {
    if (!form.title || !form.deadline || !form.class_name || !form.subject_name) {
      return toast.error('Please fill in Title, Class, Subject, and Deadline')
    }
    setLoading(true)
    try {
      await assignmentAPI.create({
        ...form,
        semester: Number(form.semester),
        max_marks: Number(form.max_marks),
      })
      toast.success(`Assignment assigned to ${form.class_name} Sem ${form.semester}!`)
      setModal(false)
      setForm({
        title: '',
        description: '',
        class_name: 'BCA',
        semester: 1,
        section: 'A',
        subject_name: 'C Programming',
        deadline: '',
        max_marks: 100,
      })
      load()
    } catch {
      toast.error('Failed to create assignment')
    } finally {
      setLoading(false)
    }
  }

  const del = async (id) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return
    try {
      await assignmentAPI.delete(id)
      toast.success('Assignment deleted')
      load()
    } catch {
      toast.error('Delete failed')
    }
  }

  const viewSubmissions = async (a) => {
    try {
      const r = await assignmentAPI.getSubmissions(a.id)
      setSubmissions(r.data.submissions || [])
      setViewSubs(a)
    } catch {
      toast.error('Failed to load submissions')
    }
  }

  const gradeSubmission = async () => {
    if (gradeForm.marks === '' || isNaN(gradeForm.marks)) return toast.error('Please enter valid marks')
    const marksNum = Number(gradeForm.marks)
    if (marksNum < 0 || marksNum > (viewSubs?.max_marks || 100)) {
      return toast.error(`Marks must be between 0 and ${viewSubs?.max_marks}`)
    }
    try {
      await assignmentAPI.gradeSubmission(gradeModal.id, {
        marks_obtained: marksNum,
        feedback: gradeForm.feedback,
      })
      toast.success('Submission graded successfully!')
      setGradeModal(null)
      if (viewSubs) {
        const r = await assignmentAPI.getSubmissions(viewSubs.id)
        setSubmissions(r.data.submissions || [])
      }
    } catch {
      toast.error('Failed to save grade')
    }
  }

  const isOverdue = (deadline) => new Date(deadline) < new Date()

  // Filtered assignments
  const filteredAssignments = assignments.filter(a => {
    const matchClass = filterClass === 'ALL' || a.class_name === filterClass
    const matchSem = filterSem === 'ALL' || String(a.semester) === String(filterSem)
    return matchClass && matchSem
  })

  // Lookup student details
  const getStudentInfo = (studentId) => {
    const s = students.find(st => st.id === studentId || st.user_id === studentId)
    if (s) {
      return {
        name: s.full_name || s.name || `Student #${studentId}`,
        roll: s.scholar_no || s.roll_number || `#${studentId}`,
        course: s.course || s.department || '',
      }
    }
    return { name: `Student #${studentId}`, roll: `#${studentId}`, course: '' }
  }

  return (
    <div className="space-y-6 animate-page pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2.5">
            <ClipboardList className="w-7 h-7 text-primary-600 dark:text-primary-400" />
            Class Assignments
          </h1>
          <p className="page-subtitle">Publish, track, and grade homework and assignments for your classes</p>
        </div>
        <button
          onClick={() => setModal(true)}
          className="btn-primary flex items-center gap-2 shadow-md hover:shadow-lg active:scale-95 transition-all self-start"
        >
          <Plus className="h-4 w-4" /> Create Assignment
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Total Published', value: assignments.length, color: 'text-primary-600 dark:text-primary-400', bg: 'bg-primary-50 dark:bg-primary-900/30' },
          { label: 'Active / Open', value: assignments.filter(a => !isOverdue(a.deadline)).length, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
          { label: 'Deadline Passed', value: assignments.filter(a => isOverdue(a.deadline)).length, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/30' },
          { label: 'Target Classes', value: new Set(assignments.map(a => `${a.class_name}-${a.semester}`)).size, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/30' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`card p-4 text-center ${bg} border border-transparent dark:border-gray-800`}>
            <p className={`text-2xl font-black ${color}`}>{value}</p>
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="card p-4 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
          <Filter className="w-4 h-4 text-primary-600" />
          <span>Filter Assignments:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-gray-500 font-medium">Course:</span>
            <select
              value={filterClass}
              onChange={e => setFilterClass(e.target.value)}
              className="select py-1 px-2.5 text-xs font-medium rounded-lg border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
            >
              <option value="ALL">All Courses</option>
              {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-gray-500 font-medium">Semester:</span>
            <select
              value={filterSem}
              onChange={e => setFilterSem(e.target.value)}
              className="select py-1 px-2.5 text-xs font-medium rounded-lg border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
            >
              <option value="ALL">All Semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Semester {s}</option>)}
            </select>
          </div>

          {(filterClass !== 'ALL' || filterSem !== 'ALL') && (
            <button
              onClick={() => { setFilterClass('ALL'); setFilterSem('ALL') }}
              className="text-xs text-primary-600 dark:text-primary-400 font-semibold hover:underline"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Assignments List */}
      <div className="space-y-3.5">
        {filteredAssignments.map(a => {
          const overdue = isOverdue(a.deadline)
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
              className={`card p-5 border-l-4 ${overdue ? 'border-l-rose-500' : 'border-l-primary-600'} hover:shadow-md transition-all duration-150 bg-white dark:bg-gray-800`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                      overdue
                        ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
                        : 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                    }`}
                  >
                    <ClipboardList className="h-5 w-5" />
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    {/* Header line with Title and Class Tags */}
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-base text-gray-900 dark:text-white leading-tight">
                        {a.title}
                      </h3>

                      {/* Class Badge */}
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                        <GraduationCap className="w-3 h-3" />
                        {a.class_name || 'BCA'} · Sem {a.semester || 1} {a.section && a.section !== 'All Sections' ? `(Sec ${a.section})` : ''}
                      </span>

                      {/* Subject Badge */}
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                        <BookOpen className="w-3 h-3" />
                        {a.subject_name || 'General Subject'}
                      </span>
                    </div>

                    {/* Description */}
                    {a.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                        {a.description}
                      </p>
                    )}

                    {/* Metadata tags */}
                    <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Clock className={`h-3.5 w-3.5 ${overdue ? 'text-rose-500' : 'text-primary-500'}`} />
                        Due: <strong className={overdue ? 'text-rose-600 dark:text-rose-400' : 'text-gray-700 dark:text-gray-200'}>{formattedDate}</strong>
                      </span>
                      <span className="flex items-center gap-1 font-medium">
                        <Award className="h-3.5 w-3.5 text-amber-500" />
                        Max Marks: <strong>{a.max_marks}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-start flex-shrink-0">
                  <button
                    onClick={() => viewSubmissions(a)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 dark:text-primary-300 dark:bg-primary-900/30 dark:hover:bg-primary-900/50 rounded-xl transition-all"
                    title="View and grade submissions"
                  >
                    <Eye className="h-4 w-4" />
                    Submissions
                  </button>
                  <button
                    onClick={() => del(a.id)}
                    className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                    title="Delete Assignment"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}

        {!filteredAssignments.length && (
          <div className="card text-center py-14 space-y-3 bg-white dark:bg-gray-800">
            <ClipboardList className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">No assignments found for the selected filter.</p>
            <button
              onClick={() => setModal(true)}
              className="btn-secondary text-xs inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Create New Assignment
            </button>
          </div>
        )}
      </div>

      {/* Create Assignment Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Create New Assignment" size="lg">
        <div className="space-y-4 pt-1">
          <div>
            <label className="label">Assignment Title *</label>
            <input
              className="input font-medium"
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Unit 3 - Trees & Graph Traversals Problem Set"
            />
          </div>

          {/* Class & Subject Target Section */}
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-primary-600" />
              Target Class & Subject Audience
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="label">Course / Class *</label>
                <select
                  className="select"
                  value={form.class_name}
                  onChange={e => setForm(p => ({ ...p, class_name: e.target.value }))}
                >
                  {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="label">Semester *</label>
                <select
                  className="select"
                  value={form.semester}
                  onChange={e => setForm(p => ({ ...p, semester: Number(e.target.value) }))}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                </select>
              </div>

              <div>
                <label className="label">Section</label>
                <select
                  className="select"
                  value={form.section}
                  onChange={e => setForm(p => ({ ...p, section: e.target.value }))}
                >
                  <option value="All Sections">All Sections</option>
                  <option value="A">Section A</option>
                  <option value="B">Section B</option>
                  <option value="C">Section C</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">Subject Name *</label>
              <select
                className="select"
                value={form.subject_name}
                onChange={e => setForm(p => ({ ...p, subject_name: e.target.value }))}
              >
                {(COURSE_SUBJECTS[form.class_name]?.[Number(form.semester)] || ['General Subject']).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Instructions & Requirements</label>
            <textarea
              className="input h-24 resize-none leading-relaxed"
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Provide detailed submission instructions, reference chapters, or questions to solve…"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Submission Deadline *</label>
              <input
                type="datetime-local"
                className="input"
                value={form.deadline}
                onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))}
              />
            </div>

            <div>
              <label className="label">Maximum Marks</label>
              <input
                type="number"
                className="input"
                value={form.max_marks}
                min={1}
                max={500}
                onChange={e => setForm(p => ({ ...p, max_marks: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setModal(false)} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              onClick={create}
              disabled={loading}
              className="btn-primary flex-1 shadow-md active:scale-95"
            >
              {loading ? 'Publishing…' : 'Publish Assignment'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Submissions Modal */}
      <Modal
        open={!!viewSubs}
        onClose={() => setViewSubs(null)}
        title={`Submissions: ${viewSubs?.title} (${viewSubs?.class_name} Sem ${viewSubs?.semester})`}
        size="lg"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 dark:bg-gray-900/40 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800">
            <span>Subject: <strong className="text-gray-900 dark:text-white">{viewSubs?.subject_name}</strong></span>
            <span>Max Marks: <strong className="text-gray-900 dark:text-white">{viewSubs?.max_marks}</strong></span>
            <span>Total Submissions: <strong className="text-primary-600">{submissions.length}</strong></span>
          </div>

          <div className="table-container max-h-96 overflow-y-auto">
            <table className="table">
              <thead>
                <tr>
                  {['Student Details', 'Submitted At', 'Status', 'Marks', 'Feedback', 'Action'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {submissions.map(s => {
                  const sInfo = getStudentInfo(s.student_id)
                  return (
                    <tr key={s.id}>
                      <td>
                        <p className="font-bold text-gray-900 dark:text-white leading-tight">{sInfo.name}</p>
                        <p className="text-xs text-gray-500 font-mono">{sInfo.roll}</p>
                      </td>
                      <td className="text-gray-500 text-xs font-medium">
                        {new Date(s.submitted_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            s.status === 'graded'
                              ? 'badge-green'
                              : s.status === 'late'
                              ? 'badge-red'
                              : 'badge-blue'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="font-bold text-gray-900 dark:text-white">
                        {s.marks_obtained !== null && s.marks_obtained !== undefined ? `${s.marks_obtained} / ${viewSubs?.max_marks}` : '—'}
                      </td>
                      <td className="text-xs text-gray-500 max-w-xs truncate">
                        {s.feedback || '—'}
                      </td>
                      <td>
                        <button
                          onClick={() => {
                            setGradeModal(s)
                            setGradeForm({
                              marks: s.marks_obtained !== null && s.marks_obtained !== undefined ? String(s.marks_obtained) : '',
                              feedback: s.feedback || '',
                            })
                          }}
                          className="text-xs btn-primary py-1 px-3 flex items-center gap-1 active:scale-95"
                        >
                          <Award className="h-3.5 w-3.5" />
                          {s.status === 'graded' ? 'Edit Grade' : 'Grade'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {!submissions.length && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500 dark:text-gray-400">
                      No submissions received yet for this assignment.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      {/* Grade Modal */}
      <Modal open={!!gradeModal} onClose={() => setGradeModal(null)} title="Grade Student Submission">
        <div className="space-y-4 pt-1">
          <div>
            <label className="label">Marks Obtained (Out of {viewSubs?.max_marks}) *</label>
            <input
              type="number"
              className="input font-bold text-lg"
              placeholder={`0 - ${viewSubs?.max_marks}`}
              value={gradeForm.marks}
              onChange={e => setGradeForm(p => ({ ...p, marks: e.target.value }))}
              min={0}
              max={viewSubs?.max_marks}
            />
          </div>
          <div>
            <label className="label">Teacher Feedback & Remarks</label>
            <textarea
              className="input h-24 resize-none leading-relaxed"
              value={gradeForm.feedback}
              onChange={e => setGradeForm(p => ({ ...p, feedback: e.target.value }))}
              placeholder="e.g. Good grasp of concepts, well commented code..."
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setGradeModal(null)} className="btn-secondary flex-1">
              Cancel
            </button>
            <button onClick={gradeSubmission} className="btn-primary flex-1 shadow-md active:scale-95">
              Submit Grade
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
