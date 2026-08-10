import React, { useEffect, useState } from 'react'

const SHOW_MS = 1800   // visible duration
const FADE_MS = 350    // fade-out duration

export default function SplashScreen({ onDone }) {
  const [hiding, setHiding] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setHiding(true), SHOW_MS)
    const t2 = setTimeout(() => {
      if (onDone) onDone()
    }, SHOW_MS + FADE_MS)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, []) // Empty dependency array ensures timer runs exactly ONCE on initial mount

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white text-gray-900 font-sans select-none p-4 sm:p-6 overflow-hidden
        ${hiding ? 'animate-splash-fade-out pointer-events-none' : ''}`}
    >
      {/* Background Soft Glow */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />
      <div className="absolute w-[400px] h-[400px] rounded-full bg-blue-600/10 blur-2xl pointer-events-none" />

      {/* Main Poster Container with Animations */}
      <div className="relative z-10 flex flex-col items-center max-w-md w-full animate-splash-logo">
        <div className="w-full bg-white rounded-2xl shadow-2xl p-2 sm:p-4 border border-gray-100 flex items-center justify-center transform transition duration-500 hover:scale-[1.01]">
          <img
            src="/splash_poster.png"
            alt="Aklank College Kota Official Poster"
            className="w-full max-h-[75vh] sm:max-h-[80vh] object-contain rounded-xl shadow-sm"
          />
        </div>

        {/* Loading Progress Line */}
        <div className="mt-6 w-64 h-1.5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-amber-500 via-red-600 to-[#024794] rounded-full animate-splash-fill"
            style={{ animationDuration: '2.5s' }}
          />
        </div>
      </div>
    </div>
  )
}
