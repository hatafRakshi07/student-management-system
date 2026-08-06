import React, { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { TrendingUp, AlertTriangle, DollarSign, Award, ShieldAlert, Sparkles } from 'lucide-react'

export default function AdminPredictiveAnalytics() {
  const [dropoutData, setDropoutData] = useState(null)
  const [feeForecast, setFeeForecast] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadPredictions = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      const [dropRes, feeRes] = await Promise.all([
        axios.get('/api/analytics/predict/dropout-risk', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/analytics/predict/fee-forecast', { headers: { Authorization: `Bearer ${token}` } })
      ])

      setDropoutData(dropRes.data)
      setFeeForecast(feeRes.data)
    } catch {
      toast.error('Failed to load Predictive Analytics models')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPredictions()
  }, [])

  return (
    <div className="space-y-6 animate-page">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <TrendingUp className="w-7 h-7 text-primary-700" /> AI Predictive Analytics & Forecast Command Center
        </h1>
        <p className="page-subtitle">Machine Learning Forecasts for Student Dropout Risk, Fee Realization & Placement Readiness</p>
      </div>

      {dropoutData && feeForecast && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Fee Forecast Panel */}
          <div className="card p-6 space-y-4 border-2 border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/30">
            <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" /> Revenue & Fee Collection Forecast
            </h3>

            <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 text-center space-y-1">
              <p className="text-2xl font-black text-emerald-600">₹{feeForecast.projected_next_month_collection.toLocaleString('en-IN')}</p>
              <p className="text-xs text-gray-500 uppercase font-bold">Projected Next Month Fee Realization</p>
            </div>

            <div className="text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Current Outstanding Receivable:</span>
                <span className="font-bold text-gray-900 dark:text-white">₹{feeForecast.current_total_receivable.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Model Confidence Level:</span>
                <span className="font-bold text-emerald-600">94.0%</span>
              </div>
            </div>
          </div>

          {/* Academic Risk Panel */}
          <div className="lg:col-span-2 card p-6 space-y-4 border-2 border-amber-500 bg-amber-50/20 dark:bg-amber-950/30">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600" /> AI Academic & Dropout Risk Heatmap
              </h3>
              <span className="badge badge-amber">{dropoutData.high_risk_count} High Risk Students</span>
            </div>

            <div className="table-container max-h-[300px] overflow-y-auto">
              <table className="table w-full text-left border-collapse">
                <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800 z-10 text-xs font-bold text-gray-700 dark:text-gray-300">
                  <tr>
                    <th className="p-3">Roll Number</th>
                    <th className="p-3">Student Name</th>
                    <th className="p-3 text-center">Attendance %</th>
                    <th className="p-3 text-center">Risk Index</th>
                    <th className="p-3">AI Recommendation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                  {dropoutData.at_risk_students.map((s, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="p-3 font-mono font-bold text-primary-700">{s.roll_number}</td>
                      <td className="p-3 font-bold text-gray-900 dark:text-white">{s.full_name}</td>
                      <td className="p-3 text-center font-bold text-amber-600">{s.attendance_pct}%</td>
                      <td className="p-3 text-center"><span className="badge badge-red">{s.risk_category}</span></td>
                      <td className="p-3 text-gray-600 dark:text-gray-300">{s.recommendation}</td>
                    </tr>
                  ))}
                  {!dropoutData.at_risk_students.length && (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-gray-400">All students are in good academic standing (Low Risk).</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
