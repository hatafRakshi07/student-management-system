import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { attendanceAPI, teacherAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import {
  Calendar, CheckCircle, XCircle, Clock, Save, Filter, Users, AlertCircle,
  ShieldCheck, Lock, Check, Send, Sparkles, RefreshCw
} from 'lucide-react'

export default function AttendanceManagement() {
  const { user } = useAuth()

  const [teacherInfo, setTeacherInfo] = useState({
    name: user?.full_name || 'Faculty Member',
    department: 'Computer Science',
    courses: ['BCA'],
    years: ['1st Year', '2nd Year', '3rd Year']
  })

  const [selectedCourse, setSelectedCourse] = useState('BCA')
  const [selectedYear, setSelectedYear] = useState('2nd Year')
  const [selectedSection, setSelectedSection] = useState('All')
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0])

  const [students, setStudents] = useState([])
  const [studentStatusMap, setStudentStatusMap] = useState({})
  const [remarksMap, setRemarksMap] = useState({})

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [alreadyMarked, setAlreadyMarked] = useState(false)

  // 1. Fetch Teacher Authorization & Department Assignments
  const loadTeacherAssignments = async () => {
    try {
      const res = await teacherAPI.myAssignments()
      const data = res.data || {}
      setTeacherInfo({
        name: data.teacher_name || user?.full_name || 'Faculty Member',
        department: data.department || 'Computer Science',
        courses: data.courses?.length ? data.courses : ['BCA'],
        years: data.years?.length ? data.years : ['1st Year', '2nd Year', '3rd Year']
      })

      if (data.courses?.length) {
        setSelectedCourse(data.courses[0])
      }
    } catch {
      // Fallback defaults for teacher
    }
  }

  useEffect(() => {
    loadTeacherAssignments()
  }, [])

  // 2. Load Students for Authorized Department, Course & Year
  const loadClassStudents = async () => {
    setLoading(true)
    try {
      const res = await attendanceAPI.getClassStudents({
        course: selectedCourse,
        year: selectedYear,
        section: selectedSection,
        session_date: attendanceDate
      })

      const stList = res.data.students || []
      setStudents(stList)
      setAlreadyMarked(res.data.already_marked || false)

      const statusMap = {}
      stList.forEach(s => {
        statusMap[s.id] = s.status || 'PRESENT'
      })
      setStudentStatusMap(statusMap)

      if (res.data.department) {
        setTeacherInfo(prev => ({ ...prev, department: res.data.department }))
      }
    } catch (err) {
      if (err.response?.status === 403) {
        toast.error(err.response?.data?.detail || 'Access Denied: You are not authorized for this department.')
      } else {
        toast.error('Failed to load class students')
      }
      setStudents([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClassStudents()
  }, [selectedCourse, selectedYear, selectedSection, attendanceDate])

  const markAll = (status) => {
    const updated = { ...studentStatusMap }
    students.forEach(s => {
      updated[s.id] = status
    })
    setStudentStatusMap(updated)
    toast.success(`Marked all ${students.length} students as ${status}`)
  }

  const handleStatusToggle = (studentId, status) => {
    setStudentStatusMap(prev => ({ ...prev, [studentId]: status }))
  }

  const handleSaveAttendance = async () => {
    if (!students.length) return toast.error('No students loaded to mark attendance')

    setSubmitting(true)
    try {
      const recordsPayload = students.map(s => ({
        student_id: s.id,
        status: studentStatusMap[s.id] || 'PRESENT',
        remarks: remarksMap[s.id] || ''
      }))

      const payload = {
        class_name: selectedCourse,
        department: teacherInfo.department,
        section: selectedSection,
        date: attendanceDate,
        records: recordsPayload
      }

      const res = await attendanceAPI.submitSession(payload)
      toast.success(res.data.message || 'Attendance saved successfully!')
      setAlreadyMarked(true)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save attendance')
    } finally {
      setSubmitting(false)
    }
  }

  const presentCount = Object.values(studentStatusMap).filter(v => v === 'PRESENT' || v === 'LATE').length
  const absentCount = Object.values(studentStatusMap).filter(v => v === 'ABSENT').length
  const leaveCount = Object.values(studentStatusMap).filter(v => v === 'LEAVE').length

  return (
    <div className="space-y-6 animate-page max-w-6xl mx-auto">
      {/* Title & Info Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2 text-2xl font-black text-gray-900 dark:text-white">
            <Calendar className="w-7 h-7 text-primary-600" /> MARK ATTENDANCE
          </h1>
          <p className="page-subtitle text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Department-restricted attendance entry. Only authorized students are displayed.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => markAll('PRESENT')}
            className="btn-secondary text-xs flex items-center gap-1.5 font-bold"
          >
            <CheckCircle className="w-4 h-4 text-emerald-600" /> Mark All Present
          </button>
          <button
            onClick={() => markAll('ABSENT')}
            className="btn-secondary text-xs flex items-center gap-1.5 font-bold"
          >
            <XCircle className="w-4 h-4 text-red-600" /> Mark All Absent
          </button>
          <button
            onClick={loadClassStudents}
            className="btn-secondary text-xs flex items-center gap-1.5"
            title="Reload Students"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── ATTENDANCE SELECTION CONTROL PANEL ──────────────────────────────── */}
      <div className="card p-5 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Read-Only Teacher */}
          <div>
            <label className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block mb-1">
              Teacher
            </label>
            <div className="p-2.5 rounded-xl bg-white/10 border border-white/15 text-xs font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="truncate">{teacherInfo.name}</span>
            </div>
          </div>

          {/* Read-Only Department */}
          <div>
            <label className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block mb-1">
              Department (Read-Only)
            </label>
            <div className="p-2.5 rounded-xl bg-white/10 border border-white/15 text-xs font-bold text-emerald-300 flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span className="truncate">{teacherInfo.department}</span>
            </div>
          </div>

          {/* Authorized Course Dropdown */}
          <div>
            <label className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block mb-1">
              Course *
            </label>
            <select
              value={selectedCourse}
              onChange={e => setSelectedCourse(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-white/10 border border-white/20 text-xs font-bold text-white focus:bg-slate-900 focus:text-white"
            >
              {teacherInfo.courses.map(c => (
                <option key={c} value={c} className="bg-slate-900 text-white">{c}</option>
              ))}
            </select>
          </div>

          {/* Year Dropdown */}
          <div>
            <label className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block mb-1">
              Year *
            </label>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-white/10 border border-white/20 text-xs font-bold text-white focus:bg-slate-900 focus:text-white"
            >
              {['1st Year', '2nd Year', '3rd Year'].map(y => (
                <option key={y} value={y} className="bg-slate-900 text-white">{y}</option>
              ))}
            </select>
          </div>

          {/* Date Picker */}
          <div>
            <label className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block mb-1">
              Date *
            </label>
            <input
              type="date"
              value={attendanceDate}
              onChange={e => setAttendanceDate(e.target.value)}
              className="w-full p-2 rounded-xl bg-white/10 border border-white/20 text-xs font-bold text-white focus:bg-slate-900"
            />
          </div>
        </div>
      </div>

      {/* Already Marked Alert Banner */}
      {alreadyMarked && (
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="font-semibold">
              Attendance already marked for <strong>{selectedCourse} - {selectedYear}</strong> on {attendanceDate}. Saving will update the existing session record.
            </p>
          </div>
          <span className="px-2 py-0.5 rounded text-[11px] font-black bg-amber-200 text-amber-900">RECORDED</span>
        </div>
      )}

      {/* Realtime Attendance Count Banner */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="card p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40">
          <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{presentCount}</p>
          <p className="text-[11px] font-bold uppercase text-emerald-600 dark:text-emerald-400">PRESENT</p>
        </div>
        <div className="card p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40">
          <p className="text-2xl font-black text-red-700 dark:text-red-300">{absentCount}</p>
          <p className="text-[11px] font-bold uppercase text-red-600 dark:text-red-400">ABSENT</p>
        </div>
        <div className="card p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40">
          <p className="text-2xl font-black text-blue-700 dark:text-blue-300">{leaveCount}</p>
          <p className="text-[11px] font-bold uppercase text-blue-600 dark:text-blue-400">ON LEAVE</p>
        </div>
      </div>

      {/* Student Register Table Card */}
      <div className="card p-0 overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary-600" />
            <span className="font-bold text-xs uppercase text-gray-800 dark:text-gray-200">
              Students Enrolled: <span className="text-primary-600 font-extrabold">{students.length}</span>
            </span>
            <span className="text-xs text-gray-400">
              ({teacherInfo.department} • {selectedCourse} • {selectedYear})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => markAll('PRESENT')}
              className="text-xs text-emerald-600 hover:underline font-bold"
            >
              All Present
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={() => markAll('ABSENT')}
              className="text-xs text-red-600 hover:underline font-bold"
            >
              All Absent
            </button>
          </div>
        </div>

        <div className="table-container max-h-[550px] overflow-y-auto">
          <table className="table w-full text-left border-collapse">
            <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800 z-10 text-xs text-gray-600 dark:text-gray-300 font-bold">
              <tr>
                <th className="p-3 w-12 text-center">#</th>
                <th className="p-3">Student Name</th>
                <th className="p-3">Enrollment / Reg No</th>
                <th className="p-3">Roll Number</th>
                <th className="p-3 text-center">Mark Attendance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
              {students.map((s, idx) => {
                const curSt = studentStatusMap[s.id] || 'PRESENT'
                return (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="p-3 text-center font-bold text-gray-400">{idx + 1}</td>
                    <td className="p-3 font-bold text-gray-900 dark:text-white">
                      {s.full_name || s.student_name}
                    </td>
                    <td className="p-3 font-mono text-gray-600 dark:text-gray-400">
                      {s.enrollment_no || '—'}
                    </td>
                    <td className="p-3 font-mono font-semibold text-gray-500">
                      {s.roll_number || '—'}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleStatusToggle(s.id, 'PRESENT')}
                          className={`px-4 py-1.5 rounded-xl font-bold text-xs transition-colors flex items-center gap-1 ${
                            curSt === 'PRESENT'
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-emerald-100'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" /> Present
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStatusToggle(s.id, 'ABSENT')}
                          className={`px-4 py-1.5 rounded-xl font-bold text-xs transition-colors flex items-center gap-1 ${
                            curSt === 'ABSENT'
                              ? 'bg-red-600 text-white shadow-sm'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-red-100'
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5" /> Absent
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}

              {!students.length && !loading && (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <Users className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-500 font-semibold text-sm">
                      No active students found for {teacherInfo.department} • {selectedCourse} • {selectedYear}.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Save Bar */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800/90 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-3">
            <span className="font-bold text-emerald-600">PRESENT: {presentCount}</span>
            <span>•</span>
            <span className="font-bold text-red-600">ABSENT: {absentCount}</span>
          </div>

          <button
            onClick={handleSaveAttendance}
            disabled={submitting || !students.length}
            className="btn-primary px-6 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg hover:shadow-xl"
          >
            <Save className="w-4 h-4" />
            {submitting ? 'SAVING ATTENDANCE...' : 'SAVE ATTENDANCE'}
          </button>
        </div>
      </div>
    </div>
  )
}
