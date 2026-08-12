import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import api, { attendanceAPI } from '../../services/api'
import { Calendar, Users, AlertTriangle, Download, Printer, CheckCircle, Clock, ShieldAlert, BarChart2, Briefcase } from 'lucide-react'

const STATUS_COLORS = {
  PRESENT: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  LATE: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  ABSENT: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  ON_LEAVE: 'bg-blue-100 text-blue-700',
  NOT_MARKED: 'bg-gray-100 text-gray-500',
}

export default function AdminAttendance() {
  const [activeTab, setActiveTab] = useState('students') // 'students' | 'staff'
  const [stats, setStats] = useState(null)
  const [reportType, setReportType] = useState('daily-register')
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(true)

  // Staff attendance state
  const [staffDate, setStaffDate] = useState(new Date().toISOString().split('T')[0])
  const [staffData, setStaffData] = useState(null)
  const [staffLoading, setStaffLoading] = useState(false)
  const [markingId, setMarkingId] = useState(null)

  const loadData = async () => {
    try {
      const statsRes = await api.get('/attendance/admin/dashboard')
      setStats(statsRes.data)

      const reportRes = await api.get(`/attendance/reports/${reportType}`)
      setReportData(reportRes.data)
    } catch {
      toast.error('Failed to load admin attendance analytics')
    } finally {
      setLoading(false)
    }
  }

  const loadStaffAttendance = async (date = staffDate) => {
    setStaffLoading(true)
    try {
      const res = await attendanceAPI.staffList(date)
      setStaffData(res.data)
    } catch { toast.error('Failed to load staff attendance') }
    finally { setStaffLoading(false) }
  }

  useEffect(() => { loadData() }, [reportType])
  useEffect(() => { if (activeTab === 'staff') loadStaffAttendance() }, [activeTab, staffDate])

  const markStaff = async (userId, status) => {
    setMarkingId(userId)
    try {
      await attendanceAPI.staffMark({ user_id: userId, status, date: staffDate })
      toast.success(`Marked ${status}`)
      loadStaffAttendance()
    } catch { toast.error('Failed to mark') }
    finally { setMarkingId(null) }
  }

  const exportCSV = () => {
    if (!reportData?.records) return
    let csv = "data:text/csv;charset=utf-8,Student Name,Scholar No,Class,Status,Remarks\n"
    reportData.records.forEach(r => {
      csv += `"${r.student_name || r.name || r.staff_name}","${r.scholar_no || ''}","${r.class_name || ''}","${r.status || r.percentage}","${r.remarks || ''}"\n`
    })
    const link = document.createElement("a")
    link.setAttribute("href", encodeURI(csv))
    link.setAttribute("download", `attendance_report_${reportType}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6 animate-page">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <BarChart2 className="w-7 h-7 text-primary-700" /> Admin ERP Attendance Command Center
          </h1>
          <p className="page-subtitle">Realtime Student & Staff Attendance Tracking, Defaulter Registers, Heatmaps & Reports</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="btn-secondary text-xs flex items-center gap-1.5">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={() => window.print()} className="btn-primary text-xs flex items-center gap-1.5">
            <Printer className="w-4 h-4" /> Print Register
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2">
        <button onClick={() => setActiveTab('students')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${activeTab === 'students' ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>
          <Users className="w-3.5 h-3.5" /> Student Attendance
        </button>
        <button onClick={() => setActiveTab('staff')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${activeTab === 'staff' ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>
          <Briefcase className="w-3.5 h-3.5" /> Staff Attendance
        </button>
      </div>

      {/* Gauges */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-4 border border-emerald-100 dark:border-emerald-900/40">
            <p className="text-xl font-black text-emerald-600">{stats.students_today?.present || 0}</p>
            <p className="text-xs font-semibold text-gray-500 uppercase">Students Present Today</p>
          </div>
          <div className="card p-4 border border-red-100 dark:border-red-900/40">
            <p className="text-xl font-black text-red-600">{stats.students_today?.absent || 0}</p>
            <p className="text-xs font-semibold text-gray-500 uppercase">Students Absent Today</p>
          </div>
          <div className="card p-4 border border-blue-100 dark:border-blue-900/40">
            <p className="text-xl font-black text-blue-600">{stats.staff_today?.present || 0}</p>
            <p className="text-xs font-semibold text-gray-500 uppercase">Staff Present Today</p>
          </div>
          <div className="card p-4 border border-amber-100 dark:border-amber-900/40">
            <p className="text-xl font-black text-amber-600">{stats.staff_today?.late || 0}</p>
            <p className="text-xs font-semibold text-gray-500 uppercase">Staff Late Entries</p>
          </div>
        </div>
      )}

      {/* ── STUDENT TAB ── */}
      {activeTab === 'students' && (
        <>
          {stats?.low_attendance_students?.length > 0 && (
            <div className="card p-5 border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20">
              <h3 className="font-bold text-sm text-amber-900 dark:text-amber-300 flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-amber-600" /> Low Attendance Risk Defaulters (&lt;75% Threshold)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {stats.low_attendance_students.slice(0, 6).map(s => (
                  <div key={s.student_id} className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-amber-200 dark:border-amber-800 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">{s.name}</p>
                      <p className="text-[10px] text-gray-500">{s.class_name || 'General'}</p>
                    </div>
                    <span className="badge badge-red font-black">{s.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider">Generated Attendance Register</h3>
              <div className="flex gap-2">
                {[
                  { id: 'daily-register', label: 'Daily Register' },
                  { id: 'low-attendance', label: 'Low Attendance (<75%)' },
                  { id: 'staff-hours', label: 'Staff Hours & Late Log' },
                ].map(r => (
                  <button key={r.id} onClick={() => setReportType(r.id)}
                    className={`px-3 py-1.5 rounded-xl font-semibold text-xs transition ${reportType === r.id ? 'bg-primary-700 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="table-container max-h-[500px] overflow-y-auto">
              <table className="table w-full text-left border-collapse">
                <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800 z-10 text-xs font-bold text-gray-700 dark:text-gray-300">
                  <tr>
                    <th className="p-3">Name</th>
                    <th className="p-3">{reportType === 'staff-hours' ? 'Staff ID' : 'Scholar No'}</th>
                    <th className="p-3">{reportType === 'staff-hours' ? 'Date & In/Out' : reportType === 'daily-register' ? 'Class' : 'Class / Department'}</th>
                    <th className="p-3 text-center">{reportType === 'low-attendance' ? 'Attendance %' : 'Status / Hours'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                  {reportData?.records?.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="p-3 font-bold text-gray-900 dark:text-white">{r.student_name || r.name || r.staff_name}</td>
                      <td className="p-3 text-gray-500 font-mono">{r.scholar_no || r.staff_id || '-'}</td>
                      <td className="p-3">
                        {reportType === 'staff-hours'
                          ? <div><p className="font-semibold text-gray-800 dark:text-gray-200">{r.date}</p><p className="text-[10px] text-gray-400 font-mono">In: {r.check_in || '-'} | Out: {r.check_out || '-'}</p></div>
                          : (r.class_name || r.date || '-')}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`badge ${
                          r.status === 'PRESENT' ? 'badge-green' :
                          r.status === 'ABSENT' ? 'badge-red' :
                          r.status === 'LATE' ? 'badge-amber' :
                          (r.percentage !== undefined && r.percentage !== null)
                            ? (Number(r.percentage) < 75 ? 'badge-red' : 'badge-green')
                            : 'badge-blue'
                        }`}>
                          {r.status
                            ? `${r.status}${r.working_hours ? ` (${r.working_hours}h)` : ''}`
                            : (r.percentage !== undefined && r.percentage !== null
                              ? `${r.percentage}%`
                              : (r.working_hours ? `${r.working_hours} hrs` : 'PRESENT'))}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!reportData?.records?.length && (
                    <tr><td colSpan="4" className="py-12 text-center text-gray-400">No attendance report records found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── STAFF ATTENDANCE TAB ── */}
      {activeTab === 'staff' && (
        <div className="card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-primary-600" /> Staff / Teacher Attendance Register
            </h3>
            <div className="flex items-center gap-2">
              <input type="date" value={staffDate} onChange={e => setStaffDate(e.target.value)}
                className="input text-sm" />
              {staffData && (
                <div className="flex gap-3 text-xs font-bold">
                  <span className="text-emerald-600">Present: {staffData.present}</span>
                  <span className="text-red-600">Absent: {staffData.absent}</span>
                  <span className="text-gray-500">Not Marked: {staffData.not_marked}</span>
                </div>
              )}
            </div>
          </div>

          <div className="table-container max-h-[520px] overflow-y-auto">
            <table className="table w-full text-left">
              <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800 z-10 text-xs font-bold text-gray-700 dark:text-gray-300">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Check In</th>
                  <th className="p-3">Check Out</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Mark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                {staffLoading && (
                  <tr><td colSpan={6} className="py-8 text-center text-gray-400 animate-pulse">Loading staff attendance…</td></tr>
                )}
                {!staffLoading && staffData?.staff?.map(s => (
                  <tr key={s.user_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="p-3">
                      <p className="font-bold text-gray-900 dark:text-white">{s.full_name}</p>
                      <p className="text-[10px] text-gray-400 capitalize">{s.role}</p>
                    </td>
                    <td className="p-3 text-gray-600 dark:text-gray-300">{s.department}</td>
                    <td className="p-3 font-mono text-gray-600">{s.check_in || '—'}</td>
                    <td className="p-3 font-mono text-gray-600">{s.check_out || '—'}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COLORS[s.status] || STATUS_COLORS.NOT_MARKED}`}>
                        {s.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1">
                        {['PRESENT', 'ABSENT', 'LATE', 'ON_LEAVE'].map(st => (
                          <button key={st}
                            disabled={markingId === s.user_id}
                            onClick={() => markStaff(s.user_id, st)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                              s.status === st
                                ? 'bg-primary-600 text-white border-primary-600'
                                : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}>
                            {st === 'ON_LEAVE' ? 'LEAVE' : st}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
                {!staffLoading && !staffData?.staff?.length && (
                  <tr><td colSpan={6} className="py-10 text-center text-gray-400">No staff records found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
