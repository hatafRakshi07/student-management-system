import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import {
  BookOpen, Plus, Search, Filter, Trash2, FileText, Download,
  ExternalLink, UploadCloud, CheckCircle2, Clock, Layers, Sparkles, X, User
} from 'lucide-react'

export default function TeacherNotesManagement() {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('ALL')
  const [classFilter, setClassFilter] = useState('ALL')
  const [semesterFilter, setSemesterFilter] = useState('ALL')

  // Upload Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    subject: 'Computer Science',
    department: 'Computer Science & IT',
    class_name: 'BCA 1st Year',
    semester: 'Semester 1',
    description: '',
  })
  const [selectedFile, setSelectedFile] = useState(null)

  const subjectList = [
    'Computer Science',
    'Data Structures & Algorithms',
    'Web Development',
    'Database Management Systems',
    'Mathematics I',
    'Business Communication',
    'Physics',
    'Chemistry',
    'Accountancy',
    'Economics',
    'Environmental Studies',
  ]

  const classList = [
    'BCA 1st Year',
    'BCA 2nd Year',
    'BCA 3rd Year',
    'B.Sc. 1st Year',
    'B.Sc. 2nd Year',
    'B.Sc. 3rd Year',
    'B.Com 1st Year',
    'B.Com 2nd Year',
    'B.Com 3rd Year',
    'B.A. 1st Year',
  ]

  const semesterList = [
    'Semester 1',
    'Semester 2',
    'Semester 3',
    'Semester 4',
    'Semester 5',
    'Semester 6',
  ]

  const fetchNotes = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (subjectFilter !== 'ALL') params.append('subject', subjectFilter)
      if (classFilter !== 'ALL') params.append('class_name', classFilter)
      if (semesterFilter !== 'ALL') params.append('semester', semesterFilter)

      const res = await api.get(`/notes?${params.toString()}`)
      setNotes(res.data.notes || [])
    } catch (err) {
      toast.error('Failed to load study notes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotes()
  }, [searchTerm, subjectFilter, classFilter, semesterFilter])

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleUploadSubmit = async (e) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      toast.error('Please enter note title')
      return
    }
    if (!selectedFile) {
      toast.error('Please select a file (PDF, Doc, Image) to upload')
      return
    }

    setUploading(true)
    try {
      const data = new FormData()
      data.append('title', formData.title.trim())
      data.append('subject', formData.subject)
      data.append('department', formData.department)
      data.append('class_name', formData.class_name)
      data.append('semester', formData.semester)
      data.append('description', formData.description || '')
      data.append('file', selectedFile)

      await api.post('/notes/upload', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      toast.success('Notes uploaded successfully!')
      setIsModalOpen(false)
      setSelectedFile(null)
      setFormData({
        title: '',
        subject: 'Computer Science',
        department: 'Computer Science & IT',
        class_name: 'BCA 1st Year',
        semester: 'Semester 1',
        description: '',
      })
      fetchNotes()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to upload notes')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return
    try {
      await api.delete(`/notes/${id}`)
      toast.success('Notes removed')
      setNotes(prev => prev.filter(n => n.id !== id))
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete note')
    }
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 rounded-2xl p-6 text-white shadow-xl shadow-blue-950/20">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-blue-200 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Faculty Academic Portal
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Study Notes & Materials Management
          </h1>
          <p className="text-blue-100/80 text-sm max-w-2xl">
            Upload lecture notes, reference PDFs, handouts, and study material directly to cloud storage for your students.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-sm shadow-lg hover:shadow-amber-400/25 transition-all transform active:scale-95 shrink-0"
        >
          <Plus className="w-5 h-5" />
          Upload New Notes
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Uploaded</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{notes.length} Files</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cloud Storage</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Active & Synced</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Subjects Covered</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              {new Set(notes.map(n => n.subject)).size || 0} Subjects
            </h3>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search notes title, subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Subjects</option>
            {subjectList.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Classes</option>
            {classList.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select
            value={semesterFilter}
            onChange={(e) => setSemesterFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Semesters</option>
            {semesterList.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Notes List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 text-sm mt-3 font-medium">Loading study notes...</p>
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center mx-auto text-blue-500 mb-4">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">No Notes Found</h3>
          <p className="text-slate-500 text-sm max-w-sm mx-auto mt-1 mb-6">
            You haven't uploaded any study material for this selection yet. Click below to add the first lecture note!
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            Upload Notes Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {notes.map((note) => (
            <div
              key={note.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 text-xs font-semibold">
                    {note.subject}
                  </span>
                  <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(note.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-blue-600 transition-colors line-clamp-1">
                    {note.title}
                  </h4>
                  {note.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {note.description}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-slate-600 dark:text-slate-300">
                  {note.class_name && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-medium">
                      {note.class_name}
                    </span>
                  )}
                  {note.semester && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-medium">
                      {note.semester}
                    </span>
                  )}
                  {note.file_size_bytes && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
                      {formatFileSize(note.file_size_bytes)}
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate max-w-[120px]">{note.teacher_name}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <a
                    href={note.file_url}
                    target="_blank"
                    rel="noreferrer"
                    download
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 text-xs font-semibold transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </a>
                  <button
                    onClick={() => handleDelete(note.id, note.title)}
                    className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 transition-colors"
                    title="Delete Note"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <UploadCloud className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Upload Study Notes</h3>
              </div>
              <button
                onClick={() => !uploading && setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Note Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Unit 3 - Data Structures & Trees Full Notes"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Subject *
                  </label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {subjectList.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Class / Course *
                  </label>
                  <select
                    value={formData.class_name}
                    onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {classList.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Semester
                  </label>
                  <select
                    value={formData.semester}
                    onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {semesterList.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description / Topic Summary (Optional)
                </label>
                <textarea
                  rows="2"
                  placeholder="Key concepts covered in this document..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Attach File (PDF, DOCX, PPTX, JPG, PNG) *
                </label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.doc,.pptx,.ppt,.jpg,.jpeg,.png,.zip"
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-950 dark:file:text-blue-300 cursor-pointer"
                  required
                />
                {selectedFile && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                    ✓ Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md hover:shadow-blue-600/25 transition-all disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Uploading to Cloud...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      Save & Publish Notes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
