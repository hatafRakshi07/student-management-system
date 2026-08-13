import React, { useEffect, useState } from 'react'

const SHOW_MS = 1200   // visible duration (snappy on mobile)
const FADE_MS = 300    // fade-out duration

export default function SplashScreen({ onDone }) {
  const [hiding, setHiding] = useState(false)

  const handleDismiss = () => {
    setHiding(true)
    setTimeout(() => {
      if (onDone) onDone()
    }, FADE_MS)
  }

  useEffect(() => {
    const t1 = setTimeout(() => setHiding(true), SHOW_MS)
    const t2 = setTimeout(() => {
      if (onDone) onDone()
    }, SHOW_MS + FADE_MS)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [onDone])

  return (
    <div
      onClick={handleDismiss}
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#024794] text-white font-sans select-none p-4 sm:p-6 overflow-hidden cursor-pointer
        ${hiding ? 'animate-splash-fade-out pointer-events-none' : ''}`}
    >
      {/* Background Soft Glow */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-amber-400/15 blur-3xl pointer-events-none" />
      <div className="absolute w-[400px] h-[400px] rounded-full bg-blue-400/20 blur-2xl pointer-events-none" />

      {/* Skip button for instant entry */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          handleDismiss()
        }}
        className="absolute top-5 right-5 z-20 px-3 py-1 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-semibold rounded-full border border-white/30 transition shadow-sm"
      >
        Skip ➔
      </button>

      {/* Main Poster Container with Animations */}
      <div className="relative z-10 flex flex-col items-center max-w-md w-full animate-splash-logo">
        <div className="w-full bg-white rounded-2xl shadow-2xl p-2 sm:p-4 border border-white/20 flex items-center justify-center transform transition duration-500 hover:scale-[1.01]">
          <img
            src="/splash_poster.png"
            alt="Aklank College Kota Official Poster"
            className="w-full max-h-[72vh] sm:max-h-[78vh] object-contain rounded-xl shadow-sm"
          />
        </div>

        {/* Loading Progress Line */}
        <div className="mt-5 w-60 h-1.5 bg-white/20 rounded-full overflow-hidden shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-amber-400 via-amber-300 to-white rounded-full animate-splash-fill"
            style={{ animationDuration: '1.5s' }}
          />
        </div>
      </div>
    </div>
  )
}

