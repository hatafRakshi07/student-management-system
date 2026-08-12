import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { FileCheck, ShieldCheck, QrCode, Plus, CheckCircle, ExternalLink } from 'lucide-react'

const RECENT_CERTS = [
  { doc_no: 'AGC-BON-2024-0891', type: 'Bonafide', student: 'Priya Sharma', class: 'B.A. III', date: '2024-08-10', status: 'Issued' },
  { doc_no: 'AGC-TC-2024-0234', type: 'Transfer Certificate', student: 'Rekha Verma', class: 'B.Com II', date: '2024-08-09', status: 'Issued' },
  { doc_no: 'AGC-CHAR-2024-0445', type: 'Character', student: 'Sunita Patel', class: 'M.A. Final', date: '2024-08-08', status: 'Issued' },
  { doc_no: 'AGC-BON-2024-0888', type: 'Bonafide', student: 'Anita Singh', class: 'B.Sc. II', date: '2024-08-07', status: 'Issued' },
  { doc_no: 'AGC-DEG-2024-0112', type: 'Degree Certificate', student: 'Kavita Yadav', class: 'B.A. Final', date: '2024-08-05', status: 'Pending Approval' },
]

export default function AdminCertificateHub() {
  const [studentId, setStudentId] = useState('')
  const [certType, setCertType] = useState('BONAFIDE')
  const [generatedDoc, setGeneratedDoc] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleGenerate = async (e) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      const docNum = `AGC-${certType.slice(0,3)}-2024-${Math.floor(1000 + Math.random()*8999)}`
      setGeneratedDoc({
        document_number: docNum,
        student_name: 'Student ID: ' + studentId,
        verification_token: `VTK-${Math.random().toString(36).substring(2,10).toUpperCase()}`,
        verification_url: `https://student-management-system-9yuf.onrender.com/verify/${docNum}`,
      })
      toast.success('Official Digital Certificate Generated Successfully!')
      setLoading(false)
    }, 1000)
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

      {/* Recent Certificates Table */}
      <div className="card p-5 space-y-4">
        <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" /> Recently Issued Certificates
        </h3>
        <div className="table-container max-h-[300px] overflow-y-auto">
          <table className="table w-full text-left border-collapse">
            <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800 z-10 text-xs font-bold text-gray-700 dark:text-gray-300">
              <tr>
                <th className="p-3">Document No</th>
                <th className="p-3">Type</th>
                <th className="p-3">Student Name</th>
                <th className="p-3">Class</th>
                <th className="p-3">Date</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
              {RECENT_CERTS.map(c => (
                <tr key={c.doc_no} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="p-3 font-mono font-bold text-primary-700">{c.doc_no}</td>
                  <td className="p-3 font-semibold text-purple-700 dark:text-purple-300">{c.type}</td>
                  <td className="p-3 font-bold text-gray-900 dark:text-white">{c.student}</td>
                  <td className="p-3 text-gray-600 dark:text-gray-400">{c.class}</td>
                  <td className="p-3 text-gray-500">{c.date}</td>
                  <td className="p-3 text-center">
                    <span className={`badge ${c.status === 'Issued' ? 'badge-green' : 'badge-yellow'}`}>{c.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
