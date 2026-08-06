import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import { ShieldCheck, AlertOctagon, GraduationCap, CheckCircle } from 'lucide-react'

export default function DocumentVerification() {
  const { docNumber } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const verify = async () => {
      try {
        const res = await axios.get(`/api/documents/verify/${docNumber}`)
        setData(res.data)
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    if (docNumber) verify()
  }, [docNumber])

  return (
    <div className="max-w-xl mx-auto py-12 px-4 space-y-6 animate-page">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Public Document Verification Engine</h1>
        <p className="text-xs text-gray-500">Official Authenticity & Cryptographic QR Seal Verification</p>
      </div>

      {loading && <p className="text-center text-xs text-gray-500">Verifying document checksum on PostgreSQL ledger...</p>}

      {data && (
        <div className="card p-6 border-2 border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/40 space-y-4">
          <div className="flex items-center justify-between">
            <span className="badge badge-green flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> {data.status}</span>
            <span className="text-xs font-mono font-bold text-emerald-700">{data.issue_date}</span>
          </div>

          <div className="space-y-2 text-xs divide-y divide-emerald-200 dark:divide-emerald-900/50">
            <p className="pt-2"><span className="font-bold text-gray-700 dark:text-gray-300">Document Serial Number:</span> <span className="font-mono font-bold text-primary-700">{data.document_number}</span></p>
            <p className="pt-2"><span className="font-bold text-gray-700 dark:text-gray-300">Certificate Type:</span> <span className="font-bold text-gray-900 dark:text-white">{data.certificate_type}</span></p>
            <p className="pt-2"><span className="font-bold text-gray-700 dark:text-gray-300">Issued To Student:</span> <span className="font-bold text-gray-900 dark:text-white">{data.student_name} ({data.roll_number})</span></p>
            <p className="pt-2"><span className="font-bold text-gray-700 dark:text-gray-300">Issuing Authority:</span> {data.issuer}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="card p-6 border-2 border-red-500 bg-red-50/50 dark:bg-red-950/40 text-center space-y-2">
          <AlertOctagon className="w-10 h-10 text-red-600 mx-auto" />
          <h3 className="font-bold text-base text-red-900 dark:text-red-200">Invalid or Revoked Document!</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400">No active authentic certificate record matched document number '{docNumber}'.</p>
        </div>
      )}
    </div>
  )
}
