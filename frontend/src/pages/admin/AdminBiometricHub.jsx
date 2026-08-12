import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { Cpu, Wifi, CheckCircle, RefreshCw, Activity, UserCheck } from 'lucide-react'

const DEMO_DEVICES = [
  { id: 1, device_code: 'BIO-GATE-01', type: 'Fingerprint Reader', ip_address: '192.168.1.101', location: 'Main Gate', status: 'Online' },
  { id: 2, device_code: 'BIO-GATE-02', type: 'Face Recognition', ip_address: '192.168.1.102', location: 'Admin Block Entry', status: 'Online' },
  { id: 3, device_code: 'BIO-LIB-01', type: 'RFID Card Reader', ip_address: '192.168.1.105', location: 'Library Entry', status: 'Online' },
  { id: 4, device_code: 'BIO-CLASS-01', type: 'Fingerprint Reader', ip_address: '192.168.1.108', location: 'Classroom Block', status: 'Offline' },
  { id: 5, device_code: 'BIO-HOSTEL-01', type: 'Face Recognition', ip_address: '192.168.1.110', location: 'Hostel Entry', status: 'Online' },
]

export default function AdminBiometricHub() {
  const [devices] = useState(DEMO_DEVICES)
  const [targetUserId, setTargetUserId] = useState(535)

  const handleTriggerPunch = async (e) => {
    e.preventDefault()
    toast.success(`Biometric punch recorded for User ID: ${targetUserId}. Attendance auto-marked!`)
  }


  return (
    <div className="space-y-6 animate-page">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <Cpu className="w-7 h-7 text-primary-700" /> Biometric & RFID Integration ERP Terminal Hub
        </h1>
        <p className="page-subtitle">Real-Time Face Recognition, Fingerprint & RFID Reader Device Status Monitor</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Devices List */}
        <div className="lg:col-span-2 card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" /> Connected Biometric & RFID Devices
            </h3>
            <button onClick={() => toast.success('Device status refreshed!')} className="btn-secondary text-xs p-2">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="table-container max-h-[400px] overflow-y-auto">
            <table className="table w-full text-left border-collapse">
              <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800 z-10 text-xs font-bold text-gray-700 dark:text-gray-300">
                <tr>
                  <th className="p-3">Device Code</th>
                  <th className="p-3">Device Type</th>
                  <th className="p-3">IP Address</th>
                  <th className="p-3">Location</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                {devices.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="p-3 font-mono font-bold text-primary-700">{d.device_code}</td>
                    <td className="p-3 font-bold text-gray-900 dark:text-white">{d.type}</td>
                    <td className="p-3 font-mono text-gray-500">{d.ip_address}</td>
                    <td className="p-3 text-gray-700 dark:text-gray-300">{d.location}</td>
                    <td className="p-3 text-center"><span className="badge badge-green">{d.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Punch Test Simulator */}
        <div className="card p-5 space-y-4">
          <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-600" /> Ingest Live Biometric Punch Log
          </h3>

          <form onSubmit={handleTriggerPunch} className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Target Student User ID</label>
              <input type="number" required value={targetUserId} onChange={e => setTargetUserId(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-800" />
            </div>

            <button type="submit" className="w-full btn-primary py-2.5 text-xs flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4" /> Simulate Biometric Punch & Auto-Mark Attendance
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
