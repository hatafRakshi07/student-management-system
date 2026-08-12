import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { FileText, Download, Calendar, DollarSign, BookOpen, Layers, Users, Printer } from 'lucide-react'

export default function FinancialReports() {
  const [reportType, setReportType] = useState('daily-collection')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchReport = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/fees/reports/${reportType}`, {
        params: { start_date: startDate }
      })
      setReportData(res.data)
    } catch (err) {
      toast.error('Failed to load report')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReport()
  }, [reportType, startDate])

  const exportCSV = () => {
    if (!reportData) return
    let csvContent = "data:text/csv;charset=utf-8,"
    if (reportData.records) {
      csvContent += "Receipt No,Student Name,Scholar No,Amount,Mode,Date\n"
      reportData.records.forEach(r => {
        csvContent += `"${r.receipt_no}","${r.student_name}","${r.scholar_no || ''}",${r.amount},"${r.mode}","${r.date}"\n`
      })
    } else if (reportData.data) {
      csvContent += "Category,Total Amount,Count\n"
      reportData.data.forEach(d => {
        csvContent += `"${d.course || d.class_name || d.payment_mode}",${d.total_amount},${d.receipt_count || d.count}\n`
      })
    }
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `${reportType}_report_${startDate}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6 animate-page">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-primary-700" /> ERP Financial Reports & Registers
          </h1>
          <p className="page-subtitle">Generate, audit, print, and export official college fee collection ledgers</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="btn-secondary flex items-center gap-2 text-xs">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={() => window.print()} className="btn-primary flex items-center gap-2 text-xs">
            <Printer className="w-4 h-4" /> Print Register
          </button>
        </div>
      </div>

      {/* Report Selector Tabs */}
      <div className="card p-2">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'daily-collection', label: 'Daily Collection', icon: Calendar },
            { id: 'course-wise', label: 'Course-Wise', icon: BookOpen },
            { id: 'class-wise', label: 'Class-Wise', icon: Layers },
            { id: 'pending-report', label: 'Pending Defaulters', icon: Users },
            { id: 'cash-book', label: 'Cash Book', icon: DollarSign },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setReportType(id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
                reportType === id
                  ? 'bg-primary-700 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Date Filter */}
      {reportType === 'daily-collection' && (
        <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700">
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Select Date:</label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 text-sm dark:bg-gray-900"
          />
        </div>
      )}

      {/* Report Content Display */}
      <div className="card overflow-hidden">
        <h3 className="font-bold text-base text-gray-900 dark:text-white mb-4 flex items-center justify-between">
          <span>{reportData?.report_title || "Financial Register"}</span>
          <span className="text-xs font-semibold text-gray-500">Total Entries: {reportData?.count || reportData?.data?.length || 0}</span>
        </h3>

        {loading ? (
          <div className="py-20 text-center text-gray-400">Loading register data...</div>
        ) : reportData?.records ? (
          <div className="table-container">
            <table className="table w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs">
                  <th className="p-3">Receipt #</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Scholar No</th>
                  <th className="p-3">Payment Mode</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                {reportData.records.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="p-3 font-semibold text-primary-700">{r.receipt_no}</td>
                    <td className="p-3 font-bold">{r.student_name}</td>
                    <td className="p-3 text-gray-500">{r.scholar_no || '-'}</td>
                    <td className="p-3"><span className="badge badge-blue">{r.mode}</span></td>
                    <td className="p-3 text-gray-500">{new Date(r.date).toLocaleDateString()}</td>
                    <td className="p-3 text-right font-bold text-gray-900 dark:text-white">₹{r.amount?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : reportData?.data ? (
          <div className="table-container">
            <table className="table w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs">
                  <th className="p-3">Category / Group</th>
                  <th className="p-3 text-center">Receipt Count</th>
                  <th className="p-3 text-right">Total Collection (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                {reportData.data.map((d, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="p-3 font-bold text-gray-900 dark:text-white">{d.course || d.class_name || d.payment_mode}</td>
                    <td className="p-3 text-center font-semibold text-primary-700">{d.receipt_count || d.count}</td>
                    <td className="p-3 text-right font-bold text-emerald-600">₹{d.total_amount?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-gray-400">No report records found.</div>
        )}
      </div>
    </div>
  )
}
