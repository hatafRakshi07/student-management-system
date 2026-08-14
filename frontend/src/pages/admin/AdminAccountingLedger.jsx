import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import {
  DollarSign, BookOpen, Plus, Search, Filter, RefreshCw,
  Building2, CreditCard, ArrowUpRight, Scale, CheckCircle2,
  AlertCircle, Trash2, Eye, Download, Users, Wallet, Layers, FileText, X
} from 'lucide-react'

export default function AdminAccountingLedger() {
  const [activeTab, setActiveTab] = useState('expenses') // 'expenses' | 'ledger' | 'accounts' | 'trial-balance'
  const [loading, setLoading] = useState(true)

  // Data States
  const [expensesData, setExpensesData] = useState({ expenses: [], category_breakdown: {}, total_expenses_amount: 0, total_paid: 0, total_pending: 0, salary_expenses_amount: 0 })
  const [accountsData, setAccountsData] = useState({ accounts: [], total_liquidity: 0 })
  const [ledgerData, setLedgerData] = useState({ chart_of_accounts: [], entries: [] })
  const [trialBalance, setTrialBalance] = useState(null)

  // Filter States
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [accountFilter, setAccountFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Modals
  const [expenseModalOpen, setExpenseModalOpen] = useState(false)
  const [accountModalOpen, setAccountModalOpen] = useState(false)
  const [detailModalItem, setDetailModalItem] = useState(null)

  // Expense Form State
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    category: 'Salary of Staff',
    amount: '',
    college_account_id: '',
    payee_name: '',
    payment_mode: 'ONLINE_TRANSFER',
    reference_no: '',
    description: '',
    expense_date: new Date().toISOString().split('T')[0],
    status: 'PAID'
  })

  // Account Form State
  const [accountForm, setAccountForm] = useState({
    account_name: '',
    account_number: '',
    bank_name: 'State Bank of India',
    branch_name: 'Main Campus Branch',
    ifsc_code: 'SBIN0004812',
    account_type: 'CURRENT',
    opening_balance: '100000'
  })

  const expenseCategories = [
    'ALL',
    'Salary of Staff',
    'Electricity & Utilities',
    'Maintenance',
    'Lab Equipment',
    'Library Books',
    'Campus Events',
    'IT & Software',
    'Printing & Stationery',
    'Transport',
    'Miscellaneous'
  ]

  const fetchAllData = async () => {
    setLoading(true)
    try {
      const queryParams = new URLSearchParams()
      if (searchTerm) queryParams.append('search', searchTerm)
      if (categoryFilter !== 'ALL') queryParams.append('category', categoryFilter)
      if (accountFilter !== 'ALL') queryParams.append('account_id', accountFilter)
      if (statusFilter !== 'ALL') queryParams.append('status', statusFilter)
      if (startDate) queryParams.append('start_date', startDate)
      if (endDate) queryParams.append('end_date', endDate)

      const [expRes, accRes, ledRes, tbRes] = await Promise.all([
        api.get(`/finance/college-expenses?${queryParams.toString()}`),
        api.get('/finance/college-accounts'),
        api.get('/finance/ledger-entries'),
        api.get('/finance/reports/trial-balance')
      ])

      setExpensesData(expRes.data)
      setAccountsData(accRes.data)
      setLedgerData(ledRes.data)
      setTrialBalance(tbRes.data)

      if (!expenseForm.college_account_id && accRes.data.accounts.length > 0) {
        setExpenseForm(prev => ({ ...prev, college_account_id: accRes.data.accounts[0].id }))
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to load Accounting & Ledger data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllData()
  }, [categoryFilter, accountFilter, statusFilter])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    fetchAllData()
  }

  const handleRecordExpense = async (e) => {
    e.preventDefault()
    try {
      const res = await api.post('/finance/college-expenses', {
        ...expenseForm,
        amount: parseFloat(expenseForm.amount),
        college_account_id: parseInt(expenseForm.college_account_id)
      })
      toast.success(res.data.message || 'College Expense Recorded Successfully!')
      setExpenseModalOpen(false)
      setExpenseForm({
        title: '',
        category: 'Salary of Staff',
        amount: '',
        college_account_id: accountsData.accounts[0]?.id || '',
        payee_name: '',
        payment_mode: 'ONLINE_TRANSFER',
        reference_no: '',
        description: '',
        expense_date: new Date().toISOString().split('T')[0],
        status: 'PAID'
      })
      fetchAllData()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to record expense')
    }
  }

  const handleCreateAccount = async (e) => {
    e.preventDefault()
    try {
      const res = await api.post('/finance/college-accounts', {
        ...accountForm,
        opening_balance: parseFloat(accountForm.opening_balance)
      })
      toast.success(res.data.message || 'College Account Created!')
      setAccountModalOpen(false)
      setAccountForm({
        account_name: '',
        account_number: '',
        bank_name: 'State Bank of India',
        branch_name: 'Main Campus Branch',
        ifsc_code: 'SBIN0004812',
        account_type: 'CURRENT',
        opening_balance: '100000'
      })
      fetchAllData()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create college account')
    }
  }

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense record? The account balance will be restored.')) return
    try {
      const res = await api.delete(`/finance/college-expenses/${id}`)
      toast.success(res.data.message || 'Expense deleted')
      fetchAllData()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete expense')
    }
  }

  const handleExportCSV = () => {
    if (!expensesData.expenses || expensesData.expenses.length === 0) {
      toast.error('No expense records available to export')
      return
    }

    const headers = ['Voucher No', 'Title', 'Category', 'Amount (INR)', 'Expense Date', 'Payment Mode', 'Reference No', 'Payee Name', 'College Account', 'Status']
    const rows = expensesData.expenses.map(e => [
      e.voucher_no,
      `"${e.title.replace(/"/g, '""')}"`,
      e.category,
      e.amount,
      e.expense_date,
      e.payment_mode,
      e.reference_no,
      `"${e.payee_name.replace(/"/g, '""')}"`,
      `"${e.account_name.replace(/"/g, '""')}"`,
      e.status
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `College_Expenses_Report_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('College Expenses CSV exported successfully!')
  }

  return (
    <div className="space-y-6 animate-page">
      {/* ── Header & Quick Actions ─────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2.5">
            <BookOpen className="w-8 h-8 text-purple-600 dark:text-purple-400" /> Accounting, Ledger & Expense ERP
          </h1>
          <p className="page-subtitle">
            Track all expenditures from college bank accounts, staff salaries, double-entry general ledger & liquidity
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setExpenseModalOpen(true)}
            className="btn-primary text-xs flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white border-none shadow-md"
          >
            <Plus className="w-4 h-4" /> Record College Expense
          </button>
          <button
            onClick={() => setAccountModalOpen(true)}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <Building2 className="w-4 h-4 text-emerald-600" /> Add College Account
          </button>
          <button
            onClick={handleExportCSV}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-blue-600" /> Export CSV
          </button>
        </div>
      </div>

      {/* ── Key Financial KPI Cards ───────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Bank Liquidity */}
        <div className="card p-4 relative overflow-hidden border-l-4 border-emerald-500 bg-gradient-to-br from-emerald-50/50 to-white dark:from-emerald-950/20 dark:to-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Total Bank Liquidity</p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                ₹{accountsData.total_liquidity.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </h3>
              <p className="text-[11px] text-gray-500 mt-1">Across {accountsData.count || 0} active college accounts</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shadow-inner">
              <Wallet className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Card 2: Total College Expenses */}
        <div className="card p-4 relative overflow-hidden border-l-4 border-rose-500 bg-gradient-to-br from-rose-50/50 to-white dark:from-rose-950/20 dark:to-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">Total College Expenses</p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                ₹{expensesData.total_expenses_amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </h3>
              <p className="text-[11px] text-gray-500 mt-1">Disbursed for operational requirements</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold shadow-inner">
              <ArrowUpRight className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Card 3: Staff & Faculty Salary Payroll */}
        <div className="card p-4 relative overflow-hidden border-l-4 border-indigo-500 bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">Staff & Faculty Salary</p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                ₹{expensesData.salary_expenses_amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </h3>
              <p className="text-[11px] text-gray-500 mt-1">Total payroll disbursed from college account</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shadow-inner">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Card 4: Double-Entry Trial Balance */}
        <div className="card p-4 relative overflow-hidden border-l-4 border-purple-500 bg-gradient-to-br from-purple-50/50 to-white dark:from-purple-950/20 dark:to-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">Ledger Status</p>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-1 flex items-center gap-2">
                {trialBalance?.is_balanced ? (
                  <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-5 h-5" /> BALANCED</span>
                ) : (
                  <span className="text-amber-600 flex items-center gap-1"><AlertCircle className="w-5 h-5" /> RECONCILING</span>
                )}
              </h3>
              <p className="text-[11px] text-gray-500 mt-1">Double-Entry Ledger Audit Verified</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold shadow-inner">
              <Scale className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Tab Navigation Bar ──────────────────────────────────── */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('expenses')}
          className={`py-3 px-4 font-bold text-sm border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'expenses'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <CreditCard className="w-4 h-4" /> College Account Expenses ({expensesData.count || 0})
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`py-3 px-4 font-bold text-sm border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'ledger'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <BookOpen className="w-4 h-4" /> General Ledger & Cash Book
        </button>

        <button
          onClick={() => setActiveTab('accounts')}
          className={`py-3 px-4 font-bold text-sm border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'accounts'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Building2 className="w-4 h-4" /> College Bank Accounts ({accountsData.accounts?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('trial-balance')}
          className={`py-3 px-4 font-bold text-sm border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'trial-balance'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Scale className="w-4 h-4" /> Trial Balance Statement
        </button>
      </div>

      {/* ── TAB 1: COLLEGE ACCOUNT EXPENSES ─────────────────────────── */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="card p-4 space-y-3">
            <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              {/* Search input */}
              <div className="lg:col-span-2 relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search title, payee, voucher #, UTR..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 text-xs"
                />
              </div>

              {/* Category Filter */}
              <div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 text-xs font-medium"
                >
                  {expenseCategories.map((c) => (
                    <option key={c} value={c}>
                      {c === 'ALL' ? 'All Categories' : c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Account Filter */}
              <div>
                <select
                  value={accountFilter}
                  onChange={(e) => setAccountFilter(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 text-xs font-medium"
                >
                  <option value="ALL">All College Accounts</option>
                  {accountsData.accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.account_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 text-xs font-medium"
                >
                  <option value="ALL">All Status</option>
                  <option value="PAID">PAID</option>
                  <option value="PENDING">PENDING</option>
                </select>
              </div>

              {/* Submit & Reset */}
              <div className="flex items-center gap-1.5">
                <button type="submit" className="btn-primary py-2 px-3 text-xs w-full flex items-center justify-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Filter
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('')
                    setCategoryFilter('ALL')
                    setAccountFilter('ALL')
                    setStatusFilter('ALL')
                    setStartDate('')
                    setEndDate('')
                    fetchAllData()
                  }}
                  className="btn-secondary py-2 px-2 text-xs"
                  title="Reset Filters"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>

            {/* Category Quick Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pt-1 text-xs">
              <span className="font-bold text-gray-500 shrink-0">Popular Categories:</span>
              {['Salary of Staff', 'Electricity & Utilities', 'Lab Equipment', 'IT & Software', 'Library Books', 'Maintenance'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all ${
                    categoryFilter === cat
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {cat} {expensesData.category_breakdown[cat] ? `(₹${(expensesData.category_breakdown[cat]/1000).toFixed(0)}k)` : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Expenses Table */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600" /> College Account Expense Register
              </h3>
              <span className="text-xs font-semibold text-gray-500">
                Showing {expensesData.expenses.length} Expense Vouchers
              </span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-gray-500 font-medium">Loading college expenses...</div>
            ) : expensesData.expenses.length === 0 ? (
              <div className="p-8 text-center text-gray-500 font-medium">
                No expense records match the selected filter criteria.
              </div>
            ) : (
              <div className="table-container max-h-[500px] overflow-y-auto">
                <table className="table w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800 z-10 text-xs font-bold text-gray-700 dark:text-gray-300">
                    <tr>
                      <th className="p-3">Voucher # & Date</th>
                      <th className="p-3">Expense Title & Payee</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Disbursed Account</th>
                      <th className="p-3">Payment Mode & Ref</th>
                      <th className="p-3 text-right">Amount (₹)</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                    {expensesData.expenses.map((e) => (
                      <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="p-3 font-mono">
                          <p className="font-bold text-purple-600 dark:text-purple-400">{e.voucher_no}</p>
                          <p className="text-[11px] text-gray-500">{e.expense_date}</p>
                        </td>
                        <td className="p-3">
                          <p className="font-bold text-gray-900 dark:text-white line-clamp-1">{e.title}</p>
                          <p className="text-[11px] text-gray-500">Payee: <span className="font-semibold text-gray-700 dark:text-gray-300">{e.payee_name}</span></p>
                        </td>
                        <td className="p-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            e.category === 'Salary of Staff'
                              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                              : e.category === 'Electricity & Utilities'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                              : e.category === 'Lab Equipment'
                              ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300'
                              : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                          }`}>
                            {e.category}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-gray-700 dark:text-gray-300">
                          {e.account_name}
                        </td>
                        <td className="p-3">
                          <p className="font-semibold text-gray-900 dark:text-white">{e.payment_mode}</p>
                          <p className="text-[11px] font-mono text-gray-500">{e.reference_no || 'N/A'}</p>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400 text-sm">
                          ₹{e.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`badge ${e.status === 'PAID' ? 'badge-green' : 'badge-amber'}`}>
                            {e.status}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setDetailModalItem(e)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30"
                              title="View Voucher Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteExpense(e.id)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                              title="Delete Expense"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: GENERAL LEDGER & CASH BOOK ───────────────────────── */}
      {activeTab === 'ledger' && (
        <div className="space-y-6">
          {/* Chart of Accounts Summary */}
          <div className="card p-5 space-y-4">
            <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" /> Official Chart of Accounts
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ledgerData.chart_of_accounts.map((acc) => (
                <div key={acc.id} className="p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-purple-600 dark:text-purple-400">{acc.code}</span>
                    <span className="badge badge-purple text-[10px]">{acc.type}</span>
                  </div>
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white">{acc.name}</h4>
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-gray-500">Current Balance:</span>
                    <span className="font-mono font-bold text-gray-900 dark:text-white">
                      ₹{acc.current_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* General Ledger Journal Line Items Table */}
          <div className="card p-5 space-y-4">
            <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-purple-600" /> General Ledger Journal Line Items
            </h3>
            <div className="table-container max-h-[400px] overflow-y-auto">
              <table className="table w-full text-left border-collapse">
                <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800 z-10 text-xs font-bold text-gray-700 dark:text-gray-300">
                  <tr>
                    <th className="p-3">Voucher #</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Account Code & Name</th>
                    <th className="p-3">Narration Description</th>
                    <th className="p-3 text-right">Debit (Dr) ₹</th>
                    <th className="p-3 text-right">Credit (Cr) ₹</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                  {ledgerData.entries.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="p-3 font-mono font-bold text-purple-600">{item.voucher_no}</td>
                      <td className="p-3 text-gray-500">{item.entry_date}</td>
                      <td className="p-3">
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 mr-2">[{item.account_code}]</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{item.account_name}</span>
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">{item.narration}</td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-600">
                        {item.debit > 0 ? `₹${item.debit.toLocaleString('en-IN')}` : '-'}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-blue-600">
                        {item.credit > 0 ? `₹${item.credit.toLocaleString('en-IN')}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: COLLEGE BANK ACCOUNTS ────────────────────────────── */}
      {activeTab === 'accounts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-600" /> College Operational Bank & Cash Accounts
            </h3>
            <button
              onClick={() => setAccountModalOpen(true)}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add College Account
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {accountsData.accounts.map((acc) => (
              <div key={acc.id} className="card p-5 space-y-4 border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 flex items-center justify-center font-bold">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <span className={`badge ${acc.is_active ? 'badge-green' : 'badge-red'}`}>
                    {acc.account_type}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-base text-gray-900 dark:text-white">{acc.account_name}</h4>
                  <p className="text-xs text-gray-500">{acc.bank_name} • {acc.branch_name}</p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800/60 p-3 rounded-xl space-y-1 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">A/C No:</span>
                    <span className="font-bold text-gray-900 dark:text-white">{acc.account_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">IFSC Code:</span>
                    <span className="font-bold text-gray-900 dark:text-white">{acc.ifsc_code}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase">Available Liquidity</span>
                  <span className="font-mono text-lg font-black text-emerald-600 dark:text-emerald-400">
                    ₹{acc.current_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 4: TRIAL BALANCE STATEMENT ──────────────────────────── */}
      {activeTab === 'trial-balance' && trialBalance && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Scale className="w-4 h-4 text-purple-600" /> Official Double-Entry Trial Balance Statement
            </h3>
            <span className={`badge ${trialBalance.is_balanced ? 'badge-green' : 'badge-red'}`}>
              {trialBalance.is_balanced ? 'DOUBLE-ENTRY BALANCED' : 'UNBALANCED'}
            </span>
          </div>

          <div className="table-container max-h-[450px] overflow-y-auto">
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
                    <td className="p-3 font-mono font-bold text-purple-600">{a.code}</td>
                    <td className="p-3 font-bold text-gray-900 dark:text-white">{a.name}</td>
                    <td className="p-3 text-purple-700 dark:text-purple-300 font-semibold">{a.type}</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-600">
                      ₹{a.debit.toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-blue-600">
                      ₹{a.credit.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100 dark:bg-gray-800 font-bold text-xs">
                <tr>
                  <td colSpan={3} className="p-3 text-right uppercase">Total Trial Balance:</td>
                  <td className="p-3 text-right font-mono text-emerald-600 font-extrabold text-sm">
                    ₹{trialBalance.total_debit.toLocaleString('en-IN')}
                  </td>
                  <td className="p-3 text-right font-mono text-blue-600 font-extrabold text-sm">
                    ₹{trialBalance.total_credit.toLocaleString('en-IN')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL 1: RECORD COLLEGE EXPENSE ───────────────────────────── */}
      {expenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-purple-600" /> Record College Account Expenditure
              </h3>
              <button onClick={() => setExpenseModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordExpense} className="space-y-3 text-xs">
              {/* Title */}
              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Expense Title / Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Faculty & Staff Monthly Payroll (August 2026)"
                  value={expenseForm.title}
                  onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800"
                />
              </div>

              {/* Category & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Expense Category *</label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 font-semibold"
                  >
                    {expenseCategories.filter(c => c !== 'ALL').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 485000"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Disbursed Account */}
              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Disbursed College Bank/Cash Account *</label>
                <select
                  required
                  value={expenseForm.college_account_id}
                  onChange={(e) => setExpenseForm({ ...expenseForm, college_account_id: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 font-semibold"
                >
                  {accountsData.accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.account_name} (Avail: ₹{a.current_balance.toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
              </div>

              {/* Payee Name & Payment Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Payee / Staff / Vendor *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Staff Payroll / JVVNL Power Corp"
                    value={expenseForm.payee_name}
                    onChange={(e) => setExpenseForm({ ...expenseForm, payee_name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Payment Mode</label>
                  <select
                    value={expenseForm.payment_mode}
                    onChange={(e) => setExpenseForm({ ...expenseForm, payment_mode: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800"
                  >
                    <option value="ONLINE_TRANSFER">ONLINE_TRANSFER (NEFT/RTGS)</option>
                    <option value="CHEQUE">CHEQUE</option>
                    <option value="CASH">CASH</option>
                    <option value="UPI">UPI</option>
                    <option value="DD">DEMAND DRAFT</option>
                  </select>
                </div>
              </div>

              {/* Reference No & Expense Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Reference / UTR / Cheque No</label>
                  <input
                    type="text"
                    placeholder="e.g. UTR99812048 / CHQ-102"
                    value={expenseForm.reference_no}
                    onChange={(e) => setExpenseForm({ ...expenseForm, reference_no: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Expense Date</label>
                  <input
                    type="date"
                    value={expenseForm.expense_date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Detailed Remarks / Narration</label>
                <textarea
                  rows={2}
                  placeholder="Enter additional expense audit details..."
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setExpenseModalOpen(false)} className="btn-secondary py-2.5 px-4 text-xs">
                  Cancel
                </button>
                <button type="submit" className="btn-primary py-2.5 px-5 text-xs bg-purple-600 hover:bg-purple-700 text-white border-none">
                  Record Expense & Post Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: ADD COLLEGE ACCOUNT ──────────────────────────────── */}
      {accountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-600" /> Create New College Bank Account
              </h3>
              <button onClick={() => setAccountModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Account Display Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SBI Main Operating Account"
                  value={accountForm.account_name}
                  onChange={(e) => setAccountForm({ ...accountForm, account_name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Account Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 38920194812"
                    value={accountForm.account_number}
                    onChange={(e) => setAccountForm({ ...accountForm, account_number: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Bank Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="State Bank of India"
                    value={accountForm.bank_name}
                    onChange={(e) => setAccountForm({ ...accountForm, bank_name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Branch Name</label>
                  <input
                    type="text"
                    placeholder="Main Campus Branch"
                    value={accountForm.branch_name}
                    onChange={(e) => setAccountForm({ ...accountForm, branch_name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">IFSC Code</label>
                  <input
                    type="text"
                    placeholder="SBIN0004812"
                    value={accountForm.ifsc_code}
                    onChange={(e) => setAccountForm({ ...accountForm, ifsc_code: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Account Type</label>
                  <select
                    value={accountForm.account_type}
                    onChange={(e) => setAccountForm({ ...accountForm, account_type: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800"
                  >
                    <option value="CURRENT">CURRENT</option>
                    <option value="SAVINGS">SAVINGS</option>
                    <option value="PETTY_CASH">PETTY_CASH</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Opening Balance (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="100000"
                    value={accountForm.opening_balance}
                    onChange={(e) => setAccountForm({ ...accountForm, opening_balance: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setAccountModalOpen(false)} className="btn-secondary py-2.5 px-4 text-xs">
                  Cancel
                </button>
                <button type="submit" className="btn-primary py-2.5 px-5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white border-none">
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: EXPENSE DETAIL VOUCHER VIEWER ───────────────────── */}
      {detailModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-800 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-3">
              <div>
                <span className="badge badge-purple text-[10px]">COLLEGE EXPENSE VOUCHER</span>
                <h3 className="font-bold text-base text-gray-900 dark:text-white mt-1">{detailModalItem.voucher_no}</h3>
              </div>
              <button onClick={() => setDetailModalItem(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-gray-500 font-medium">Disbursed Expense Amount</p>
                  <h4 className="text-xl font-black text-purple-700 dark:text-purple-300 font-mono">
                    ₹{detailModalItem.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </h4>
                </div>
                <span className={`badge ${detailModalItem.status === 'PAID' ? 'badge-green' : 'badge-amber'}`}>
                  {detailModalItem.status}
                </span>
              </div>

              <div className="space-y-2 divide-y divide-gray-100 dark:divide-gray-800">
                <div className="pt-2 flex justify-between">
                  <span className="text-gray-500 font-semibold">Expense Title:</span>
                  <span className="font-bold text-gray-900 dark:text-white text-right max-w-[200px]">{detailModalItem.title}</span>
                </div>

                <div className="pt-2 flex justify-between">
                  <span className="text-gray-500 font-semibold">Category:</span>
                  <span className="font-bold text-purple-600">{detailModalItem.category}</span>
                </div>

                <div className="pt-2 flex justify-between">
                  <span className="text-gray-500 font-semibold">Payee / Staff Member:</span>
                  <span className="font-bold text-gray-900 dark:text-white">{detailModalItem.payee_name}</span>
                </div>

                <div className="pt-2 flex justify-between">
                  <span className="text-gray-500 font-semibold">Source Account:</span>
                  <span className="font-bold text-gray-900 dark:text-white">{detailModalItem.account_name}</span>
                </div>

                <div className="pt-2 flex justify-between">
                  <span className="text-gray-500 font-semibold">Payment Mode & Ref:</span>
                  <span className="font-mono text-gray-700 dark:text-gray-300">{detailModalItem.payment_mode} ({detailModalItem.reference_no || 'N/A'})</span>
                </div>

                <div className="pt-2 flex justify-between">
                  <span className="text-gray-500 font-semibold">Expense Date:</span>
                  <span className="font-mono text-gray-700 dark:text-gray-300">{detailModalItem.expense_date}</span>
                </div>

                <div className="pt-2 flex justify-between">
                  <span className="text-gray-500 font-semibold">Authorized By:</span>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{detailModalItem.created_by}</span>
                </div>

                {detailModalItem.description && (
                  <div className="pt-2">
                    <span className="text-gray-500 font-semibold block mb-1">Audit Remarks:</span>
                    <p className="p-2 bg-gray-50 dark:bg-gray-800 rounded-xl text-gray-700 dark:text-gray-300 italic">
                      "{detailModalItem.description}"
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-gray-200 dark:border-gray-800 flex justify-end">
              <button onClick={() => setDetailModalItem(null)} className="btn-secondary py-2 px-4 text-xs">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
