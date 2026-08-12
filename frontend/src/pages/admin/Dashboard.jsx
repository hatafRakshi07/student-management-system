import React, { useEffect, useState } from 'react'
import { analyticsAPI, feesAPI, feeAPI } from '../../services/api'
import ReceiptModal from '../../components/fees/ReceiptModal'
import {
  GraduationCap, Users, DollarSign, UserCheck, BookOpen,
  Calendar, ArrowUpRight, TrendingUp, AlertCircle, CheckCircle2,
  Clock, CreditCard, ChevronRight, Eye, RefreshCw, Layers
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, CartesianGrid
} from 'recharts'

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4']
const MODE_COLORS = {
  CASH: '#10b981',
  NEFT: '#3b82f6',
  CHEQUE: '#f59e0b',
  ONLINE: '#8b5cf6'
}

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState(null)
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)

  const loadData = async () => {
    try {
      setRefreshing(true)
      const res = await analyticsAPI.dashboard()
      setData(res.data)
    } catch (err) {
      console.error("Dashboard data load error:", err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const openReceiptModal = async (receiptId, fallbackItem) => {
    try {
      const res = await feeAPI.getReceipt(receiptId)
      setSelectedReceipt(res.data)
      setReceiptModalOpen(true)
    } catch (err) {
      if (fallbackItem) {
        setSelectedReceipt({
          college_info: {
            name: "AKLANK GIRLS P.G. COLLEGE",
            tagline: "Quality Education & Self-Reliance (Est. 1998)",
            address: "Basant Vihar, Kota (Rajasthan) - 324009",
            contact: "0744-2405620 | info@aklankcollege.ac.in"
          },
          receipt_info: {
            receipt_no: fallbackItem.receipt_no || receiptId,
            voucher_no: fallbackItem.receipt_no || receiptId,
            date: fallbackItem.date || new Date().toLocaleDateString(),
            session: fallbackItem.session || "2025-26",
            payment_mode: fallbackItem.payment_mode || "CASH",
            collected_by: "Office Cashier"
          },
          student_info: {
            student_name: fallbackItem.student_name || "Student",
            father_name: "-",
            scholar_no: fallbackItem.scholar_no || "-",
            class_name: fallbackItem.class_name || "Degree Course",
            course: fallbackItem.class_name || "Aklank College"
          },
          fee_breakdown: {
            paid_amount: fallbackItem.amount || 0,
            discount_amount: fallbackItem.discount || 0,
            net_total: fallbackItem.amount || 0
          },
          remarks: "Official ERP Receipt Voucher"
        })
        setReceiptModalOpen(true)
      }
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent shadow-lg" />
        <p className="text-sm font-semibold text-gray-500 animate-pulse">Loading ERP Command Center...</p>
      </div>
    )
  }

  const kpis = data?.kpis || {
    total_students: data?.total_students || 0,
    active_students: data?.total_active_students || data?.total_students || 0,
    total_teachers: data?.total_teachers || 0,
    total_courses: 5,
    total_fee_collected: data?.paid_fees || 0,
    total_pending_fee: data?.pending_fees || 0,
    total_discount_fee: 0,
    collection_percentage: data?.collection_percentage || 0,
    current_session: "2025-26"
  }

  const enrollmentTrend = data?.enrollment_trend || []
  const sessionFeeTrend = data?.session_fee_trend || []
  const courseDistribution = data?.course_distribution || []
  const modeDistribution = data?.payment_mode_distribution || []
  const monthlyCollections = data?.monthly_collections || []
  const recentPayments = data?.recent_payments || []
  const topDefaulters = data?.top_defaulters || []

  const formatCurrency = (val) => {
    if (!val || isNaN(val)) return '₹0'
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)} K`
    return `₹${val.toLocaleString()}`
  }

  return (
    <div className="space-y-6 animate-page pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-primary-900 via-primary-800 to-indigo-900 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-white/10 text-white rounded-full text-xs font-semibold backdrop-blur-md flex items-center gap-1.5 border border-white/10">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Academic Session {kpis.current_session}
            </span>
            <span className="px-3 py-1 bg-amber-400/20 text-amber-300 rounded-full text-xs font-semibold border border-amber-400/30">
              2022–2026 Historical Records
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white pt-1">
            AKLANK COLLEGE ERP COMMAND CENTER
          </h1>
          <p className="text-xs sm:text-sm text-primary-200">
            Real-time analytics, student enrollment trends, multi-year fee collections & audits
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={refreshing}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-semibold backdrop-blur-md flex items-center gap-2 border border-white/10 transition active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
        </div>
      </div>

      {/* 8 Core KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Total Students */}
        <div className="card p-4 rounded-3xl border border-gray-100 dark:border-gray-800 flex items-center justify-between hover:shadow-md transition">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Students</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white">
              {kpis.total_students?.toLocaleString()}
            </p>
            <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Across 4 Batches
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 2: Active Students */}
        <div className="card p-4 rounded-3xl border border-gray-100 dark:border-gray-800 flex items-center justify-between hover:shadow-md transition">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Students</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {kpis.active_students?.toLocaleString()}
            </p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> 100% Enrolled
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 3: Total Teachers */}
        <div className="card p-4 rounded-3xl border border-gray-100 dark:border-gray-800 flex items-center justify-between hover:shadow-md transition">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Faculty & Staff</p>
            <p className="text-2xl font-black text-purple-600 dark:text-purple-400">
              {kpis.total_teachers}
            </p>
            <p className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-1">
              <Users className="w-3 h-3" /> 18 Teaching + 4 Staff
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 4: Total Courses */}
        <div className="card p-4 rounded-3xl border border-gray-100 dark:border-gray-800 flex items-center justify-between hover:shadow-md transition">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Departments</p>
            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
              {kpis.total_courses}
            </p>
            <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
              <BookOpen className="w-3 h-3" /> BCA, BA, BSc, MA
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 5: Total Fee Collected */}
        <div className="card p-4 rounded-3xl border border-gray-100 dark:border-gray-800 flex items-center justify-between hover:shadow-md transition">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Fee Collected</p>
            <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {formatCurrency(kpis.total_fee_collected)}
            </p>
            <p className="text-[11px] text-gray-400 font-medium">
              ₹{kpis.total_fee_collected?.toLocaleString()}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 6: Total Pending Fees */}
        <div className="card p-4 rounded-3xl border border-gray-100 dark:border-gray-800 flex items-center justify-between hover:shadow-md transition">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pending Dues</p>
            <p className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400">
              {formatCurrency(kpis.total_pending_fee)}
            </p>
            <p className="text-[11px] text-gray-400 font-medium">
              ₹{kpis.total_pending_fee?.toLocaleString()}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 7: Collection Percentage */}
        <div className="card p-4 rounded-3xl border border-gray-100 dark:border-gray-800 flex items-center justify-between hover:shadow-md transition">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Collection Rate</p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {kpis.collection_percentage}%
            </p>
            <div className="w-24 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-emerald-500 rounded-full"
                style={{ width: `${Math.min(100, kpis.collection_percentage)}%` }}
              />
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 8: Total Fee Discounts / Concessions */}
        <div className="card p-4 rounded-3xl border border-gray-100 dark:border-gray-800 flex items-center justify-between hover:shadow-md transition">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Concessions</p>
            <p className="text-xl sm:text-2xl font-black text-teal-600 dark:text-teal-400">
              {formatCurrency(kpis.total_discount_fee)}
            </p>
            <p className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold">
              Scholarship / Concession
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 flex items-center justify-center flex-shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Row 1: Charts (Enrollment Trend & Session Fee Breakdown) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Multi-Year Student Enrollment Trend */}
        <div className="card p-6 rounded-3xl border border-gray-100 dark:border-gray-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base">Multi-Year Student Admissions</h3>
              <p className="text-xs text-gray-400">Historical enrollment count per academic batch (2022 to 2026)</p>
            </div>
            <span className="badge badge-blue text-xs">Admissions</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={enrollmentTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="enrollmentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} opacity={0.5} />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(val) => [`${val} Students`, 'Enrolled']}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                />
                <Area type="monotone" dataKey="students" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#enrollmentGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Fee Collections & Discounts by Session */}
        <div className="card p-6 rounded-3xl border border-gray-100 dark:border-gray-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base">Session-Wise Revenue Collections</h3>
              <p className="text-xs text-gray-400">Total fees paid vs concessions given across sessions</p>
            </div>
            <span className="badge badge-green text-xs">Financials</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sessionFeeTrend} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} opacity={0.5} />
                <XAxis dataKey="session" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(val, name) => [`₹${Number(val).toLocaleString()}`, name === 'paid' ? 'Paid Fees' : 'Discounts']}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="paid" name="Paid (₹)" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="discount" name="Discount (₹)" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: Department Distribution & Payment Modes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department / Course Distribution */}
        <div className="card p-6 rounded-3xl border border-gray-100 dark:border-gray-800 space-y-4 lg:col-span-1 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-base">Department Distribution</h3>
            <p className="text-xs text-gray-400">Enrolled student distribution by course</p>
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={courseDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  dataKey="students"
                  strokeWidth={2}
                  stroke="transparent"
                >
                  {courseDistribution.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v, n, item) => [`${v} Students`, item.payload.name]}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {courseDistribution.map((item, i) => (
              <div key={item.name} className="flex items-center gap-1.5 truncate">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="text-gray-600 dark:text-gray-400 truncate">{item.name}:</span>
                <span className="font-bold text-gray-900 dark:text-white">{item.students}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Collection Revenue Timeline */}
        <div className="card p-6 rounded-3xl border border-gray-100 dark:border-gray-800 space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base">Monthly Revenue Collections</h3>
              <p className="text-xs text-gray-400">Chronological fee receipts timeline</p>
            </div>
            <span className="badge badge-purple text-xs">Historical Cashflow</span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyCollections} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="monthlyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} opacity={0.5} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(val) => [`₹${Number(val).toLocaleString()}`, 'Collection']}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                />
                <Area type="monotone" dataKey="amount" stroke="#8b5cf6" strokeWidth={2.5} fillOpacity={1} fill="url(#monthlyGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: Actionable Live Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent 10 Fee Payments */}
        <div className="card p-6 rounded-3xl border border-gray-100 dark:border-gray-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base">Recent Fee Payments</h3>
                <p className="text-xs text-gray-400">Verified official fee receipts</p>
              </div>
            </div>
            <span className="badge badge-green text-xs">Live Vouchers</span>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-96 overflow-y-auto">
            {recentPayments.map((p, idx) => (
              <div key={p.receipt_id || idx} className="py-3 flex items-center justify-between gap-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 px-2 rounded-xl transition">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-gray-900 dark:text-white truncate">
                      {p.student_name}
                    </p>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                      {p.payment_mode}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Receipt #{p.receipt_no} · {p.class_name} · {p.date}
                  </p>
                </div>

                <div className="text-right flex items-center gap-3">
                  <div>
                    <p className="font-black text-sm text-emerald-600 dark:text-emerald-400">
                      ₹{p.amount?.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-gray-400">{p.session}</p>
                  </div>
                  <button
                    onClick={() => openReceiptModal(p.receipt_id, p)}
                    className="p-1.5 bg-gray-100 hover:bg-primary-700 hover:text-white text-gray-600 dark:bg-gray-800 dark:text-gray-300 rounded-xl transition shadow-sm"
                    title="View & Print Official Receipt"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {!recentPayments.length && (
              <div className="py-8 text-center text-gray-400 text-xs">No recent payment transactions.</div>
            )}
          </div>
        </div>

        {/* Top Defaulters / Pending Fees Watchlist */}
        <div className="card p-6 rounded-3xl border border-gray-100 dark:border-gray-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base">Pending Dues Watchlist</h3>
                <p className="text-xs text-gray-400">Students with outstanding fee balances</p>
              </div>
            </div>
            <span className="badge badge-red text-xs">Defaulters</span>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-96 overflow-y-auto">
            {topDefaulters.map((d, idx) => (
              <div key={d.student_id || idx} className="py-3 flex items-center justify-between gap-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 px-2 rounded-xl transition">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-gray-900 dark:text-white truncate">
                      {d.student_name}
                    </p>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
                      {d.status || 'UNPAID'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Scholar: {d.scholar_no} · {d.class_name} · Mob: {d.mobile}
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-black text-sm text-rose-600 dark:text-rose-400">
                    ₹{d.pending_fee?.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    Paid: ₹{d.total_paid?.toLocaleString()} / ₹{d.total_fee?.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}

            {!topDefaulters.length && (
              <div className="py-8 text-center text-emerald-600 text-xs font-semibold">
                No fee defaulters recorded!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Official Receipt Modal */}
      <ReceiptModal
        open={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        receiptData={selectedReceipt}
      />
    </div>
  )
}
