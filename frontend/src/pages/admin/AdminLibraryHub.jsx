import React, { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { BookOpen, Search, Plus, CheckCircle, Clock, DollarSign, Download, AlertTriangle, QrCode } from 'lucide-react'

export default function AdminLibraryHub() {
  const [stats, setStats] = useState(null)
  const [books, setBooks] = useState([])
  const [issues, setIssues] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  // Book Issue Modal State
  const [issueModalOpen, setIssueModalOpen] = useState(false)
  const [selectedBookId, setSelectedBookId] = useState(1)
  const [targetUserId, setTargetUserId] = useState(535)

  const loadData = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      const [statsRes, booksRes, issueRes] = await Promise.all([
        axios.get('/api/library/admin/dashboard', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/library/books', { params: { search }, headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/library/reports/issue-register', { headers: { Authorization: `Bearer ${token}` } })
      ])

      setStats(statsRes.data)
      setBooks(booksRes.data.books || [])
      setIssues(issueRes.data.records || [])
    } catch {
      toast.error('Failed to load Library Management data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    loadData()
  }

  const handleIssueBook = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('access_token')
      const res = await axios.post('/api/library/issue', {
        book_id: Number(selectedBookId),
        user_id: Number(targetUserId)
      }, { headers: { Authorization: `Bearer ${token}` } })

      toast.success(res.data.message || 'Book issued successfully!')
      setIssueModalOpen(false)
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not issue book')
    }
  }

  const handleReturnBook = async (txnId) => {
    try {
      const token = localStorage.getItem('access_token')
      const res = await axios.post(`/api/library/return/${txnId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success(res.data.message || 'Book returned successfully!')
      loadData()
    } catch {
      toast.error('Failed to process book return')
    }
  }

  const exportCSV = () => {
    let csv = "data:text/csv;charset=utf-8,Accession No,ISBN,Title,Author,Subject,Available Copies,Status\n"
    books.forEach(b => {
      csv += `"${b.accession_no}","${b.isbn}","${b.title}","${b.author}","${b.subject}","${b.available_copies}","${b.status}"\n`
    })
    const link = document.createElement("a")
    link.setAttribute("href", encodeURI(csv))
    link.setAttribute("download", `library_book_catalog.csv`)
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
            <BookOpen className="w-7 h-7 text-primary-700" /> Library Management System Command Center
          </h1>
          <p className="page-subtitle">Manage Book Catalog, Inventory, Book Issue & Return Engine, Overdue Fines & Member Portals</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="btn-secondary text-xs flex items-center gap-1.5">
            <Download className="w-4 h-4" /> Export Catalog CSV
          </button>
          <button onClick={() => setIssueModalOpen(true)} className="btn-primary text-xs flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Issue Book to Member
          </button>
        </div>
      </div>

      {/* Gauges */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-4 border border-blue-100 dark:border-blue-900/40">
            <p className="text-xl font-black text-blue-700 dark:text-blue-300">{stats.total_books_copies || 0}</p>
            <p className="text-xs font-semibold text-gray-500 uppercase">Total Cataloged Books</p>
          </div>
          <div className="card p-4 border border-emerald-100 dark:border-emerald-900/40">
            <p className="text-xl font-black text-emerald-600">{stats.available_copies || 0}</p>
            <p className="text-xs font-semibold text-gray-500 uppercase">Available Copies on Shelf</p>
          </div>
          <div className="card p-4 border border-purple-100 dark:border-purple-900/40">
            <p className="text-xl font-black text-purple-600">{stats.currently_issued || 0}</p>
            <p className="text-xs font-semibold text-gray-500 uppercase">Currently Borrowed Books</p>
          </div>
          <div className="card p-4 border border-amber-100 dark:border-amber-900/40">
            <p className="text-xl font-black text-amber-600">{stats.overdue_count || 0}</p>
            <p className="text-xs font-semibold text-gray-500 uppercase">Overdue Books Warning</p>
          </div>
        </div>
      )}

      {/* Book Catalog Search & Table */}
      <div className="card p-5 space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search Title, Author, Accession No, Subject, Department..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-sm dark:bg-gray-800"
            />
          </div>
          <button type="submit" className="btn-primary py-2.5 px-5 text-xs flex items-center gap-2">
            <Search className="w-4 h-4" /> Search Library Catalog
          </button>
        </form>

        <div className="table-container max-h-[450px] overflow-y-auto">
          <table className="table w-full text-left border-collapse">
            <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800 z-10 text-xs font-bold text-gray-700 dark:text-gray-300">
              <tr>
                <th className="p-3">Accession No</th>
                <th className="p-3">Book Title & Subtitle</th>
                <th className="p-3">Author & Publisher</th>
                <th className="p-3">Subject / Dept</th>
                <th className="p-3 text-center">Available / Total</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
              {books.map(b => (
                <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="p-3 font-mono font-bold text-primary-700">{b.accession_no}</td>
                  <td className="p-3 font-bold text-gray-900 dark:text-white">{b.title}</td>
                  <td className="p-3 text-gray-700 dark:text-gray-300">{b.author} — <span className="text-gray-500 font-normal">{b.publisher}</span></td>
                  <td className="p-3 text-purple-700 dark:text-purple-300 font-semibold">{b.subject} ({b.department})</td>
                  <td className="p-3 text-center font-bold text-emerald-600">{b.available_copies} / {b.total_copies}</td>
                  <td className="p-3 text-center"><span className="badge badge-green">{b.status}</span></td>
                </tr>
              ))}
              {!books.length && (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-gray-400">No books found in library catalog.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Book Issue & Return Register */}
      <div className="card p-5 space-y-4">
        <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-600" /> Active Book Issues & Overdue Register
        </h3>

        <div className="table-container max-h-[400px] overflow-y-auto">
          <table className="table w-full text-left border-collapse">
            <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800 z-10 text-xs font-bold text-gray-700 dark:text-gray-300">
              <tr>
                <th className="p-3">Issue Txn #</th>
                <th className="p-3">Member Name</th>
                <th className="p-3">Book Title & Accession</th>
                <th className="p-3">Issue Date</th>
                <th className="p-3">Due Date</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
              {issues.map(i => (
                <tr key={i.txn_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="p-3 font-mono font-semibold text-primary-700">#{i.txn_id}</td>
                  <td className="p-3 font-bold text-gray-900 dark:text-white">{i.member_name} <span className="font-mono text-gray-400 font-normal">({i.member_code})</span></td>
                  <td className="p-3 text-gray-800 dark:text-gray-200 font-semibold">{i.book_title} <span className="font-mono text-purple-600">({i.accession_no})</span></td>
                  <td className="p-3 text-gray-600 dark:text-gray-400">{i.issue_date}</td>
                  <td className="p-3 font-bold text-amber-600">{i.due_date}</td>
                  <td className="p-3 text-center"><span className={`badge ${i.status === 'ISSUED' ? 'badge-blue' : 'badge-green'}`}>{i.status}</span></td>
                  <td className="p-3 text-center">
                    {i.status === 'ISSUED' && (
                      <button onClick={() => handleReturnBook(i.txn_id)} className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition">
                        Return Book
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Book Issue Modal */}
      {issueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700 space-y-4">
            <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary-700" /> Issue Book to Member
            </h3>
            <form onSubmit={handleIssueBook} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Select Book</label>
                <select value={selectedBookId} onChange={e => setSelectedBookId(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-800">
                  {books.map(b => (
                    <option key={b.id} value={b.id}>{b.title} ({b.accession_no}) — Copies: {b.available_copies}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Target Member User ID</label>
                <input type="number" value={targetUserId} onChange={e => setTargetUserId(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-800" />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIssueModalOpen(false)} className="btn-secondary py-2 px-4 text-xs">Cancel</button>
                <button type="submit" className="btn-primary py-2 px-4 text-xs">Issue Book</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
