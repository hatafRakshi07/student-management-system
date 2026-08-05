import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { authAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { User, Lock, Mail, Phone, Shield, Building, Award, Key } from 'lucide-react'

export default function Profile() {
  const { user } = useAuth()
  const [passData, setPassData] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [loadingPass, setLoadingPass] = useState(false)

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (passData.new_password !== passData.confirm_password) {
      toast.error('New passwords do not match')
      return
    }
    if (passData.new_password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setLoadingPass(true)
    try {
      await authAPI.changePassword({
        current_password: passData.current_password,
        new_password: passData.new_password
      })
      toast.success('Password changed successfully!')
      setPassData({ current_password: '', new_password: '', confirm_password: '' })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to change password')
    } finally {
      setLoadingPass(false)
    }
  }

  if (!user) return null

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 relative z-10">
          <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl font-bold border-2 border-white/30 shadow-inner">
            {user.full_name ? user.full_name[0].toUpperCase() : 'U'}
          </div>
          <div className="text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{user.full_name}</h1>
            <p className="text-indigo-100 text-sm font-medium capitalize mt-1 flex items-center justify-center sm:justify-start gap-1.5">
              <Shield className="w-4 h-4" /> Role: <span className="font-semibold bg-white/20 px-2 py-0.5 rounded-md">{user.role}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Account Details */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b dark:border-gray-700 pb-3">
            <User className="w-5 h-5 text-indigo-500" /> Account Details
          </h2>
          <div className="space-y-3 text-sm">
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase flex items-center gap-1.5 mb-1">
                <Mail className="w-3.5 h-3.5" /> Email Address
              </label>
              <div className="p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg font-medium text-gray-800 dark:text-gray-200">
                {user.email}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase flex items-center gap-1.5 mb-1">
                <Phone className="w-3.5 h-3.5" /> Contact Phone
              </label>
              <div className="p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg font-medium text-gray-800 dark:text-gray-200">
                {user.phone || 'Not provided'}
              </div>
            </div>

            {user.department && (
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase flex items-center gap-1.5 mb-1">
                  <Building className="w-3.5 h-3.5" /> Department
                </label>
                <div className="p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg font-medium text-gray-800 dark:text-gray-200">
                  {user.department}
                </div>
              </div>
            )}

            {user.roll_number && (
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase flex items-center gap-1.5 mb-1">
                  <Award className="w-3.5 h-3.5" /> Roll Number
                </label>
                <div className="p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg font-medium text-gray-800 dark:text-gray-200">
                  {user.roll_number}
                </div>
              </div>
            )}

            {user.employee_id && (
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase flex items-center gap-1.5 mb-1">
                  <Award className="w-3.5 h-3.5" /> Employee ID
                </label>
                <div className="p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg font-medium text-gray-800 dark:text-gray-200">
                  {user.employee_id}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Change Password Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b dark:border-gray-700 pb-3">
            <Key className="w-5 h-5 text-indigo-500" /> Security Settings
          </h2>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                Current Password
              </label>
              <input
                type="password"
                required
                value={passData.current_password}
                onChange={(e) => setPassData({ ...passData, current_password: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm outline-none"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                New Password
              </label>
              <input
                type="password"
                required
                value={passData.new_password}
                onChange={(e) => setPassData({ ...passData, new_password: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm outline-none"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={passData.confirm_password}
                onChange={(e) => setPassData({ ...passData, confirm_password: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm outline-none"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loadingPass}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow transition duration-150 disabled:opacity-50 text-sm"
            >
              {loadingPass ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
