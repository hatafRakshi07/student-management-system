import React, { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import PayslipModal from '../../components/hr/PayslipModal'
import { Users, DollarSign, Briefcase, Download, Printer, Search, Send, FileText, CheckCircle, Clock, ShieldAlert, Plus } from 'lucide-react'

export default function AdminHRDashboard() {
  const [stats, setStats] = useState(null)
  const [staffList, setStaffList] = useState([])
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  
  const [reportType, setReportType] = useState('employee-register')
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [payrollGenerating, setPayrollGenerating] = useState(false)
  const [selectedPayslip, setSelectedPayslip] = useState(null)
  const [payslipModalOpen, setPayslipModalOpen] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      const [statsRes, staffRes, reportRes] = await Promise.all([
        axios.get('/api/hr/admin/dashboard', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/hr/staff', {
          params: { search, department: deptFilter, status: statusFilter },
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`/api/hr/reports/${reportType}`, { headers: { Authorization: `Bearer ${token}` } })
      ])

      setStats(statsRes.data)
      setStaffList(staffRes.data.staff || [])
      setReportData(reportRes.data)
    } catch {
      toast.error('Failed to load HR & payroll data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [deptFilter, statusFilter, reportType])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    loadData()
  }

  const handleGeneratePayroll = async () => {
    setPayrollGenerating(true)
    try {
      const token = localStorage.getItem('access_token')
      const res = await axios.post('/api/hr/payroll/generate', { month: 'August', year: 2026 }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success(res.data.message || 'Payroll generated successfully!')
      loadData()
    } catch {
      toast.error('Failed to generate monthly payroll')
    } finally {
      setPayrollGenerating(false)
    }
  }

  const openPayslip = async (txnId) => {
    try {
      const token = localStorage.getItem('access_token')
      const res = await axios.get(`/api/hr/payslip/${txnId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSelectedPayslip(res.data)
      setPayslipModalOpen(true)
    } catch {
      toast.error('Could not load official salary slip')
    }
  }

  const exportCSV = () => {
    if (!reportData?.records) return
    let csv = "data:text/csv;charset=utf-8,Employee ID,Full Name,Department,Designation,Salary/Status\n"
    reportData.records.forEach(r => {
      csv += `"${r.employee_id}","${r.full_name}","${r.department || ''}","${r.designation || ''}","${r.net_salary || r.status}"\n`
    })
    const link = document.createElement("a")
    link.setAttribute("href", encodeURI(csv))
    link.setAttribute("download", `hr_report_${reportType}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6 animate-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Users className="w-7 h-7 text-primary-700" /> Staff & HR Payroll Command Center ERP
          </h1>
          <p className="page-subtitle">Manage Staff Profiles, Automated Monthly Payroll, Salary Slips, Department Registers & HR Audits</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="btn-secondary text-xs flex items-center gap-1.5">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={handleGeneratePayroll} disabled={payrollGenerating} className="btn-primary text-xs flex items-center gap-1.5">
            <Send className="w-4 h-4" /> {payrollGenerating ? 'Processing Payroll...' : 'Run One-Click Payroll'}
          </button>
        </div>
      </div>

      {/* Gauges */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-4 border border-blue-100 dark:border-blue-900/40">
            <p className="text-xl font-black text-blue-700 dark:text-blue-300">{stats.total_staff || 0}</p>
            <p className="text-xs font-semibold text-gray-500 uppercase">Total Enrolled Staff</p>
          </div>
          <div className="card p-4 border border-emerald-100 dark:border-emerald-900/40">
            <p className="text-xl font-black text-emerald-600">{stats.active_staff || 0}</p>
            <p className="text-xs font-semibold text-gray-500 uppercase">Active Working Staff</p>
          </div>
          <div className="card p-4 border border-purple-100 dark:border-purple-900/40">
            <p className="text-xl font-black text-purple-600">₹{(stats.monthly_salary_expense || 0).toLocaleString()}</p>
            <p className="text-xs font-semibold text-gray-500 uppercase">Monthly Payroll Expense</p>
          </div>
          <div className="card p-4 border border-amber-100 dark:border-amber-900/40">
            <p className="text-xl font-black text-amber-600">{stats.department_breakdown?.length || 0}</p>
            <p className="text-xs font-semibold text-gray-500 uppercase">Configured Departments</p>
          </div>
        </div>
      )}

      {/* Staff Directory & Search */}
      <div className="card p-5 space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search Employee ID, Name, Department, Designation..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-sm dark:bg-gray-800"
            />
          </div>
          <button type="submit" className="btn-primary py-2.5 px-5 text-xs flex items-center gap-2">
            <Search className="w-4 h-4" /> Search Directory
          </button>
        </form>

        <div className="table-container max-h-[500px] overflow-y-auto">
          <table className="table w-full text-left border-collapse">
            <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800 z-10 text-xs font-bold text-gray-700 dark:text-gray-300">
              <tr>
                <th className="p-3">Employee ID</th>
                <th className="p-3">Staff Name</th>
                <th className="p-3">Department & Designation</th>
                <th className="p-3">Employment Type</th>
                <th className="p-3 text-right">Net Monthly Salary</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
              {staffList.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="p-3 font-mono font-bold text-primary-700 dark:text-primary-400">{s.employee_id}</td>
                  <td className="p-3 font-bold text-gray-900 dark:text-white">{s.full_name}</td>
                  <td className="p-3 text-gray-700 dark:text-gray-300">{s.department} — <span className="font-semibold text-gray-500">{s.designation}</span></td>
                  <td className="p-3"><span className="badge badge-gray">{s.employment_type}</span></td>
                  <td className="p-3 text-right font-black text-emerald-600">₹{s.net_salary?.toLocaleString()}</td>
                  <td className="p-3 text-center"><span className="badge badge-green">{s.status}</span></td>
                </tr>
              ))}
              {!staffList.length && (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-gray-400">No matching staff records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* HR Reports Generator Table */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider">HR & Payroll Reports Register</h3>
          <div className="flex gap-2">
            {[
              { id: 'employee-register', label: 'Employee Register' },
              { id: 'payroll-register', label: 'Payroll Register' },
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

        <div className="table-container max-h-[450px] overflow-y-auto">
          <table className="table w-full text-left border-collapse">
            <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800 z-10 text-xs font-bold text-gray-700 dark:text-gray-300">
              <tr>
                <th className="p-3">Ref / Payslip #</th>
                <th className="p-3">Staff Name & ID</th>
                <th className="p-3">Month / Dept</th>
                <th className="p-3 text-right">Net Salary / Status</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
              {reportData?.records?.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="p-3 font-mono font-semibold text-primary-700">#{r.payslip_no || r.employee_id}</td>
                  <td className="p-3 font-bold text-gray-900 dark:text-white">{r.full_name} <span className="font-mono text-gray-400 font-normal">({r.employee_id})</span></td>
                  <td className="p-3 text-gray-600 dark:text-gray-400">{r.month_year || r.department}</td>
                  <td className="p-3 text-right font-black text-emerald-600">₹{(r.net_salary || 34500).toLocaleString()}</td>
                  <td className="p-3 text-center">
                    {r.payslip_no && (
                      <button onClick={() => openPayslip(r.payslip_no)} className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 rounded-lg text-[11px] font-semibold">
                        View Payslip
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <PayslipModal open={payslipModalOpen} onClose={() => setPayslipModalOpen(false)} payslipData={selectedPayslip} />
    </div>
  )
}
