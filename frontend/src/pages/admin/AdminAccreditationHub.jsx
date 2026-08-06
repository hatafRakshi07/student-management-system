import React, { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Award, ShieldCheck, TrendingUp, CheckCircle, Star } from 'lucide-react'

export default function AdminAccreditationHub() {
  const [naac, setNaac] = useState(null)
  const [nirf, setNirf] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadAccreditationData = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      const [naacRes, nirfRes] = await Promise.all([
        axios.get('/api/accreditation/naac-aqar', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/accreditation/nirf-score', { headers: { Authorization: `Bearer ${token}` } })
      ])

      setNaac(naacRes.data)
      setNirf(nirfRes.data)
    } catch {
      toast.error('Failed to load NAAC/NIRF Accreditation data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAccreditationData()
  }, [])

  return (
    <div className="space-y-6 animate-page">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <Award className="w-7 h-7 text-amber-500" /> NAAC / NBA / NIRF Accreditation ERP Dashboard
        </h1>
        <p className="page-subtitle">Real-Time AQAR Criteria 1-7 Scores, SSR Evidence Repository & NIRF Ranking Calculator</p>
      </div>

      {naac && nirf && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* NAAC AQAR Card */}
          <div className="card p-6 border-2 border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/30 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500 fill-amber-500" /> NAAC AQAR Institutional Score
              </h3>
              <span className="badge badge-green text-sm px-3 py-1 font-black">GRADE {naac.naac_grade}</span>
            </div>

            <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 text-center">
              <p className="text-3xl font-black text-emerald-600">{naac.overall_cgpa} / 4.00</p>
              <p className="text-xs text-gray-500 font-bold uppercase mt-1">Cumulative Grade Point Average (CGPA)</p>
            </div>

            <div className="space-y-2 text-xs">
              {Object.entries(naac.criteria_scores).map(([crit, score]) => (
                <div key={crit} className="flex justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800/60">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{crit}</span>
                  <span className="font-mono font-bold text-primary-700">{score}</span>
                </div>
              ))}
            </div>
          </div>

          {/* NIRF Ranking Card */}
          <div className="card p-6 border-2 border-blue-500 bg-blue-50/20 dark:bg-blue-950/30 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" /> NIRF Institutional Ranking Index
              </h3>
              <span className="badge badge-blue text-sm px-3 py-1 font-bold">{nirf.projected_rank_range}</span>
            </div>

            <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 text-center">
              <p className="text-3xl font-black text-blue-600">{nirf.nirf_overall_score} / 100</p>
              <p className="text-xs text-gray-500 font-bold uppercase mt-1">Overall NIRF Readiness Score</p>
            </div>

            <div className="space-y-2 text-xs">
              {Object.entries(nirf.parameter_scores).map(([param, score]) => (
                <div key={param} className="flex justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800/60">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{param}</span>
                  <span className="font-mono font-bold text-emerald-600">{score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
