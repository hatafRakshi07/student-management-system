import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { studentAPI, assignmentAPI, teacherAPI } from '../../services/api'
import StatCard from '../../components/common/StatCard'
import { GraduationCap, ClipboardList, UserCheck, ShieldCheck, BookOpen, ArrowRight } from 'lucide-react'

export default function TeacherDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ students: 0, assignments: 0, todayAttendance: 0 })
  const [teacherDeptInfo, setTeacherDeptInfo] = useState({
    department: 'Computer Science',
    courses: ['BCA'],
    years: ['1st Year', '2nd Year', '3rd Year']
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      studentAPI.list().catch(() => ({ data: { total: 0 } })),
      assignmentAPI.list().catch(() => ({ data: { assignments: [] } })),
      teacherAPI.myAssignments().catch(() => ({ data: {} })),
    ]).then(([students, assignments, teacherRes]) => {
      const myInfo = teacherRes.data || {}
      setTeacherDeptInfo({
        department: myInfo.department || 'Computer Science',
        courses: myInfo.courses?.length ? myInfo.courses : ['BCA'],
        years: myInfo.years?.length ? myInfo.years : ['1st Year', '2nd Year', '3rd Year']
      })

      setStats({
        students: students.data.total || 0,
        assignments: assignments.data.assignments?.filter(a => a.teacher_id === user.id).length || 0,
        todayAttendance: students.data.students?.filter(s => s.status === 'ACTIVE').length || 0,
      })
    }).finally(() => setLoading(false))
  }, [user.id])

  return (
    <div className="space-y-6 animate-page">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-400 text-slate-950">
              {teacherDeptInfo.department} Department
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white">
              Assigned: {teacherDeptInfo.courses.join(', ')}
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">
            WELCOME, {user?.full_name?.toUpperCase()}
          </h1>
          <p className="text-xs text-indigo-200 mt-1">
            Department-level faculty command portal for {teacherDeptInfo.department}
          </p>
        </div>

        <a
          href="/teacher/attendance"
          className="btn-primary bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 self-start md:self-auto shadow-md"
        >
          Mark Attendance <ArrowRight className="w-4 h-4" />
        </a>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title={`Total ${teacherDeptInfo.department} Students`}
          value={stats.students}
          icon={GraduationCap}
          color="blue"
        />
        <StatCard
          title="Active Course Assignments"
          value={teacherDeptInfo.courses.length}
          icon={BookOpen}
          color="purple"
        />
        <StatCard
          title="My Published Assignments"
          value={stats.assignments}
          icon={ClipboardList}
          color="green"
        />
      </div>

      {/* Quick Actions Grid */}
      <div className="card">
        <h3 className="font-bold text-gray-900 dark:text-white mb-4 text-sm flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary-600" /> Authorized Faculty Tools
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Mark Attendance', to: '/teacher/attendance', bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-300' },
            { label: 'Create Assignment', to: '/teacher/assignments', bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-700 dark:text-blue-300' },
            { label: 'Add Marks', to: '/teacher/marks', bg: 'bg-purple-50 dark:bg-purple-950/30', text: 'text-purple-700 dark:text-purple-300' },
            { label: 'My Students', to: '/teacher/students', bg: 'bg-orange-50 dark:bg-orange-950/30', text: 'text-orange-700 dark:text-orange-300' },
          ].map(({ label, to, bg, text }) => (
            <a
              key={to}
              href={to}
              className={`p-4 ${bg} rounded-xl text-center hover:scale-[1.02] active:scale-95 transition-all duration-200 border border-gray-100 dark:border-gray-800 shadow-sm`}
            >
              <p className={`font-bold text-xs sm:text-sm ${text}`}>{label}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
