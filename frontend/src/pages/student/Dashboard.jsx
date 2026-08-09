import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { studentAPI, aiAPI } from '../../services/api'
import StatCard from '../../components/common/StatCard'
import {
  UserCheck, BookMarked, ClipboardList, DollarSign, Brain,
  AlertTriangle, CheckCircle2, Clock, CreditCard, ChevronRight,
  GraduationCap, Calendar, Award
} from 'lucide-react'
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts'

export default function StudentDashboard() {
  const { user } = useAuth()
  const [data, setData] = useState({ attendance: null, marks: null, assignments: null, fees: null })
  const [perf, setPerf] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [att, marks, assign, fees, perfData] = await Promise.all([
          studentAPI.attendance().catch(() => ({ data: null })),
          studentAPI.marks().catch(() => ({ data: null })),
          studentAPI.assignments().catch(() => ({ data: null })),
          studentAPI.fees().catch(() => ({ data: null })),
          aiAPI.performance(user.id).catch(() => ({ data: null }))
        ])
        setData({
          attendance: att?.data,
          marks: marks?.data,
          assignments: assign?.data,
          fees: fees?.data
        })
        setPerf(perfData?.data)
      } catch (e) {
        console.error("Student dashboard error:", e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.id])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-600 border-t-transparent shadow-md" />
        <p className="text-sm font-semibold text-gray-500 animate-pulse">Loading Student Portal...</p>
      </div>
    )
  }

  const att = data.attendance
  const submitted = data.assignments?.assignments?.filter(a => a.submitted).length || 0
  const total = data.assignments?.assignments?.length || 0
  const pendingFees = data.fees?.pending_amount || 0
  const totalFees = data.fees?.total_amount || 0
  const paidFees = data.fees?.paid_amount || 0
  const feeProgress = data.fees?.payment_progress || (totalFees > 0 ? Math.round((paidFees / totalFees) * 100) : 0)
  const academicYears = data.fees?.academic_years || []
  const studentProf = data.fees?.student_profile || {}
  const pendingAssignments = (data.assignments?.assignments || []).filter(a => !a.submitted)

  const predColors = { Excellent: 'green', Good: 'blue', Average: 'yellow', Weak: 'red' }
  const predColor = predColors[perf?.prediction] || 'blue'

  const radarData = [
    { subject: 'Attendance', value: att?.percentage || 85 },
    { subject: 'Academic Fee', value: feeProgress },
    { subject: 'Tasks Completed', value: total > 0 ? Math.round((submitted / total) * 100) : 80 },
    { subject: 'Exams & Marks', value: data.marks?.marks?.[0] ? 75 : 80 },
  ]

  return (
    <div className="space-y-6 animate-page pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-primary-900 via-primary-800 to-indigo-900 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-white/10 text-white rounded-full text-xs font-semibold backdrop-blur-md flex items-center gap-1.5 border border-white/10">
              <GraduationCap className="w-3.5 h-3.5" />
              Student Portal
            </span>
            <span className="px-3 py-1 bg-emerald-400/20 text-emerald-300 rounded-full text-xs font-semibold border border-emerald-400/30">
              Scholar #{studentProf.scholar_no || studentProf.roll_number || 'Enrolled'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white pt-1">
            Welcome back, {user?.full_name?.split(' ')[0] || 'Student'} 👋
          </h1>
          <p className="text-xs sm:text-sm text-primary-200">
            {studentProf.class_name || 'Academic Degree'} · Department of {studentProf.department || 'Aklank College'}
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          {perf?.prediction && (
            <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 text-right">
              <p className="text-[10px] text-primary-200 uppercase font-semibold">AI Standing</p>
              <p className="text-sm font-black text-amber-300">{perf.prediction}</p>
            </div>
          )}
        </div>
      </div>

      {/* Attendance Warning if applicable */}
      {att?.percentage < 75 && (
        <div className="alert-warning flex items-start gap-3 p-4 rounded-2xl border border-amber-300/40">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-900 dark:text-amber-300 text-sm">Attendance Notice</p>
            <p className="text-xs text-amber-800 dark:text-amber-400 mt-0.5">
              Your attendance ({att?.percentage}%) is below 75%. Please attend upcoming lectures to remain eligible for examinations.
            </p>
          </div>
        </div>
      )}

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Attendance"
          value={`${att?.percentage || 85}%`}
          icon={UserCheck}
          color={(att?.percentage || 85) >= 75 ? 'green' : 'red'}
          subtitle={`${att?.present || 0}/${att?.total_classes || 0} Classes`}
        />

        <StatCard
          title="Assignments"
          value={`${submitted}/${total}`}
          icon={ClipboardList}
          color="blue"
          subtitle="Tasks Completed"
        />

        <StatCard
          title="Fee Status"
          value={pendingFees > 0 ? `₹${pendingFees.toLocaleString()}` : 'Cleared'}
          icon={CreditCard}
          color={pendingFees > 0 ? 'red' : 'green'}
          subtitle={pendingFees > 0 ? 'Pending Dues' : '100% Paid'}
        />

        <StatCard
          title="AI Guidance"
          value={perf?.prediction || 'On Track'}
          icon={Brain}
          color={predColor}
          subtitle="Semester Progress"
        />
      </div>

      {/* Row: Multi-Year Fee Card & Performance Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Multi-Year Fee Overview Card */}
        <div className="card p-6 rounded-3xl border border-gray-100 dark:border-gray-800 lg:col-span-2 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary-700" />
                <h3 className="font-bold text-gray-900 dark:text-white text-base">
                  Multi-Year Fee Summary
                </h3>
              </div>
              <Link
                to="/student/fees"
                className="text-xs font-bold text-primary-700 hover:text-primary-800 flex items-center gap-1"
              >
                View Full Timeline <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Overall Progress */}
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-gray-500">Overall Course Fee Payment</span>
                <span className="text-emerald-600 font-bold">{feeProgress}% Completed</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, feeProgress)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-gray-400 pt-1">
                <span>Paid: ₹{paidFees.toLocaleString()}</span>
                <span>Pending: ₹{pendingFees.toLocaleString()}</span>
                <span>Total: ₹{totalFees.toLocaleString()}</span>
              </div>
            </div>

            {/* Year Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              {academicYears.slice(0, 4).map((ay, idx) => (
                <div
                  key={ay.session || idx}
                  className="p-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 flex items-center justify-between"
                >
                  <div>
                    <p className="font-bold text-xs text-gray-900 dark:text-white">{ay.year_title}</p>
                    <p className="text-[10px] text-gray-400">{ay.class_name}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      ay.status === 'PAID' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' :
                      ay.status === 'PARTIAL' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
                      'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                    }`}>
                      {ay.status}
                    </span>
                    <p className="text-[10px] text-gray-500 mt-0.5">₹{ay.paid_amount?.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <Link
              to="/student/fees"
              className="w-full py-2.5 bg-primary-700 hover:bg-primary-800 text-white rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition"
            >
              <CreditCard className="w-4 h-4" /> Download Official Stamped Receipt Vouchers
            </Link>
          </div>
        </div>

        {/* Academic Radar Chart */}
        <div className="card p-6 rounded-3xl border border-gray-100 dark:border-gray-800 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-base mb-1">
              Performance Radar
            </h3>
            <p className="text-xs text-gray-400">Holistic balance of attendance, fees, and coursework</p>
          </div>

          <div className="h-48 w-full my-2">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 600 }} />
                <Radar dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/40 text-[11px] text-blue-800 dark:text-blue-300">
            Keep attendance and fee clearance up to date for smooth exam registrations.
          </div>
        </div>
      </div>

      {/* Row: Recent Marks & Pending Assignments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Marks */}
        <div className="card p-6 rounded-3xl border border-gray-100 dark:border-gray-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-gray-900 dark:text-white text-base">Recent Exam Marks</h3>
            </div>
            <Link to="/student/marks" className="text-xs font-bold text-primary-700 hover:text-primary-800">
              View All
            </Link>
          </div>

          <div className="space-y-3">
            {(data.marks?.marks || []).slice(0, 4).map((m, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{m.exam_title}</p>
                  <p className="text-xs text-gray-400">{m.exam_type || 'Internal Evaluation'}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-sm text-gray-900 dark:text-white">{m.marks_obtained}/{m.total_marks}</p>
                  <span className={`badge ${m.percentage >= 60 ? 'badge-green' : 'badge-red'} text-[10px]`}>
                    {m.grade || `${m.percentage}%`}
                  </span>
                </div>
              </div>
            ))}
            {!data.marks?.marks?.length && (
              <div className="py-8 text-center text-gray-400 text-xs">No exam evaluations recorded yet.</div>
            )}
          </div>
        </div>

        {/* Pending Assignments */}
        <div className="card p-6 rounded-3xl border border-gray-100 dark:border-gray-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-gray-900 dark:text-white text-base">Pending Tasks</h3>
            </div>
            <Link to="/student/assignments" className="text-xs font-bold text-primary-700 hover:text-primary-800">
              View All
            </Link>
          </div>

          <div className="space-y-3">
            {pendingAssignments.slice(0, 4).map(a => {
              const isOverdue = a.deadline && new Date(a.deadline) < new Date()
              return (
                <div
                  key={a.id}
                  className={`flex items-start justify-between p-3.5 rounded-2xl border ${
                    isOverdue
                      ? 'bg-rose-50/70 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800'
                      : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700'
                  }`}
                >
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{a.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Due: {a.deadline ? new Date(a.deadline).toLocaleDateString() : 'Upcoming'}
                    </p>
                  </div>
                  <span className={`badge ${isOverdue ? 'badge-red' : 'badge-yellow'} text-[10px]`}>
                    {isOverdue ? 'Overdue' : 'Pending'}
                  </span>
                </div>
              )
            })}
            {!pendingAssignments.length && (
              <div className="flex flex-col items-center justify-center py-8 text-emerald-600 space-y-1">
                <CheckCircle2 className="w-8 h-8" />
                <p className="text-xs font-bold">All assignments submitted on time!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
