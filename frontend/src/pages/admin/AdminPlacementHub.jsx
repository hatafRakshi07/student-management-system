import React, { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Briefcase, Building, Users, Award, Calendar, CheckCircle } from 'lucide-react'

export default function AdminPlacementHub() {
  const [stats, setStats] = useState(null)
  const [drives, setDrives] = useState([])
  const [loading, setLoading] = useState(true)

  const loadPlacementData = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      const [statsRes, drivesRes] = await Promise.all([
        axios.get('/api/placement/admin/dashboard', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/placement/drives', { headers: { Authorization: `Bearer ${token}` } })
      ])

      setStats(statsRes.data)
      setDrives(drivesRes.data.drives || [])
    } catch {
      toast.error('Failed to load Placement ERP data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPlacementData()
  }, [])

  return (
    <div className="space-y-6 animate-page">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <Briefcase className="w-7 h-7 text-primary-700" /> Alumni & Training Placement Cell ERP Command Center
        </h1>
        <p className="page-subtitle">Manage Corporate HR Contacts, Campus Recruitment Drives & Offer Letters</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-4 border border-blue-100 dark:border-blue-900/40">
            <p className="text-xl font-black text-blue-700 dark:text-blue-300">{stats.total_companies_visited}</p>
            <p className="text-xs font-semibold text-gray-500 uppercase">Partner Companies</p>
          </div>
          <div className="card p-4 border border-emerald-100 dark:border-emerald-900/40">
            <p className="text-xl font-black text-emerald-600">{stats.active_drives_count}</p>
            <p className="text-xs font-semibold text-gray-500 uppercase">Active Campus Drives</p>
          </div>
          <div className="card p-4 border border-purple-100 dark:border-purple-900/40">
            <p className="text-xl font-black text-purple-600">{stats.highest_package}</p>
            <p className="text-xs font-semibold text-gray-500 uppercase">Highest CTC Package</p>
          </div>
          <div className="card p-4 border border-amber-100 dark:border-amber-900/40">
            <p className="text-xl font-black text-amber-600">{stats.average_package}</p>
            <p className="text-xs font-semibold text-gray-500 uppercase">Average CTC Package</p>
          </div>
        </div>
      )}

      <div className="card p-5 space-y-4">
        <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <Building className="w-4 h-4 text-primary-600" /> Active Campus Recruitment Drives
        </h3>

        <div className="table-container max-h-[400px] overflow-y-auto">
          <table className="table w-full text-left border-collapse">
            <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800 z-10 text-xs font-bold text-gray-700 dark:text-gray-300">
              <tr>
                <th className="p-3">Drive Title</th>
                <th className="p-3">Company Name</th>
                <th className="p-3">Job Role</th>
                <th className="p-3">CTC Package</th>
                <th className="p-3">Drive Date</th>
                <th className="p-3 text-center">Eligibility CGPA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
              {drives.map(d => (
                <tr key={d.drive_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="p-3 font-bold text-gray-900 dark:text-white">{d.drive_title}</td>
                  <td className="p-3 font-bold text-primary-700">{d.company_name}</td>
                  <td className="p-3 text-purple-700 dark:text-purple-300 font-semibold">{d.job_role}</td>
                  <td className="p-3 font-mono font-bold text-emerald-600">{d.ctc_package}</td>
                  <td className="p-3 text-gray-600 dark:text-gray-400">{d.drive_date}</td>
                  <td className="p-3 text-center font-bold text-amber-600">{d.eligibility_cgpa} CGPA</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
