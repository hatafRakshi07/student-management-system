import React, { useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FileCheck, ShieldCheck, QrCode, Plus, CheckCircle, ExternalLink } from 'lucide-react'

export default function AdminCertificateHub() {
  const [studentId, setStudentId] = useState(1)
  const [certType, setCertType] = useState('BONAFIDE')
  const [generatedDoc, setGeneratedDoc] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleGenerate = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      const res = await axios.post('/api/documents/generate', {
        student_id: Number(studentId),
        certificate_type: certType
      }, { headers: { Authorization: `Bearer ${token}` } })

      setGeneratedDoc(res.data)
      toast.success('Official Digital Certificate Generated Successfully!')
    } catch {
      toast.error('Failed to generate digital certificate')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-page">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <FileCheck className="w-7 h-7 text-primary-700" /> Certificate & Digital Document Engine
        </h1>
        <p className="page-subtitle">Generate Bonafide, Transfer, Character & Degree Certificates with Instant Public QR Validation</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={handleGenerate} className="card p-6 space-y-4 text-xs">
          <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary-600" /> Generate Official Certificate
          </h3>

          <div>
            <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Student Profile ID</label>
            <input type="number" required value={studentId} onChange={e => setStudentId(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-800" />
          </div>

          <div>
            <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Certificate Type</label>
            <select value={certType} onChange={e => setCertType(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-800">
              <option value="BONAFIDE">Bonafide Certificate</option>
              <option value="TRANSFER">Transfer Certificate (TC)</option>
              <option value="CHARACTER">Character Certificate</option>
              <option value="DEGREE">Degree Certificate</option>
              <option value="TRANSCRIPT">Official Marksheet Transcript</option>
            </select>
          </div>

          <button type="submit" disabled={loading} className="w-full btn-primary py-2.5 text-xs">Generate Digital Document</button>
        </form>

        {generatedDoc && (
          <div className="card p-6 space-y-4 border border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/30">
            <div className="flex items-center gap-2 text-emerald-700 font-bold">
              <ShieldCheck className="w-6 h-6 text-emerald-600" /> Certificate Generated & Digitally Signed!
            </div>
            <div className="space-y-2 text-xs font-mono">
              <p><span className="font-bold">Document Number:</span> {generatedDoc.document_number}</p>
              <p><span className="font-bold">Student Name:</span> {generatedDoc.student_name}</p>
              <p><span className="font-bold">Verification Token:</span> {generatedDoc.verification_token}</p>
            </div>
            <a href={generatedDoc.verification_url} target="_blank" rel="noreferrer" className="btn-secondary text-xs flex items-center justify-center gap-1.5 py-2">
              <ExternalLink className="w-4 h-4" /> Open Public Verification Page
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
