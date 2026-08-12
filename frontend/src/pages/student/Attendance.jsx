import React, { useEffect, useState } from 'react'
import { studentAPI, attendanceAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { CheckCircle2, XCircle, Clock, TrendingUp } from 'lucide-react'

export default function Attendance() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [history, setHistory] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    studentAPI.attendance().then(r => { setData(r.data); setLoading(false) }).catch(() => setLoading(false))
    if (user?.id) {
      attendanceAPI.studentHistory(user.id).then(r => setHistory(r.data)).catch(() => {})
    }
  }, [user?.id])

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" />
    </div>
  )

  const percentage = data?.percentage || 0
  const isGood = percentage >= 75
  const pieData = [
    { name: 'Present', value: data?.present || 0 },
    { name: 'Absent', value: data?.absent || 0 },
  ]
  const COLORS = ['#10b981', '#ef4444']

  return (
    <div className="space-y-5 animate-page">
      <div>
        <h1 className="page-title">My Attendance</h1>
        <p className="page-subtitle">Track your attendance records</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center p-4">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-md">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <p className={`text-2xl sm:text-3xl font-bold ${isGood ? 'text-primary-600 dark:text-primary-400' : 'text-red-500'}`}>{percentage}%</p>
          <p className="text-xs text-gray-400 mt-1">Overall</p>
          <span className={`badge mt-2 ${isGood ? 'badge-green' : 'badge-red'}`}>
            {isGood ? 'Good' : 'Low'}
          </span>
        </div>
        <div className="card text-center p-4">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-md">
            <CheckCircle2 className="h-5 w-5 text-white" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400">{data?.present || 0}</p>
          <p className="text-xs text-gray-400 mt-1">Present</p>
        </div>
        <div className="card text-center p-4">
          <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-md">
            <XCircle className="h-5 w-5 text-white" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-red-500">{data?.absent || 0}</p>
          <p className="text-xs text-gray-400 mt-1">Absent</p>
        </div>
      </div>

      {/* Warning */}
      {!isGood && (
        <div className="alert-warning text-sm">
          <p className="font-semibold">Below minimum attendance!</p>
          <p className="mt-0.5 opacity-80">You need {Math.ceil((0.75 * (data?.total_classes || 0) - (data?.present || 0)))} more classes to reach 75%.</p>
        </div>
      )}

      {/* Chart */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">Attendance Distribution</h3>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              dataKey="value"
              strokeWidth={2}
              stroke="transparent"
            >
              {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
            </Pie>
            <Tooltip formatter={(v) => [`${v} classes`, '']} />
            <Legend wrapperStyle={{ fontSize: '13px' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* History table */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 text-sm">Attendance History</h3>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Day</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {(history?.records || (data?.records || []).slice(0, 60)).map((r, i) => {
                const status = (r.status || '').toUpperCase()
                return (
                  <tr key={i}>
                    <td className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                      {r.date || (r.date_raw ? r.date_raw : new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }))}
                    </td>
                    <td className="text-xs text-gray-400">{r.day || ''}</td>
                    <td className="text-xs text-gray-500">{r.subject || (r.subject_id ? `Subject ${r.subject_id}` : 'General')}</td>
                    <td>
                      <span className={`badge ${
                        status === 'PRESENT' ? 'badge-green' :
                        status === 'LATE'    ? 'badge-yellow' :
                        status === 'LEAVE'   ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full text-xs font-bold' :
                                              'badge-red'
                      }`}>{status || r.status}</span>
                    </td>
                    <td className="text-xs text-gray-400">{r.remarks || '—'}</td>
                  </tr>
                )
              })}
              {!(history?.records?.length || data?.records?.length) && (
                <tr><td colSpan={5} className="text-center text-gray-400 py-6 text-sm">No records found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}


