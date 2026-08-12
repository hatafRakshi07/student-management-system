import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { Clock, LogIn, LogOut, CheckCircle, AlertTriangle, Calendar } from 'lucide-react'

export default function StaffAttendance() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [checkingIn, setCheckingIn] = useState(false)

  const handleCheckIn = async () => {
    setCheckingIn(true)
    try {
      const res = await api.post('/attendance/staff/check-in', {})
      toast.success(res.data.message)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Check-in failed')
    } finally {
      setCheckingIn(false)
    }
  }

  const handleCheckOut = async () => {
    try {
      const res = await api.post('/attendance/staff/check-out', {})
      toast.success(res.data.message)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Check-out failed')
    }
  }

  return (
    <div className="space-y-6 animate-page">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <Clock className="w-6 h-6 text-primary-700" /> Staff Attendance & Biometric Portal
        </h1>
        <p className="page-subtitle">Daily Check-In, Check-Out, Working Hours Timer, and Attendance History</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Check-In / Check-Out Actions */}
        <div className="card p-6 flex flex-col justify-between items-center text-center space-y-6">
          <div>
            <h3 className="font-bold text-lg text-gray-900 dark:text-white">Today's Attendance Status</h3>
            <p className="text-xs text-gray-500 mt-1">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleCheckIn}
              disabled={checkingIn}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm flex items-center gap-2 shadow-lg transition"
            >
              <LogIn className="w-5 h-5" /> Check-In Now
            </button>
            <button
              onClick={handleCheckOut}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold text-sm flex items-center gap-2 shadow-lg transition"
            >
              <LogOut className="w-5 h-5" /> Check-Out Now
            </button>
          </div>

          <p className="text-xs text-gray-400">Standard Shift: 09:00 AM - 05:00 PM (Grace Period: 15 mins)</p>
        </div>

        {/* Working Hours Metric */}
        <div className="card p-6 space-y-4">
          <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-600" /> Working Hours & Shift Rules
          </h3>
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl flex justify-between">
              <span className="text-gray-500 font-semibold">Standard Shift Duration:</span>
              <span className="font-bold text-gray-900 dark:text-white">8 Hours</span>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl flex justify-between">
              <span className="text-gray-500 font-semibold">Grace Period:</span>
              <span className="font-bold text-emerald-600">Until 09:15 AM</span>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl flex justify-between">
              <span className="text-gray-500 font-semibold">Overtime Rate:</span>
              <span className="font-bold text-purple-600">After 8.0 Hours</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
