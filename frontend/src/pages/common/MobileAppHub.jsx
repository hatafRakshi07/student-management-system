import React, { useState } from 'react'
import { Smartphone, QrCode, ShieldCheck, Bell, Download, CheckCircle, WifiOff } from 'lucide-react'

export default function MobileAppHub() {
  const [qrGenerated, setQrGenerated] = useState(true)

  return (
    <div className="space-y-6 animate-page">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <Smartphone className="w-7 h-7 text-primary-700" /> Mobile Platform & PWA App Suite
        </h1>
        <p className="page-subtitle">Native iOS, Android & Tablet Apps with Biometric Login, Instant QR Authentication & Offline Sync</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* QR Code Login Card */}
        <div className="card p-6 text-center space-y-4 border border-gray-200 dark:border-gray-800">
          <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/50 text-primary-700 rounded-2xl flex items-center justify-center mx-auto">
            <QrCode className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-base text-gray-900 dark:text-white">Instant Mobile QR Login</h3>
          <p className="text-xs text-gray-500">Scan this QR code from your Aklank Student/Faculty Mobile App to authenticate instantly without typing passwords.</p>

          <div className="p-4 bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl w-48 h-48 mx-auto flex items-center justify-center">
            <div className="font-mono text-xs font-bold text-primary-700 p-2 bg-gray-50 rounded-xl">
              [AKLANK-QR-TOKEN-2026]
            </div>
          </div>
          <span className="badge badge-green text-xs">QR SESSION ACTIVE</span>
        </div>

        {/* Mobile Features & Capabilities */}
        <div className="lg:col-span-2 card p-6 space-y-4">
          <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" /> Native Mobile Features Supported
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 space-y-1">
              <p className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-500" /> Push Notifications
              </p>
              <p className="text-gray-500">Real-time alerts for fee due tomorrow, exam marksheet published, and notices.</p>
            </div>

            <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 space-y-1">
              <p className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <WifiOff className="w-4 h-4 text-blue-500" /> Offline Encrypted Sync
              </p>
              <p className="text-gray-500">Access timetable, downloaded PDF notes, and digital library card without internet.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
