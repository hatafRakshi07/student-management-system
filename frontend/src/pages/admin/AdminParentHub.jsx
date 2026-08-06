import React, { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Users, Search, Link, CheckCircle, XCircle, Clock, Calendar, Mail, Phone } from 'lucide-react'

export default function AdminParentHub() {
  const [parents, setParents] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const loadParents = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      const res = await axios.get('/api/parent/admin/directory', {
        params: { search },
        headers: { Authorization: `Bearer ${token}` }
      })
      setParents(res.data.parents || [])
    } catch {
      toast.error('Failed to load parent directory')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadParents()
  }, [])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    loadParents()
  }

  return (
    <div className="space-y-6 animate-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Users className="w-7 h-7 text-primary-700" /> Parent Portal & Directory Command Center
          </h1>
          <p className="page-subtitle">Manage Registered Parent Accounts, Student Mappings, PTM Approvals & Parent Engagement</p>
        </div>
      </div>

      {/* Search & Directory Table */}
      <div className="card p-5 space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search Parent Name, Email, Mobile..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-sm dark:bg-gray-800"
            />
          </div>
          <button type="submit" className="btn-primary py-2.5 px-5 text-xs flex items-center gap-2">
            <Search className="w-4 h-4" /> Search Parents
          </button>
        </form>

        <div className="table-container max-h-[500px] overflow-y-auto">
          <table className="table w-full text-left border-collapse">
            <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800 z-10 text-xs font-bold text-gray-700 dark:text-gray-300">
              <tr>
                <th className="p-3">Parent ID</th>
                <th className="p-3">Father / Guardian Name</th>
                <th className="p-3">Contact Email & Phone</th>
                <th className="p-3">Linked Children Count</th>
                <th className="p-3">Linked Student Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
              {parents.map(p => (
                <tr key={p.parent_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="p-3 font-mono font-bold text-primary-700">#{p.parent_id}</td>
                  <td className="p-3 font-bold text-gray-900 dark:text-white">{p.father_name}</td>
                  <td className="p-3 text-gray-600 dark:text-gray-400">
                    <p className="flex items-center gap-1"><Mail className="w-3 h-3" /> {p.email}</p>
                    <p className="flex items-center gap-1"><Phone className="w-3 h-3" /> {p.mobile}</p>
                  </td>
                  <td className="p-3"><span className="badge badge-purple">{p.linked_students_count} Children</span></td>
                  <td className="p-3 space-y-1">
                    {p.linked_children?.map(c => (
                      <span key={c.student_id} className="inline-block px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[11px] font-semibold mr-1">
                        {c.student_name} ({c.roll_number})
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
              {!parents.length && (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-gray-400">No parent records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
