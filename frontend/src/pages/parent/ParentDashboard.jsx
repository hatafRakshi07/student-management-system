import React, { useState, useEffect } from 'react'
import api, { parentAPI, feeAPI, examAPI, attendanceAPI } from '../../services/api'
import toast from 'react-hot-toast'
import ReceiptModal from '../../components/fees/ReceiptModal'
import MarksheetModal from '../../components/exams/MarksheetModal'
import { Users, Calendar, DollarSign, Award, Bell, MessageSquare, AlertTriangle, CheckCircle, Clock, Plus, ChevronDown, Printer } from 'lucide-react'

export default function ParentDashboard() {
  const [data, setData] = useState(null)
  const [selectedStudentId, setSelectedStudentId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [attHistory, setAttHistory] = useState(null)

  // PTM Request Form Modal State
  const [ptmModalOpen, setPtmModalOpen] = useState(false)
  const [ptmDate, setPtmDate] = useState('')
  const [ptmTime, setPtmTime] = useState('10:00 AM - 11:00 AM')
  const [ptmPurpose, setPtmPurpose] = useState('Academic & Attendance Review')

  // Document Modals
  const [selectedReceipt, setSelectedReceipt] = useState(null)
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)
  
  const [selectedMarksheet, setSelectedMarksheet] = useState(null)
  const [marksheetModalOpen, setMarksheetModalOpen] = useState(false)

  const loadDashboard = async (studentId = null) => {
    setLoading(true)
    try {
      const targetId = studentId || selectedStudentId
      const res = await parentAPI.dashboard(targetId)
      setData(res.data)
      const sid = res.data.active_student?.student_id
      if (sid) {
        setSelectedStudentId(sid)
        attendanceAPI.studentHistory(sid).then(r => setAttHistory(r.data)).catch(() => {})
      }
    } catch {
      toast.error('Failed to load Parent Portal dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  const handleStudentSwitch = (stId) => {
    setSelectedStudentId(stId)
    loadDashboard(stId)
  }

  const handlePTMSubmit = async (e) => {
    e.preventDefault()
    try {
      const res = await parentAPI.requestPTM({
        student_id: selectedStudentId,
        requested_date: ptmDate,
        preferred_time: ptmTime,
        purpose: ptmPurpose
      })

      toast.success(res.data?.message || 'PTM Meeting Requested Successfully!')
      setPtmModalOpen(false)
      loadDashboard(selectedStudentId)
    } catch {
      toast.error('Failed to send PTM meeting request')
    }
  }

  const viewReceipt = async (receiptId) => {
    try {
      const res = await api.get(`/fees/receipt/${receiptId}`)
      setSelectedReceipt(res.data)
      setReceiptModalOpen(true)
    } catch {
      toast.error('Could not load printable fee receipt')
    }
  }

  const viewMarksheet = async () => {
    try {
      const res = await api.get(`/exams/marksheet/${selectedStudentId || 1}/1`)
      setSelectedMarksheet(res.data)
      setMarksheetModalOpen(true)
    } catch {
      toast.error('Could not load official marksheet')
    }
  }

  if (loading || !data) {
    return <div className="p-8 text-center text-gray-500 font-semibold animate-pulse">Loading Official Parent Portal Dashboard...</div>
  }

  const { parent_info, linked_children, active_student, attendance, fee_summary, result_summary, recent_notices, ptm_requests } = data

  return (
    <div className="space-y-6 animate-page">
      {/* Header Banner & Multi-Student Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-primary-900 to-primary-800 text-white p-6 rounded-3xl shadow-xl">
        <div>
          <span className="px-3 py-1 bg-amber-500/30 text-amber-300 border border-amber-400/40 rounded-full text-xs font-bold uppercase tracking-wider">
            Official Parent Monitoring Portal
          </span>
          <h1 className="text-2xl font-black mt-2">Welcome, {parent_info?.father_name || "Parent"}</h1>
          <p className="text-xs text-primary-200 mt-1">Monitoring Academic Progress & ERP Records for <span className="text-amber-300 font-bold">{active_student?.full_name}</span> ({active_student?.roll_number})</p>
        </div>

        {/* Multi-Student Switcher Dropdown */}
        {linked_children && linked_children.length > 1 && (
          <div className="flex items-center gap-2 bg-white/10 p-2 rounded-2xl border border-white/20">
            <Users className="w-4 h-4 text-amber-300" />
            <span className="text-xs font-bold">Select Child:</span>
            <select
              value={selectedStudentId}
              onChange={e => handleStudentSwitch(Number(e.target.value))}
              className="bg-primary-950 text-white text-xs font-bold py-1.5 px-3 rounded-xl border border-primary-700 outline-none"
            >
              {linked_children.map(c => (
                <option key={c.student_id} value={c.student_id}>
                  {c.student_name} ({c.course})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Low Attendance Alert Warning */}
      {attendance?.is_low_attendance && (
        <div className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
            <div>
              <h4 className="font-bold text-amber-900 text-sm">Low Attendance Warning Alert ({attendance.percentage}%)</h4>
              <p className="text-xs text-amber-700">Your child's attendance is below the required 75% university criteria. Please contact the class mentor or request a PTM.</p>
            </div>
          </div>
          <button onClick={() => setPtmModalOpen(true)} className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition">
            Request PTM Meeting
          </button>
        </div>
      )}

      {/* Key Metric Gauges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Attendance Gauge */}
        <div className="card p-5 border-l-4 border-emerald-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase">Attendance Gauge</span>
            <Calendar className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-3xl font-black text-emerald-600">{attendance?.percentage}%</p>
          <p className="text-xs text-gray-500 mt-1 font-medium">{attendance?.attended_lectures} / {attendance?.total_lectures} Lectures Attended</p>
        </div>

        {/* Pending Fee Gauge */}
        <div className="card p-5 border-l-4 border-red-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase">Pending Fee Due</span>
            <DollarSign className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-3xl font-black text-red-600">₹{fee_summary?.pending_fee?.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1 font-medium">Total Fee: ₹{fee_summary?.total_fee?.toLocaleString()} | Paid: ₹{fee_summary?.paid_fee?.toLocaleString()}</p>
        </div>

        {/* SGPA & Grade Badge */}
        <div className="card p-5 border-l-4 border-purple-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase">Academic SGPA</span>
            <Award className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-black text-purple-600">{result_summary?.sgpa}</p>
          <p className="text-xs text-purple-700 dark:text-purple-300 font-bold mt-1">{result_summary?.division}</p>
        </div>

        {/* PTM Status */}
        <div className="card p-5 border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase">PTM Meetings</span>
            <MessageSquare className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-black text-blue-600">{ptm_requests?.length || 0}</p>
          <button onClick={() => setPtmModalOpen(true)} className="text-xs text-blue-700 font-bold hover:underline mt-1 block">
            + Schedule PTM Request
          </button>
        </div>
      </div>

      {/* Main Grid: Fee Receipts Ledger & Exam Result Marksheet Access */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fee Receipts Vault */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
            <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" /> Fee Receipts Vault
            </h3>
            <span className="text-xs font-mono font-bold text-emerald-600">Paid: ₹{fee_summary?.paid_fee?.toLocaleString()}</span>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {fee_summary?.receipts?.map(r => (
              <div key={r.receipt_id} className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <p className="font-mono font-bold text-primary-700 dark:text-primary-400">{r.receipt_no}</p>
                  <p className="text-gray-500">{r.date} | Mode: {r.mode}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-black text-emerald-600">₹{r.amount?.toLocaleString()}</span>
                  <button onClick={() => viewReceipt(r.receipt_id)} className="p-1.5 bg-white dark:bg-gray-700 hover:bg-gray-200 rounded-lg text-gray-700 dark:text-gray-200 transition">
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {!fee_summary?.receipts?.length && (
              <p className="text-center py-8 text-xs text-gray-400">No payment receipts available.</p>
            )}
          </div>
        </div>

        {/* Exam Results & Marksheet */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
            <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-600" /> Official Marksheet Access
            </h3>
            <button onClick={viewMarksheet} className="px-3 py-1 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition">
              <Printer className="w-3.5 h-3.5" /> View Official Marksheet
            </button>
          </div>

          <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-2xl border border-purple-200 dark:border-purple-800 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400 font-semibold">Semester:</span>
              <span className="font-bold text-gray-900 dark:text-white">Semester {active_student?.semester}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400 font-semibold">Semester SGPA:</span>
              <span className="font-black text-purple-700 dark:text-purple-300">{result_summary?.sgpa}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400 font-semibold">Cumulative CGPA:</span>
              <span className="font-black text-purple-700 dark:text-purple-300">{result_summary?.cgpa}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400 font-semibold">Division Honor:</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-300">{result_summary?.division}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance History */}
      {attHistory && (
        <div className="card p-5">
          <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-primary-600" /> {active_student?.full_name}'s Attendance History
            <span className={`ml-auto px-2.5 py-1 rounded-full text-xs font-black ${
              attHistory.percentage >= 75 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            }`}>{attHistory.percentage}% ({attHistory.present}/{attHistory.total})</span>
          </h3>
          <div className="table-container max-h-64 overflow-y-auto">
            <table className="table w-full text-xs">
              <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold">
                <tr>
                  <th className="p-2">Date</th>
                  <th className="p-2">Day</th>
                  <th className="p-2">Subject</th>
                  <th className="p-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {attHistory.records?.slice(0, 45).map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="p-2 font-medium">{r.date}</td>
                    <td className="p-2 text-gray-500">{r.day}</td>
                    <td className="p-2 text-gray-500">{r.subject}</td>
                    <td className="p-2 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        r.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-700' :
                        r.status === 'LATE'    ? 'bg-yellow-100 text-yellow-700' :
                        r.status === 'LEAVE'   ? 'bg-blue-100 text-blue-700' :
                                                 'bg-red-100 text-red-700'
                      }`}>{r.status}</span>
                    </td>
                  </tr>
                ))}
                {!attHistory.records?.length && (
                  <tr><td colSpan={4} className="py-6 text-center text-gray-400">No attendance records found yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PTM Request Modal */}
      {ptmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700 space-y-4">
            <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-700" /> Request Parent-Teacher Meeting (PTM)
            </h3>
            <form onSubmit={handlePTMSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Preferred Date</label>
                <input
                  type="date"
                  required
                  value={ptmDate}
                  onChange={e => setPtmDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-800"
                />
              </div>
              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Preferred Time Slot</label>
                <select
                  value={ptmTime}
                  onChange={e => setPtmTime(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-800"
                >
                  <option value="10:00 AM - 11:00 AM">10:00 AM - 11:00 AM</option>
                  <option value="11:30 AM - 12:30 PM">11:30 AM - 12:30 PM</option>
                  <option value="02:00 PM - 03:00 PM">02:00 PM - 03:00 PM</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Meeting Purpose</label>
                <textarea
                  rows="3"
                  required
                  value={ptmPurpose}
                  onChange={e => setPtmPurpose(e.target.value)}
                  placeholder="Describe your meeting purpose..."
                  className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setPtmModalOpen(false)} className="btn-secondary py-2 px-4 text-xs">Cancel</button>
                <button type="submit" className="btn-primary py-2 px-4 text-xs">Submit PTM Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ReceiptModal open={receiptModalOpen} onClose={() => setReceiptModalOpen(false)} receiptData={selectedReceipt} />
      <MarksheetModal open={marksheetModalOpen} onClose={() => setMarksheetModalOpen(false)} marksheetData={selectedMarksheet} />
    </div>
  )
}
