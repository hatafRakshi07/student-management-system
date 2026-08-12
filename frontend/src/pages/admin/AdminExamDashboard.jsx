import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { Award, Plus, Calendar, CheckCircle, AlertTriangle, Download, Printer, Users, BarChart2, ShieldAlert } from 'lucide-react'

export default function AdminExamDashboard() {
  const [stats, setStats] = useState(null)
  const [reportType, setReportType] = useState('merit-list')
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      const statsRes = await api.get('/exams/admin/dashboard')
      setStats(statsRes.data)

      const reportRes = await api.get(`/exams/reports/${reportType}`)
      setReportData(reportRes.data)
    } catch {
      toast.error('Failed to load examination analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [reportType])

  const exportCSV = () => {
    if (!reportData?.records) return
    let csv = "data:text/csv;charset=utf-8,Rank,Student Name,Scholar No,Class,Percentage,SGPA,Division\n"
    reportData.records.forEach(r => {
      csv += `"${r.rank || ''}","${r.student_name}","${r.scholar_no || ''}","${r.class_name || ''}",${r.percentage || ''},${r.sgpa || ''},"${r.division || ''}"\n`
    })
    const link = document.createElement("a")
    link.setAttribute("href", encodeURI(csv))
    link.setAttribute("download", `exam_report_${reportType}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6 animate-page">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Award className="w-7 h-7 text-primary-700" /> Admin Examination Command Center ERP
          </h1>
          <p className="page-subtitle">Schedule Examinations, Manage Merit Lists, Revaluations, Backlogs & Marksheet Registers</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="btn-secondary text-xs flex items-center gap-1.5">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={() => window.print()} className="btn-primary text-xs flex items-center gap-1.5">
            <Printer className="w-4 h-4" /> Print Merit List
          </button>
        </div>
      </div>

      {/* Gauges */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-4 border border-blue-100 dark:border-blue-900/40">
            <p className="text-xl font-black text-blue-700 dark:text-blue-300">{stats.total_exams || 0}</p>
            <p className="text-xs font-semibold text-gray-500 uppercase">Exams Conducted</p>
          </div>
          <div className="card p-4 border border-emerald-100 dark:border-emerald-900/40">
            <p className="text-xl font-black text-emerald-600">{stats.pass_count || 0}</p>
            <p className="text-xs font-semibold text-gray-500 uppercase">Passed Students ({stats.pass_percentage}%)</p>
          </div>
          <div className="card p-4 border border-amber-100 dark:border-amber-900/40">
            <p className="text-xl font-black text-amber-600">{stats.atkt_count || 0}</p>
            <p className="text-xs font-semibold text-gray-500 uppercase">ATKT / Backlog Students</p>
          </div>
          <div className="card p-4 border border-red-100 dark:border-red-900/40">
            <p className="text-xl font-black text-red-600">{stats.fail_count || 0}</p>
            <p className="text-xs font-semibold text-gray-500 uppercase">Failed Students</p>
          </div>
        </div>
      )}

      {/* Merit Rankers & At-Risk Prediction Split Grid */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Merit Rankers */}
          <div className="card p-5 space-y-4">
            <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" /> College Merit Rankers & Toppers
            </h3>
            <div className="space-y-2.5">
              {stats.top_rankers?.map((r, i) => (
                <div key={i} className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-2xl flex items-center justify-between border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 font-black text-xs flex items-center justify-center">
                      #{r.rank}
                    </span>
                    <div>
                      <p className="font-bold text-xs text-gray-900 dark:text-white">{r.student_name}</p>
                      <p className="text-[10px] text-gray-500">{r.scholar_no} | {r.class_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-xs text-emerald-600">{r.percentage}%</p>
                    <span className="text-[10px] text-gray-400">SGPA: {r.sgpa}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI At-Risk Prediction Drawer */}
          <div className="card p-5 space-y-4">
            <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-500" /> AI At-Risk Academic Predictions
            </h3>
            <div className="space-y-2.5">
              {stats.at_risk_students?.map((s, i) => (
                <div key={i} className="p-3 bg-red-50/50 dark:bg-red-950/20 rounded-2xl flex items-center justify-between border border-red-100 dark:border-red-900/40">
                  <div>
                    <p className="font-bold text-xs text-gray-900 dark:text-white">{s.student_name}</p>
                    <p className="text-[10px] text-gray-500">Scholar: {s.scholar_no}</p>
                  </div>
                  <div className="text-right">
                    <span className="badge badge-red font-bold text-[10px]">{s.risk_level}</span>
                    <p className="text-[10px] font-semibold text-gray-600 mt-0.5">SGPA: {s.sgpa}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Examination Reports Generator Table */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider">Examination Reports Register</h3>
          <div className="flex gap-2">
            {[
              { id: 'merit-list', label: 'Merit Rank List' },
              { id: 'backlog-report', label: 'Backlog Register' },
            ].map(r => (
              <button
                key={r.id}
                onClick={() => setReportType(r.id)}
                className={`px-3.5 py-1.5 rounded-xl font-semibold text-xs transition ${
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
                <th className="p-3">Rank / Semester</th>
                <th className="p-3">Student Name</th>
                <th className="p-3">Scholar No / Subject</th>
                <th className="p-3 text-right">Percentage / SGPA / Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
              {reportData?.records?.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="p-3 font-bold text-primary-700">#{r.rank || r.semester}</td>
                  <td className="p-3 font-bold text-gray-900 dark:text-white">{r.student_name}</td>
                  <td className="p-3 text-gray-500 font-mono">{r.scholar_no || r.subject_name || '-'}</td>
                  <td className="p-3 text-right font-black text-emerald-600">
                    {r.percentage ? `${r.percentage}% (SGPA: ${r.sgpa})` : (r.failed_date ? `Failed: ${r.failed_date}` : '-')}
                  </td>
                </tr>
              ))}
              {!reportData?.records?.length && (
                <tr>
                  <td colSpan="4" className="py-12 text-center text-gray-400">No exam report records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
