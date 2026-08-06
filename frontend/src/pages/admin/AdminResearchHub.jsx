import React, { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { BookOpen, Award, DollarSign, Plus, FileText, CheckCircle } from 'lucide-react'

export default function AdminResearchHub() {
  const [stats, setStats] = useState(null)
  const [publications, setPublications] = useState([])
  const [loading, setLoading] = useState(true)

  const loadResearchData = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      const [statsRes, pubsRes] = await Promise.all([
        axios.get('/api/research/admin/dashboard', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/research/publications', { headers: { Authorization: `Bearer ${token}` } })
      ])

      setStats(statsRes.data)
      setPublications(pubsRes.data.publications || [])
    } catch {
      toast.error('Failed to load Research Management data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadResearchData()
  }, [])

  return (
    <div className="space-y-6 animate-page">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <BookOpen className="w-7 h-7 text-primary-700" /> Research & Innovation Management ERP Command Center
        </h1>
        <p className="page-subtitle">Track Faculty Research Publications, Patents, Grants & Citation Impact Index</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-4 border border-blue-100 dark:border-blue-900/40">
            <p className="text-xl font-black text-blue-700 dark:text-blue-300">{stats.total_publications}</p>
            <p className="text-xs font-semibold text-gray-500 uppercase">Journal Publications</p>
          </div>
          <div className="card p-4 border border-emerald-100 dark:border-emerald-900/40">
            <p className="text-xl font-black text-emerald-600">{stats.total_funded_projects}</p>
            <p className="text-xs font-semibold text-gray-500 uppercase">Funded Research Projects</p>
          </div>
          <div className="card p-4 border border-purple-100 dark:border-purple-900/40">
            <p className="text-xl font-black text-purple-600">₹{stats.total_grants_amount.toLocaleString('en-IN')}</p>
            <p className="text-xs font-semibold text-gray-500 uppercase">Total Grants Sanctioned</p>
          </div>
          <div className="card p-4 border border-amber-100 dark:border-amber-900/40">
            <p className="text-xl font-black text-amber-600">{stats.average_impact_factor}</p>
            <p className="text-xs font-semibold text-gray-500 uppercase">Avg Impact Factor</p>
          </div>
        </div>
      )}

      <div className="card p-5 space-y-4">
        <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary-600" /> Faculty Research Publications Directory
        </h3>

        <div className="table-container max-h-[400px] overflow-y-auto">
          <table className="table w-full text-left border-collapse">
            <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800 z-10 text-xs font-bold text-gray-700 dark:text-gray-300">
              <tr>
                <th className="p-3">Paper Title</th>
                <th className="p-3">Journal Name</th>
                <th className="p-3">Faculty Author</th>
                <th className="p-3">ISSN / DOI</th>
                <th className="p-3 text-center">Impact Factor</th>
                <th className="p-3 text-center">Year</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
              {publications.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="p-3 font-bold text-gray-900 dark:text-white">{p.title}</td>
                  <td className="p-3 text-purple-700 dark:text-purple-300 font-semibold">{p.journal_name}</td>
                  <td className="p-3 font-bold text-primary-700">{p.faculty_name}</td>
                  <td className="p-3 font-mono text-gray-500">{p.doi || p.issn_isbn}</td>
                  <td className="p-3 text-center font-mono font-bold text-emerald-600">{p.impact_factor}</td>
                  <td className="p-3 text-center text-gray-600 dark:text-gray-400">{p.year}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
