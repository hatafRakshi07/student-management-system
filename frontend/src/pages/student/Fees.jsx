import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { studentAPI } from '../../services/api'
import ReceiptModal from '../../components/fees/ReceiptModal'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { DollarSign, CheckCircle, Clock, AlertTriangle, CreditCard, Search, Eye, Download, Calendar } from 'lucide-react'

export default function Fees() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modeFilter, setModeFilter] = useState('all')
  const [selectedReceipt, setSelectedReceipt] = useState(null)
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)

  useEffect(() => {
    studentAPI.fees().then(r => { setData(r.data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const openReceipt = async (receiptId) => {
    try {
      const token = localStorage.getItem('access_token')
      const res = await axios.get(`/api/fees/receipt/${receiptId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSelectedReceipt(res.data)
      setReceiptModalOpen(true)
    } catch {
      // Fallback local format if server endpoint offline
      const f = (data?.fees || []).find(r => r.id === receiptId)
      if (f) {
        setSelectedReceipt({
          college_info: { name: "AKLANK GIRLS P.G. COLLEGE", tagline: "Quality Education & Self-Reliance", address: "Basant Vihar, Kota", contact: "0744-2405620" },
          receipt_info: { receipt_no: f.id, voucher_no: f.transaction_id || f.id, date: new Date(f.payment_date).toLocaleDateString(), session: "2024-25", payment_mode: "CASH", collected_by: "Office" },
          student_info: { student_name: "Student", father_name: "-", scholar_no: "-", class_name: "-", course: "-" },
          fee_breakdown: { paid_amount: f.amount, discount_amount: 0, net_total: f.amount },
          remarks: f.description || "Fee Payment Receipt"
        })
        setReceiptModalOpen(true)
      }
    }
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" />
    </div>
  )

  const allFees = data?.fees || []
  const filtered = allFees.filter(f => {
    const matchSearch = !search || f.fee_type.toLowerCase().includes(search.toLowerCase()) || (f.transaction_id && f.transaction_id.toLowerCase().includes(search.toLowerCase()))
    const matchMode = modeFilter === 'all' || (f.description && f.description.toLowerCase().includes(modeFilter.toLowerCase()))
    return matchSearch && matchMode
  })

  const pieData = [
    { name: 'Paid', value: data?.paid_amount || 0 },
    { name: 'Pending', value: data?.pending_amount || 0 },
  ]
  const total = data?.total_amount || 0
  const paidPct = total > 0 ? Math.round(((data?.paid_amount || 0) / total) * 100) : 0

  return (
    <div className="space-y-6 animate-page">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-primary-700" /> Student Fee Portal & Receipts
        </h1>
        <p className="page-subtitle">Track your fee summary, payment history, and download official receipt vouchers</p>
      </div>

      {/* Warning */}
      {(data?.pending_amount || 0) > 0 && (
        <div className="alert-warning flex items-start gap-3 p-4 rounded-2xl">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-800 dark:text-amber-300 text-sm">Outstanding Pending Fees Notice</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">You have ₹{(data?.pending_amount || 0).toLocaleString()} in outstanding balance. Please clear before semester examination schedule.</p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Course Fee', value: `₹${(data?.total_amount || 0).toLocaleString()}`, icon: DollarSign, bg: 'bg-gray-100 dark:bg-gray-700', iconColor: 'text-gray-600 dark:text-gray-300' },
          { label: 'Total Amount Paid', value: `₹${(data?.paid_amount || 0).toLocaleString()}`, icon: CheckCircle, bg: 'bg-emerald-100 dark:bg-emerald-900/30', iconColor: 'text-emerald-600' },
          { label: 'Pending Balance', value: `₹${(data?.pending_amount || 0).toLocaleString()}`, icon: Clock, bg: 'bg-red-100 dark:bg-red-900/30', iconColor: 'text-red-600' },
        ].map(({ label, value, icon: Icon, bg, iconColor }) => (
          <div key={label} className="card flex items-center gap-4 p-4 border border-gray-100 dark:border-gray-800">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${bg} flex-shrink-0`}>
              <Icon className={`h-6 w-6 ${iconColor}`} />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Payment Progress Bar & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card flex flex-col items-center justify-center p-5">
          <h3 className="font-bold text-gray-900 dark:text-white mb-3 text-xs uppercase tracking-wide self-start">Fee Collection Status</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value">
                <Cell fill="#22c55e" />
                <Cell fill="#ef4444" />
              </Pie>
              <Tooltip formatter={v => `₹${v.toLocaleString()}`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 text-xs font-semibold">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Paid</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Pending</span>
          </div>
        </div>

        <div className="card lg:col-span-2 p-5 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-4 text-xs uppercase tracking-wide">Overall Payment Progression</h3>
            <div className="mb-4">
              <div className="flex justify-between text-xs font-semibold mb-2">
                <span className="text-gray-600 dark:text-gray-400">Total Completion Ratio</span>
                <span className="font-bold text-emerald-600">{paidPct}%</span>
              </div>
              <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-700" style={{ width: `${paidPct}%` }} />
              </div>
            </div>
          </div>
          <div className="p-4 bg-primary-50 dark:bg-primary-900/30 rounded-2xl border border-primary-200/50 flex items-center justify-between text-xs">
            <div>
              <p className="font-bold text-primary-900 dark:text-primary-300">Need an Official Printable Receipt?</p>
              <p className="text-primary-700 dark:text-primary-400 mt-0.5">Click 'View Receipt' on any payment record below to view & print official receipt with college logo.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Fee Receipts History */}
      <div className="card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-bold text-gray-900 dark:text-white text-sm uppercase tracking-wide">Complete Receipt History & Payment Timeline</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search receipt #"
                className="pl-8 pr-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 text-xs dark:bg-gray-800"
              />
            </div>
            <select value={modeFilter} onChange={e => setModeFilter(e.target.value)} className="py-1.5 px-3 rounded-xl border border-gray-300 dark:border-gray-600 text-xs dark:bg-gray-800">
              <option value="all">All Modes</option>
              <option value="CASH">Cash</option>
              <option value="NEFT">NEFT / Bank</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          {filtered.map(f => (
            <div key={f.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-primary-300 transition">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0 text-emerald-600">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-gray-900 dark:text-white">{f.fee_type}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{f.description}</p>
                  <p className="text-[11px] text-gray-400">Date: {new Date(f.payment_date).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0">
                <div className="text-right">
                  <p className="font-black text-base text-gray-900 dark:text-white">₹{f.amount?.toLocaleString()}</p>
                  <span className="badge badge-green mt-0.5">Paid</span>
                </div>
                <button
                  onClick={() => openReceipt(f.id)}
                  className="px-3 py-1.5 bg-primary-700 hover:bg-primary-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
                >
                  <Eye className="w-3.5 h-3.5" /> View Receipt
                </button>
              </div>
            </div>
          ))}

          {!filtered.length && (
            <div className="py-12 text-center text-gray-400">No payment receipt records found.</div>
          )}
        </div>
      </div>

      <ReceiptModal open={receiptModalOpen} onClose={() => setReceiptModalOpen(false)} receiptData={selectedReceipt} />
    </div>
  )
}
