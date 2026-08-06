import React, { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Calendar, Users, AlertTriangle, Download, Printer, CheckCircle, Clock, ShieldAlert, BarChart2 } from 'lucide-react'

export default function AdminAttendance() {
  const [stats, setStats] = useState(null)
  const [reportType, setReportType] = useState('daily-register')
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const statsRes = await axios.get('/api/attendance/admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setStats(statsRes.data)

      const reportRes = await axios.get(`/api/attendance/reports/${reportType}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setReportData(reportRes.data)
    } catch {
      toast.error('Failed to load admin attendance analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [reportType])

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

      {/* Low Attendance Defaulter Alert Drawer (<75%) */}
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

      {/* Attendance Register Report Generator */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider">Generated Attendance Register</h3>
          <div className="flex gap-2">
            {[
              { id: 'daily-register', label: 'Daily Register' },
              { id: 'low-attendance', label: 'Low Attendance (<75%)' },
              { id: 'staff-hours', label: 'Staff Hours & Late Log' },
            ].map(r => (
              <button
                key={r.id}
                onClick={() => setReportType(r.id)}
                className={`px-3 py-1.5 rounded-xl font-semibold text-xs transition ${
                  reportType === r.id ? 'bg-primary-700 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                }`}
              >
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
                <th className="p-3">Scholar No / ID</th>
                <th className="p-3">Class / Date</th>
                <th className="p-3 text-center">Status / %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
              {reportData?.records?.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="p-3 font-bold text-gray-900 dark:text-white">{r.student_name || r.name || r.staff_name}</td>
                  <td className="p-3 text-gray-500 font-mono">{r.scholar_no || r.staff_id || '-'}</td>
                  <td className="p-3">{r.class_name || r.date || '-'}</td>
                  <td className="p-3 text-center">
                    <span className={`badge ${r.status === 'PRESENT' ? 'badge-green' : r.status === 'ABSENT' ? 'badge-red' : 'badge-amber'}`}>
                      {r.status || `${r.percentage}%`}
                    </span>
                  </td>
                </tr>
              ))}
              {!reportData?.records?.length && (
                <tr>
                  <td colSpan="4" className="py-12 text-center text-gray-400">No attendance report records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
