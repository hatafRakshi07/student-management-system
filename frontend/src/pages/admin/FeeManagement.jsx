import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { feeAPI, studentAPI } from '../../services/api'
import toast from 'react-hot-toast'
import Modal from '../../components/common/Modal'
import ReceiptModal from '../../components/fees/ReceiptModal'
import {
  Plus, DollarSign, CheckCircle, Clock, AlertTriangle, TrendingUp,
  Search, Filter, Download, Printer, ShieldAlert, CreditCard, Layers, Eye
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function FeeManagement() {
  const [fees, setFees] = useState([])
  const [students, setStudents] = useState([])
  const [stats, setStats] = useState(null)
  const [modal, setModal] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState(null)
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)

  const [search, setSearch] = useState('')
  const [sessionFilter, setSessionFilter] = useState('')
  const [modeFilter, setModeFilter] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const statsRes = await feeAPI.stats()
      setStats(statsRes.data)

      const feesRes = await feeAPI.list({
        search,
        session: sessionFilter,
        payment_mode: modeFilter,
        class_name: classFilter,
        status: statusFilter,
        skip: (page - 1) * pageSize,
        limit: pageSize
      })
      setFees(feesRes.data.fees || [])
      setTotalCount(feesRes.data.total_count || (feesRes.data.fees ? feesRes.data.fees.length : 0))
    } catch (err) {
      toast.error('Failed to load fee records')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    studentAPI.list({ limit: 300 }).then(r => setStudents(r.data.students || [])).catch(() => {})
  }, [page, pageSize, sessionFilter, modeFilter, classFilter, statusFilter])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setPage(1)
    loadData()
  }

  const openReceipt = async (receiptId) => {
    try {
      const token = localStorage.getItem('access_token')
      const res = await axios.get(`/api/fees/receipt/${receiptId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSelectedReceipt(res.data)
      setReceiptModalOpen(true)
    } catch {
      toast.error('Could not load official receipt')
    }
  }

  const exportCSV = () => {
    if (!fees.length) return
    let csv = "data:text/csv;charset=utf-8,Receipt No,Voucher No,Student Name,Scholar No,Class,Amount,Mode,Session,Date\n"
    fees.forEach(f => {
      csv += `"${f.receipt_no}","${f.voucher_no}","${f.student_name}","${f.scholar_no || ''}","${f.class_name || ''}",${f.amount},"${f.payment_mode}","${f.session}","${f.payment_date}"\n`
    })
    const link = document.createElement("a")
    link.setAttribute("href", encodeURI(csv))
    link.setAttribute("download", `fee_records_page_${page}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const collectRate = stats?.total > 0 ? Math.round((stats.paid / stats.total) * 100) : 0

  return (
    <div className="space-y-6 animate-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-primary-700" /> Production Fee Management ERP
          </h1>
          <p className="page-subtitle">Historical & Live Fee Ledger, Collections Analytics, Defaulters Tracking & Receipts</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="btn-secondary flex items-center gap-2 text-xs">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <a href="/admin/financial-reports" className="btn-secondary flex items-center gap-2 text-xs">
            <Layers className="w-4 h-4" /> Financial Reports
          </a>
        </div>
      </div>

      {/* Collection Timeframe Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Today's Collection", value: `₹${stats.today_collection?.toLocaleString()}`, icon: TrendingUp, bg: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' },
            { label: "Monthly Collection", value: `₹${stats.monthly_collection?.toLocaleString()}`, icon: DollarSign, bg: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
            { label: 'Total Paid (Lifetime)', value: `₹${stats.paid?.toLocaleString()}`, icon: CheckCircle, bg: 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' },
            { label: 'Total Outstanding Pending', value: `₹${stats.pending?.toLocaleString()}`, icon: Clock, bg: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
          ].map(({ label, value, icon: Icon, bg }) => (
            <div key={label} className="card p-4 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-3">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${bg}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-lg font-black text-gray-900 dark:text-white leading-tight">{value}</p>
                <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Payment Mode Breakdowns & Trend Chart */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Mode Distribution */}
          <div className="card p-5">
            <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary-600" /> Mode-Wise Collection Share
            </h3>
            <div className="space-y-3 text-xs">
              {[
                { mode: 'Cash Collection', amount: stats.mode_breakdown?.cash, color: 'bg-emerald-500' },
                { mode: 'Online / UPI / Card', amount: stats.mode_breakdown?.online, color: 'bg-blue-500' },
                { mode: 'NEFT / RTGS / Bank', amount: stats.mode_breakdown?.neft, color: 'bg-purple-500' },
                { mode: 'Cheque Collection', amount: stats.mode_breakdown?.cheque, color: 'bg-amber-500' },
              ].map(({ mode, amount, color }) => (
                <div key={mode} className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl flex items-center justify-between border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{mode}</span>
                  </div>
                  <span className="font-black text-gray-900 dark:text-white">₹{(amount || 0).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Collection Trend Graph */}
          <div className="card p-5 lg:col-span-2">
            <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" /> Monthly Collection Trend
            </h3>
            {stats.collection_trend && (
              <ResponsiveContainer width="100%" height={190}>
                <AreaChart data={stats.collection_trend}>
                  <defs>
                    <linearGradient id="collGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#024794" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#024794" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={v => `₹${v/1000}k`} />
                  <Tooltip formatter={v => `₹${v.toLocaleString()}`} />
                  <Area type="monotone" dataKey="amount" stroke="#024794" strokeWidth={2.5} fillOpacity={1} fill="url(#collGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* Multi-Criteria Search & Filter Controls */}
      <div className="card p-5 space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search Student Name, Scholar No, Voucher #, Receipt #, Mobile..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-sm dark:bg-gray-800"
            />
          </div>
          <button type="submit" className="btn-primary py-2.5 px-5 text-xs flex items-center gap-2">
            <Search className="w-4 h-4" /> Search Records
          </button>
        </form>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-gray-100 dark:border-gray-800 text-xs">
          <div>
            <label className="font-bold text-gray-500 uppercase text-[10px] block mb-1">Session</label>
            <select value={sessionFilter} onChange={e => { setSessionFilter(e.target.value); setPage(1); }} className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800">
              <option value="">All Sessions</option>
              {['2023-24', '2024-25', '2025-26', '2026-27'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="font-bold text-gray-500 uppercase text-[10px] block mb-1">Payment Mode</label>
            <select value={modeFilter} onChange={e => { setModeFilter(e.target.value); setPage(1); }} className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800">
              <option value="">All Modes</option>
              {['CASH', 'ONLINE', 'NEFT', 'CHEQUE', 'UPI'].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="font-bold text-gray-500 uppercase text-[10px] block mb-1">Class / Course</label>
            <input type="text" value={classFilter} onChange={e => { setClassFilter(e.target.value); setPage(1); }} placeholder="Filter class..." className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800" />
          </div>
          <div>
            <label className="font-bold text-gray-500 uppercase text-[10px] block mb-1">Fee Status</label>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800">
              <option value="">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partial</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Fee Receipts Table */}
      <div className="card p-0 overflow-hidden shadow-sm">
        <div className="px-5 py-4 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider">Fee Receipt Register ({totalCount})</h3>
          <div className="flex items-center gap-2 text-xs">
            <span>Page Size:</span>
            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} className="p-1 rounded border border-gray-300 dark:bg-gray-900">
              {[25, 50, 100, 200].map(sz => <option key={sz} value={sz}>{sz}</option>)}
            </select>
          </div>
        </div>

        <div className="table-container max-h-[600px] overflow-y-auto">
          <table className="table w-full text-left border-collapse">
            <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800 z-10 text-gray-700 dark:text-gray-300 text-xs font-bold">
              <tr>
                <th className="p-3">Receipt / Vchr</th>
                <th className="p-3">Student & Scholar No</th>
                <th className="p-3">Class & Course</th>
                <th className="p-3">Session</th>
                <th className="p-3">Payment Mode</th>
                <th className="p-3 text-right">Amount (₹)</th>
                <th className="p-3 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
              {fees.map(f => (
                <tr key={f.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                  <td className="p-3">
                    <span className="font-bold text-primary-700 dark:text-primary-400 block">#{f.receipt_no}</span>
                    <span className="text-[10px] text-gray-400">Vchr: {f.voucher_no}</span>
                  </td>
                  <td className="p-3">
                    <span className="font-bold text-gray-900 dark:text-white block">{f.student_name}</span>
                    <span className="text-[10px] text-gray-500 font-mono">{f.scholar_no || '-'}</span>
                  </td>
                  <td className="p-3 font-semibold text-gray-700 dark:text-gray-300">{f.class_name || '-'}</td>
                  <td className="p-3"><span className="badge badge-gray">{f.session}</span></td>
                  <td className="p-3"><span className="badge badge-blue">{f.payment_mode}</span></td>
                  <td className="p-3 text-right font-black text-emerald-600">₹{f.amount?.toLocaleString()}</td>
                  <td className="p-3 text-center">
                    <button onClick={() => openReceipt(f.receipt_id)} className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg font-semibold text-[11px] flex items-center gap-1 mx-auto">
                      <Eye className="w-3.5 h-3.5 text-primary-600" /> View
                    </button>
                  </td>
                </tr>
              ))}
              {!fees.length && (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-gray-400">No matching fee receipt records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs">
          <span>Showing page {page} of {Math.ceil(totalCount / pageSize) || 1}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary py-1 px-3 disabled:opacity-40">Previous</button>
            <button disabled={page >= Math.ceil(totalCount / pageSize)} onClick={() => setPage(p => p + 1)} className="btn-secondary py-1 px-3 disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>

      {/* Printable Receipt Modal Component */}
      <ReceiptModal open={receiptModalOpen} onClose={() => setReceiptModalOpen(false)} receiptData={selectedReceipt} />
    </div>
  )
}
