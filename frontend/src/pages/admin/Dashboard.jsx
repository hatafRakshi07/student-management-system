import React, { useEffect, useState } from 'react'
import { analyticsAPI } from '../../services/api'
import StatCard from '../../components/common/StatCard'
import { GraduationCap, Users, DollarSign, UserCheck, BarChart3, TrendingUp } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
         BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'

const PIE_COLORS = ['#10b981', '#ef4444']

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [trend, setTrend] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([analyticsAPI.dashboard(), analyticsAPI.attendanceTrend()])
      .then(([d, t]) => { setData(d.data); setTrend(t.data.trend?.slice().reverse() || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" />
    </div>
  )

  const gradeData = Object.entries(data?.grade_distribution || {}).map(([grade, count]) => ({ grade, count }))
  const feeData = [
    { name: 'Paid', value: data?.paid_fee_amount || 0 },
    { name: 'Pending', value: data?.pending_fee_amount || 0 },
  ]

  return (
    <div className="space-y-5 animate-page">
      <div>
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="page-subtitle">Aklank College overview at a glance</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard title="Total Students" value={data?.total_students || 0} icon={GraduationCap} color="blue" />
        <StatCard title="Total Teachers" value={data?.total_teachers || 0} icon={Users} color="purple" />
        <StatCard title="Attendance Rate" value={`${data?.attendance_percentage || 0}%`} icon={UserCheck} color="green" />
        <StatCard title="Fee Collection" value={`₹${((data?.paid_fee_amount || 0) / 1000).toFixed(0)}K`} icon={DollarSign} color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">Attendance Trend</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={trend.slice(-10)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={d => d.slice(5)} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="total" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">Fee Collection</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={feeData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" strokeWidth={2} stroke="transparent">
                {feeData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip formatter={v => [`₹${v.toLocaleString()}`, '']} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
              <Legend wrapperStyle={{ fontSize: '13px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {gradeData.length > 0 && (
          <div className="card lg:col-span-2">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">Grade Distribution</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={gradeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="grade" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}


