import React, { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { studentAPI, subjectAPI } from '../../services/api'
import { Calendar, CheckCircle, XCircle, Clock, Save, Send, Filter, Users, AlertCircle, ShieldAlert } from 'lucide-react'

export default function AttendanceManagement() {
  const [students, setStudents] = useState([])
  const [subjects, setSubjects] = useState([])
  const [selectedClass, setSelectedClass] = useState('B.A. I-SEM')
  const [selectedSection, setSelectedSection] = useState('A')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [lectureNo, setLectureNo] = useState(1)
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0])

  const [studentStatusMap, setStudentStatusMap] = useState({})
  const [remarksMap, setRemarksMap] = useState({})
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [stRes, subRes] = await Promise.all([
        studentAPI.list({ limit: 300 }),
        subjectAPI.list()
      ])
      const stList = stRes.data.students || []
      setStudents(stList)

      const initialMap = {}
      stList.forEach(s => {
        initialMap[s.id] = 'PRESENT'
      })
      setStudentStatusMap(initialMap)

      const subList = subRes.data || []
      setSubjects(subList)
      if (subList.length) setSelectedSubject(subList[0].id)
    } catch {
      toast.error('Failed to load students and subjects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const markAll = (status) => {
    const updated = { ...studentStatusMap }
    students.forEach(s => {
      updated[s.id] = status
    })
    setStudentStatusMap(updated)
    toast.success(`Marked all students as ${status}`)
  }

  const handleStatusToggle = (studentId, status) => {
    setStudentStatusMap(prev => ({ ...prev, [studentId]: status }))
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const token = localStorage.getItem('access_token')
      const recordsPayload = students.map(s => ({
        student_id: s.id,
        status: studentStatusMap[s.id] || 'PRESENT',
        remarks: remarksMap[s.id] || ''
      }))

      const payload = {
        class_name: selectedClass,
        section: selectedSection,
        subject_id: Number(selectedSubject),
        lecture_no: Number(lectureNo),
        date: attendanceDate,
        records: recordsPayload
      }

      const res = await axios.post('/api/attendance/session/submit', payload, {
        headers: { Authorization: `Bearer ${token}` }
      })

      toast.success(res.data.message || 'Attendance session submitted successfully!')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to submit attendance session')
    } finally {
      setSubmitting(false)
    }
  }

  const presentCount = Object.values(studentStatusMap).filter(v => v === 'PRESENT').length
  const absentCount = Object.values(studentStatusMap).filter(v => v === 'ABSENT').length
  const lateCount = Object.values(studentStatusMap).filter(v => v === 'LATE').length
  const leaveCount = Object.values(studentStatusMap).filter(v => v === 'LEAVE' || v === 'MEDICAL_LEAVE').length

  return (
    <div className="space-y-6 animate-page">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary-700" /> Subject & Lecture Attendance Entry ERP
          </h1>
          <p className="page-subtitle">Mark daily subject/lecture attendance for assigned class sections with duplicate protection</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => markAll('PRESENT')} className="btn-secondary text-xs flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-600" /> Mark All Present
          </button>
          <button onClick={() => markAll('ABSENT')} className="btn-secondary text-xs flex items-center gap-1.5">
            <XCircle className="w-4 h-4 text-red-600" /> Mark All Absent
          </button>
          <button onClick={handleSubmit} disabled={submitting} className="btn-primary text-xs flex items-center gap-1.5">
            <Send className="w-4 h-4" /> {submitting ? 'Submitting...' : 'Submit Session'}
          </button>
        </div>
      </div>

      {/* Class & Subject Selector Header */}
      <div className="card p-5 grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div>
          <label className="font-bold text-gray-500 uppercase text-[10px] block mb-1">Class / Department</label>
          <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="w-full p-2 rounded-xl border border-gray-300 dark:border-gray-600 text-xs dark:bg-gray-800">
            {['B.A. I-SEM', 'B.A. III-SEM', 'B.A. V-SEM', 'B.SC I-SEM', 'B.COM I-SEM'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="font-bold text-gray-500 uppercase text-[10px] block mb-1">Section</label>
          <select value={selectedSection} onChange={e => setSelectedSection(e.target.value)} className="w-full p-2 rounded-xl border border-gray-300 dark:border-gray-600 text-xs dark:bg-gray-800">
            {['A', 'B', 'C', 'D'].map(s => <option key={s} value={s}>Section {s}</option>)}
          </select>
        </div>
        <div>
          <label className="font-bold text-gray-500 uppercase text-[10px] block mb-1">Subject</label>
          <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="w-full p-2 rounded-xl border border-gray-300 dark:border-gray-600 text-xs dark:bg-gray-800">
            {subjects.map(sub => <option key={sub.id} value={sub.id}>{sub.name} ({sub.code})</option>)}
            {!subjects.length && <option value="1">General Lecture</option>}
          </select>
        </div>
        <div>
          <label className="font-bold text-gray-500 uppercase text-[10px] block mb-1">Lecture Number</label>
          <select value={lectureNo} onChange={e => setLectureNo(e.target.value)} className="w-full p-2 rounded-xl border border-gray-300 dark:border-gray-600 text-xs dark:bg-gray-800">
            {[1, 2, 3, 4, 5, 6].map(l => <option key={l} value={l}>Lecture #{l}</option>)}
          </select>
        </div>
        <div>
          <label className="font-bold text-gray-500 uppercase text-[10px] block mb-1">Date</label>
          <input type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} className="w-full p-2 rounded-xl border border-gray-300 dark:border-gray-600 text-xs dark:bg-gray-800" />
        </div>
      </div>

      {/* Realtime Attendance Count Counters */}
      <div className="grid grid-cols-4 gap-4 text-center">
        <div className="card p-3 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200">
          <p className="text-xl font-black text-emerald-700 dark:text-emerald-300">{presentCount}</p>
          <p className="text-[10px] font-bold uppercase text-emerald-600">Present</p>
        </div>
        <div className="card p-3 bg-red-50 dark:bg-red-900/30 border border-red-200">
          <p className="text-xl font-black text-red-700 dark:text-red-300">{absentCount}</p>
          <p className="text-[10px] font-bold uppercase text-red-600">Absent</p>
        </div>
        <div className="card p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200">
          <p className="text-xl font-black text-amber-700 dark:text-amber-300">{lateCount}</p>
          <p className="text-[10px] font-bold uppercase text-amber-600">Late</p>
        </div>
        <div className="card p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200">
          <p className="text-xl font-black text-blue-700 dark:text-blue-300">{leaveCount}</p>
          <p className="text-[10px] font-bold uppercase text-blue-600">On Leave</p>
        </div>
      </div>

      {/* Student List Table */}
      <div className="card p-0 overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 font-bold text-xs uppercase text-gray-700 dark:text-gray-300">
          Class Register — {students.length} Enrolled Students
        </div>
        <div className="table-container max-h-[550px] overflow-y-auto">
          <table className="table w-full text-left border-collapse">
            <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800 z-10 text-xs text-gray-600 dark:text-gray-300 font-bold">
              <tr>
                <th className="p-3">Scholar #</th>
                <th className="p-3">Student Name</th>
                <th className="p-3">Class</th>
                <th className="p-3 text-center">Attendance Status</th>
                <th className="p-3">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
              {students.map(s => {
                const curSt = studentStatusMap[s.id] || 'PRESENT'
                return (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="p-3 font-mono font-semibold text-gray-500">{s.roll_number || s.reg_no || `#${s.id}`}</td>
                    <td className="p-3 font-bold text-gray-900 dark:text-white">{s.student_name || s.user?.full_name}</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">{s.class_name}</td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1.5">
                        {[
                          { key: 'PRESENT', label: 'Present', color: 'bg-emerald-600 text-white' },
                          { key: 'ABSENT', label: 'Absent', color: 'bg-red-600 text-white' },
                          { key: 'LATE', label: 'Late', color: 'bg-amber-500 text-white' },
                          { key: 'LEAVE', label: 'Leave', color: 'bg-blue-600 text-white' },
                        ].map(b => (
                          <button
                            key={b.key}
                            type="button"
                            onClick={() => handleStatusToggle(s.id, b.key)}
                            className={`px-3 py-1 rounded-xl font-bold text-[11px] transition ${
                              curSt === b.key ? b.color : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                            }`}
                          >
                            {b.label}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        placeholder="Add note..."
                        value={remarksMap[s.id] || ''}
                        onChange={e => setRemarksMap({ ...remarksMap, [s.id]: e.target.value })}
                        className="px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-xs w-full dark:bg-gray-900"
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
