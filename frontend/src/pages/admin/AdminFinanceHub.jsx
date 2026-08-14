import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { DollarSign, BookOpen, Plus, FileText, CheckCircle, Scale, Download, ArrowRight } from 'lucide-react'

export default function AdminFinanceHub() {
  const [trialBalance, setTrialBalance] = useState(null)
  const [cashBook, setCashBook] = useState(null)
  const [loading, setLoading] = useState(true)

  // Voucher Posting Modal State
  const [voucherModalOpen, setVoucherModalOpen] = useState(false)
  const [narration, setNarration] = useState('Student Fee Receipt Collection')
  const [amount, setAmount] = useState('15000')

  const loadFinanceData = async () => {
    setLoading(true)
    try {
      const [tbRes, cbRes] = await Promise.all([
        api.get('/finance/reports/trial-balance'),
        api.get('/finance/reports/cash-book')
      ])

      setTrialBalance(tbRes.data)
      setCashBook(cbRes.data)
    } catch {
      toast.error('Failed to load Finance & Accounts ERP data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFinanceData()
  }, [])

  const handlePostVoucher = async (e) => {
    e.preventDefault()
    try {
      const amt = parseFloat(amount)
      const res = await api.post('/finance/journal-entry', {
        narration: narration,
        line_items: [
          { ledger_id: 1, debit: amt, credit: 0 },
          { ledger_id: 3, debit: 0, credit: amt }
        ]
      })

      toast.success(res.data.message || 'Double-entry voucher posted successfully!')
      setVoucherModalOpen(false)
      loadFinanceData()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to post voucher')
    }
  }

  return (
    <div className="space-y-6 animate-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-emerald-600" /> Finance & Accounting ERP Command Center
          </h1>
          <p className="page-subtitle">Double-Entry Bookkeeping, General Ledger, Cash Book & Trial Balance Generator</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/admin/accounting" className="btn-secondary text-xs flex items-center gap-1.5 bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 font-bold border-purple-200">
            <BookOpen className="w-4 h-4 text-purple-600" /> Accounting & Expenses Hub <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <button onClick={() => setVoucherModalOpen(true)} className="btn-primary text-xs flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Post Double-Entry Voucher
          </button>
        </div>
      </div>

      {/* Trial Balance Section */}
      {trialBalance && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Scale className="w-4 h-4 text-primary-600" /> Official Trial Balance Ledger
            </h3>
            <span className={`badge ${trialBalance.is_balanced ? 'badge-green' : 'badge-red'}`}>
              {trialBalance.is_balanced ? 'DOUBLE-ENTRY BALANCED' : 'UNBALANCED'}
            </span>
          </div>

          <div className="table-container max-h-[350px] overflow-y-auto">
            <table className="table w-full text-left border-collapse">
              <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800 z-10 text-xs font-bold text-gray-700 dark:text-gray-300">
                <tr>
                  <th className="p-3">Account Code</th>
                  <th className="p-3">Ledger Account Name</th>
                  <th className="p-3">Account Type</th>
                  <th className="p-3 text-right">Debit (Dr) ₹</th>
                  <th className="p-3 text-right">Credit (Cr) ₹</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                {trialBalance.accounts.map((a, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="p-3 font-mono font-bold text-primary-700">{a.code}</td>
                    <td className="p-3 font-bold text-gray-900 dark:text-white">{a.name}</td>
                    <td className="p-3 text-purple-700 dark:text-purple-300 font-semibold">{a.type}</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-600">₹{a.debit.toLocaleString('en-IN')}</td>
                    <td className="p-3 text-right font-mono font-bold text-blue-600">₹{a.credit.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cash Book Section */}
      {cashBook && (
        <div className="card p-5 space-y-4">
          <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-600" /> Cash Book Vouchers Register
          </h3>

          <div className="table-container max-h-[300px] overflow-y-auto">
            <table className="table w-full text-left border-collapse">
              <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800 z-10 text-xs font-bold text-gray-700 dark:text-gray-300">
                <tr>
                  <th className="p-3">Voucher #</th>
                  <th className="p-3">Posting Date</th>
                  <th className="p-3">Narration Description</th>
                  <th className="p-3 text-right">Amount ₹</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                {cashBook.vouchers.map((v, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="p-3 font-mono font-bold text-primary-700">{v.voucher_no}</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">{v.date}</td>
                    <td className="p-3 text-gray-900 dark:text-white font-semibold">{v.narration}</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-600">₹{v.amount.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Voucher Posting Modal */}
      {voucherModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700 space-y-4">
            <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-600" /> Post Double-Entry Journal Voucher
            </h3>
            <form onSubmit={handlePostVoucher} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Narration Description</label>
                <input type="text" required value={narration} onChange={e => setNarration(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-800" />
              </div>
              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Amount ₹</label>
                <input type="number" required value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-800" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setVoucherModalOpen(false)} className="btn-secondary py-2 px-4 text-xs">Cancel</button>
                <button type="submit" className="btn-primary py-2 px-4 text-xs">Post Voucher</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
