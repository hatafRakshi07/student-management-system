import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import {
  BookOpen, Search, Filter, Download, ExternalLink,
  FileText, Clock, User, Layers, Sparkles, FolderOpen
} from 'lucide-react'

export default function StudentNotes() {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('ALL')
  const [semesterFilter, setSemesterFilter] = useState('ALL')

  const fetchNotes = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (subjectFilter !== 'ALL') params.append('subject', subjectFilter)
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
  }, [searchTerm, subjectFilter, semesterFilter])

  const subjects = ['ALL', ...Array.from(new Set(notes.map(n => n.subject).filter(Boolean)))]
  const semesters = ['ALL', 'Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Semester 5', 'Semester 6']

  const formatFileSize = (bytes) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getFileIconColor = (ext) => {
    const e = (ext || '').toLowerCase()
    if (e.includes('pdf')) return 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
    if (e.includes('doc')) return 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400'
    if (e.includes('ppt')) return 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400'
    return 'bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400'
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-950 rounded-2xl p-6 text-white shadow-xl shadow-indigo-950/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-purple-200 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Digital Study Hub
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Class Notes & Study Materials
          </h1>
          <p className="text-purple-100/80 text-sm max-w-2xl">
            Access, read and download official lecture notes, question banks, and syllabus handouts uploaded directly by your professors.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl shrink-0">
          <BookOpen className="w-6 h-6 text-amber-300" />
          <div>
            <p className="text-xs text-purple-200 uppercase font-semibold">Available Notes</p>
            <p className="text-lg font-bold text-white">{notes.length} Documents</p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search topic, subject or teacher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Filter className="w-3.5 h-3.5" />
            Filter by:
          </div>
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {subjects.map(s => (
              <option key={s} value={s}>{s === 'ALL' ? 'All Subjects' : s}</option>
            ))}
          </select>

          <select
            value={semesterFilter}
            onChange={(e) => setSemesterFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {semesters.map(s => (
              <option key={s} value={s}>{s === 'ALL' ? 'All Semesters' : s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Notes Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 text-sm mt-3 font-medium">Fetching lecture materials...</p>
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center mx-auto text-indigo-500 mb-4">
            <FolderOpen className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">No Notes Available</h3>
          <p className="text-slate-500 text-sm max-w-sm mx-auto mt-1">
            No notes have been uploaded for the selected filter criteria yet. Check back soon or request your subject teacher!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {notes.map((note) => (
            <div
              key={note.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-900/50 transition-all flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs uppercase ${getFileIconColor(note.file_type)}`}>
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold">
                        {note.subject}
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(note.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-indigo-600 transition-colors line-clamp-1">
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
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 truncate">
                  <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{note.teacher_name}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={note.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
