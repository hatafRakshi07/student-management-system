import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { studentAPI, feesAPI } from '../../services/api'
import ReceiptModal from '../../components/fees/ReceiptModal'
import {
  DollarSign, CheckCircle, Clock, AlertTriangle, CreditCard,
  Search, Eye, Download, Calendar, ChevronDown, ChevronUp,
  FileText, ShieldCheck, User, Building, ArrowRight, Tag
} from 'lucide-react'

export default function Fees() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modeFilter, setModeFilter] = useState('all')
  const [selectedReceipt, setSelectedReceipt] = useState(null)
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)
  const [expandedYears, setExpandedYears] = useState({})

  useEffect(() => {
    studentAPI.fees()
      .then(r => {
        setData(r.data)
        // Expand all years by default
        const exp = {}
        ;(r.data?.academic_years || []).forEach(ay => {
          exp[ay.session] = true
        })
        setExpandedYears(exp)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const toggleYear = (session) => {
    setExpandedYears(prev => ({
      ...prev,
      [session]: !prev[session]
    }))
  }

  const openReceipt = async (receiptId, fallbackInst) => {
    try {
      const token = localStorage.getItem('access_token')
      const res = await axios.get(`/api/fees/receipt/${receiptId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSelectedReceipt(res.data)
      setReceiptModalOpen(true)
    } catch {
      // Fallback formatting from available student & installment data
      const student = data?.student_profile || {}
      setSelectedReceipt({
        college_info: {
          name: "AKLANK GIRLS P.G. COLLEGE",
          tagline: "Quality Education & Self-Reliance (Est. 1998)",
          address: "Basant Vihar, Kota (Rajasthan) - 324009",
          affiliation: "Affiliated to University of Kota (UOK) | Govt. of Rajasthan Recognized",
          contact: "0744-2405620 | info@aklankcollege.ac.in"
        },
        receipt_info: {
          receipt_no: fallbackInst?.receipt_no || receiptId,
          voucher_no: fallbackInst?.voucher_no || receiptId,
          date: fallbackInst?.date_formatted || fallbackInst?.payment_date || new Date().toLocaleDateString(),
          session: fallbackInst?.session || "2024-25",
          payment_mode: fallbackInst?.payment_mode || "CASH",
          transaction_id: fallbackInst?.transaction_id || "-",
          collected_by: "Office Cashier"
        },
        student_info: {
          student_name: student.name || "Student",
          father_name: student.father_name || "-",
          scholar_no: student.scholar_no || student.roll_number || "-",
          reg_no: student.reg_no || "-",
          class_name: student.class_name || "-",
          course: student.course || student.department || "-"
        },
        fee_breakdown: {
          paid_amount: fallbackInst?.amount || 0,
          discount_amount: fallbackInst?.discount || 0,
          net_total: fallbackInst?.amount || 0
        },
        remarks: fallbackInst?.remarks || "Official Fee Receipt - Thank you!"
      })
      setReceiptModalOpen(true)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-600 border-t-transparent shadow-md" />
        <p className="text-sm font-semibold text-gray-500 animate-pulse">Loading Multi-Year Fee History...</p>
      </div>
    )
  }

  const academicYears = data?.academic_years || []
  const student = data?.student_profile || {}
  const totalFee = data?.total_amount || 0
  const totalPaid = data?.paid_amount || 0
  const totalDiscount = data?.discount_amount || 0
  const totalPending = data?.pending_amount || 0
  const progressPct = data?.payment_progress || (totalFee > 0 ? Math.round((totalPaid / totalFee) * 100) : 0)

  return (
    <div className="space-y-6 animate-page pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-primary-900 via-primary-800 to-indigo-900 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-white/10 text-white rounded-full text-xs font-semibold backdrop-blur-md flex items-center gap-1.5 border border-white/10">
              <CreditCard className="w-3.5 h-3.5" />
              Student Fee Account
            </span>
            <span className="px-3 py-1 bg-emerald-400/20 text-emerald-300 rounded-full text-xs font-semibold border border-emerald-400/30">
              Scholar #{student.scholar_no || student.roll_number || 'N/A'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white pt-1">
            Fee & Installment Timeline
          </h1>
          <p className="text-xs sm:text-sm text-primary-200">
            {student.name} · {student.class_name} · Department of {student.department || student.course || 'General'}
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-right">
            <p className="text-[11px] text-primary-200 uppercase font-semibold">Total Completion</p>
            <p className="text-xl font-black text-emerald-300">{progressPct}%</p>
          </div>
        </div>
      </div>

      {/* Warning Notice if pending dues exist */}
      {totalPending > 0 && (
        <div className="alert-warning flex items-start gap-3 p-4 rounded-2xl border border-amber-300/40 dark:border-amber-700/40">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-900 dark:text-amber-300 text-sm">
              Outstanding Balance Notice: ₹{totalPending.toLocaleString()}
            </p>
            <p className="text-xs text-amber-800 dark:text-amber-400 mt-0.5">
              Please clear pending installment balance before term-end examinations. You can download official stamped receipts for all completed payments below.
            </p>
          </div>
        </div>
      )}

      {/* 4 Financial Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Course Fee */}
        <div className="card p-4 rounded-3xl border border-gray-100 dark:border-gray-800 space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Course Fee</p>
            <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
            ₹{totalFee.toLocaleString()}
          </p>
          <p className="text-[11px] text-gray-400 font-medium">All Academic Sessions</p>
        </div>

        {/* Card 2: Total Amount Paid */}
        <div className="card p-4 rounded-3xl border border-gray-100 dark:border-gray-800 space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Paid</p>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
            ₹{totalPaid.toLocaleString()}
          </p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
            {progressPct}% Cleared
          </p>
        </div>

        {/* Card 3: Total Concession / Discount */}
        <div className="card p-4 rounded-3xl border border-gray-100 dark:border-gray-800 space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Concession / Discount</p>
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">
            ₹{totalDiscount.toLocaleString()}
          </p>
          <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Approved Concession</p>
        </div>

        {/* Card 4: Pending Dues */}
        <div className="card p-4 rounded-3xl border border-gray-100 dark:border-gray-800 space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pending Dues</p>
            <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400">
            ₹{totalPending.toLocaleString()}
          </p>
          <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
            {totalPending <= 0 ? 'Fully Paid' : 'Outstanding Balance'}
          </p>
        </div>
      </div>

      {/* Search & Mode Filters Toolbar */}
      <div className="card p-4 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary-700" />
          <h3 className="font-bold text-gray-900 dark:text-white text-sm">
            Multi-Year Academic Fee Breakdown
          </h3>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search voucher or receipt #"
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 text-xs dark:bg-gray-800"
            />
          </div>
          <select
            value={modeFilter}
            onChange={e => setModeFilter(e.target.value)}
            className="py-1.5 px-3 rounded-xl border border-gray-300 dark:border-gray-600 text-xs dark:bg-gray-800 font-semibold"
          >
            <option value="all">All Payment Modes</option>
            <option value="CASH">CASH Only</option>
            <option value="NEFT">NEFT / Bank</option>
            <option value="CHEQUE">CHEQUE</option>
            <option value="ONLINE">ONLINE</option>
          </select>
        </div>
      </div>

      {/* Multi-Year Fee Cards & Installment Timelines */}
      <div className="space-y-4">
        {academicYears.map((ay, yearIdx) => {
          const isExpanded = expandedYears[ay.session] !== false
          const filteredInstallments = (ay.installments || []).filter(inst => {
            const matchSearch = !search ||
              inst.receipt_no?.toLowerCase().includes(search.toLowerCase()) ||
              inst.voucher_no?.toLowerCase().includes(search.toLowerCase()) ||
              inst.remarks?.toLowerCase().includes(search.toLowerCase())

            const matchMode = modeFilter === 'all' ||
              (inst.payment_mode && inst.payment_mode.toUpperCase() === modeFilter.toUpperCase())

            return matchSearch && matchMode
          })

          const statusBadgeColor =
            ay.status === 'PAID' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' :
            ay.status === 'PARTIAL' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
            'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'

          return (
            <div
              key={ay.session || yearIdx}
              className="card rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-md transition"
            >
              {/* Year Card Header / Accordion Toggle */}
              <div
                onClick={() => toggleYear(ay.session)}
                className="p-5 sm:p-6 bg-gray-50/70 dark:bg-gray-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none border-b border-gray-100 dark:border-gray-800/80 hover:bg-gray-100/60 dark:hover:bg-gray-800 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 flex items-center justify-center flex-shrink-0 font-black text-base">
                    Y{yearIdx + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-black text-base sm:text-lg text-gray-900 dark:text-white">
                        {ay.year_title}
                      </h2>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${statusBadgeColor}`}>
                        {ay.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Class: <span className="font-semibold text-gray-700 dark:text-gray-200">{ay.class_name}</span> · Session {ay.session}
                    </p>
                  </div>
                </div>

                {/* Financial Summary per Year */}
                <div className="flex items-center justify-between md:justify-end gap-4 sm:gap-6">
                  <div className="text-left md:text-right">
                    <p className="text-[11px] text-gray-400 uppercase font-semibold">Yearly Fee</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      ₹{ay.total_fee?.toLocaleString()}
                    </p>
                  </div>

                  <div className="text-left md:text-right">
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 uppercase font-semibold">Paid</p>
                    <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                      ₹{ay.paid_amount?.toLocaleString()}
                    </p>
                  </div>

                  {ay.discount_amount > 0 && (
                    <div className="text-left md:text-right">
                      <p className="text-[11px] text-amber-600 uppercase font-semibold">Discount</p>
                      <p className="text-sm font-bold text-amber-600">
                        ₹{ay.discount_amount?.toLocaleString()}
                      </p>
                    </div>
                  )}

                  <div className="text-left md:text-right">
                    <p className="text-[11px] text-rose-500 uppercase font-semibold">Pending</p>
                    <p className="text-sm font-bold text-rose-600 dark:text-rose-400">
                      ₹{ay.pending_amount?.toLocaleString()}
                    </p>
                  </div>

                  <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-700 shadow-sm flex items-center justify-center text-gray-500">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {/* Progress Bar for Academic Year */}
              <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5">
                <div
                  className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-full transition-all duration-500"
                  style={{ width: `${Math.min(100, ay.progress_percentage || 0)}%` }}
                />
              </div>

              {/* Installments Timeline Accordion Body */}
              {isExpanded && (
                <div className="p-5 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-gray-500">
                      Installment Payment Timeline ({filteredInstallments.length} Receipts Recorded)
                    </h3>
                  </div>

                  <div className="relative pl-6 sm:pl-8 border-l-2 border-primary-200 dark:border-primary-900/60 space-y-6 my-2">
                    {filteredInstallments.map((inst, instIdx) => (
                      <div key={inst.receipt_id || instIdx} className="relative group">
                        {/* Timeline Node Icon */}
                        <div className="absolute -left-[31px] sm:-left-[39px] top-1.5 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md ring-4 ring-white dark:ring-gray-900">
                          <CheckCircle className="w-3.5 h-3.5" />
                        </div>

                        {/* Installment Content Card */}
                        <div className="p-4 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-200/70 dark:border-gray-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-primary-400 transition">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-sm text-gray-900 dark:text-white">
                                Installment #{inst.installment_number || (instIdx + 1)}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-100 dark:bg-primary-900/40 text-primary-800 dark:text-primary-300">
                                Receipt #{inst.receipt_no}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                {inst.payment_mode}
                              </span>
                            </div>

                            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-gray-400" />
                              Payment Date: <span className="font-semibold text-gray-700 dark:text-gray-300">{inst.date_formatted || inst.payment_date}</span>
                            </p>
                            {inst.remarks && (
                              <p className="text-[11px] text-gray-400 italic">
                                {inst.remarks}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0">
                            <div className="text-left sm:text-right">
                              <p className="text-base font-black text-emerald-600 dark:text-emerald-400">
                                ₹{inst.amount?.toLocaleString()}
                              </p>
                              {inst.discount > 0 && (
                                <p className="text-[11px] text-amber-600 font-medium">
                                  Disc: ₹{inst.discount?.toLocaleString()}
                                </p>
                              )}
                            </div>

                            <button
                              onClick={() => openReceipt(inst.receipt_id, { ...inst, session: ay.session, class_name: ay.class_name })}
                              className="px-3 py-1.5 bg-primary-700 hover:bg-primary-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition active:scale-95 flex-shrink-0"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Receipt</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {!filteredInstallments.length && (
                      <p className="text-xs text-gray-400 italic py-2">
                        No installment receipts match the selected filters for this academic session.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {!academicYears.length && (
          <div className="card p-12 text-center text-gray-400 rounded-3xl">
            <CreditCard className="w-10 h-10 mx-auto text-gray-300 mb-2" />
            <p className="font-semibold">No fee records found for your account.</p>
            <p className="text-xs text-gray-400 mt-1">Please contact the administrative accounts office.</p>
          </div>
        )}
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
