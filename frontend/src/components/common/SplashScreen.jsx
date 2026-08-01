import React, { useEffect, useState } from 'react'

const SHOW_MS   = 3000   // visible duration
const FADE_MS   = 600    // fade-out duration

export default function SplashScreen({ onDone }) {
  const [hiding, setHiding] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setHiding(true), SHOW_MS)
    const t2 = setTimeout(() => onDone(), SHOW_MS + FADE_MS)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onDone])

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden
        bg-gradient-to-br from-primary-900 via-primary-800 to-[#4a0a1a]
        ${hiding ? 'animate-splash-fade-out pointer-events-none' : ''}`}
    >
      {/* Rotating sunray background */}
      <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
        <div className="w-[600px] h-[600px] animate-sunray"
          style={{
            background: 'repeating-conic-gradient(from 0deg, #fff 0deg 8deg, transparent 8deg 18deg)',
            borderRadius: '50%',
          }}
        />
      </div>

      {/* Soft radial glow behind logo */}
      <div className="absolute w-72 h-72 rounded-full bg-primary-600/30 blur-3xl pointer-events-none" />

      {/* Pulsing ring around logo */}
      <div className="absolute w-48 h-48 rounded-full border-2 border-accent-400/40 animate-splash-ring pointer-events-none" />
      <div className="absolute w-64 h-64 rounded-full border border-white/10 animate-splash-ring pointer-events-none"
        style={{ animationDelay: '0.4s' }} />

      {/* --- Main content --- */}
      <div className="relative z-10 flex flex-col items-center px-6 text-center">

        {/* Logo */}
        <div className="animate-splash-logo mb-6"
          style={{ animationDuration: '0.9s', animationFillMode: 'both' }}>
          <div className="w-28 h-28 bg-white rounded-3xl flex items-center justify-center shadow-glow-gold p-2">
            <img src="/logo.png" alt="Aklank College" className="w-full h-full object-contain" />
          </div>
        </div>

        {/* "Since 1998" badge */}
        <div className="animate-splash-sub mb-3"
          style={{ animationDelay: '0.5s', animationFillMode: 'both' }}>
          <span className="text-xs font-semibold tracking-[0.2em] text-accent-400 uppercase px-3 py-1 rounded-full border border-accent-400/40 bg-accent-400/10">
            Since 1998 &nbsp;·&nbsp; Est. 1937
          </span>
        </div>

        {/* College name */}
        <div className="animate-splash-title overflow-hidden"
          style={{ animationDelay: '0.7s', animationFillMode: 'both' }}>
          <h1 className="text-5xl sm:text-6xl font-black text-white tracking-widest leading-none drop-shadow-lg">
            AKLANK
          </h1>
          <h1 className="text-5xl sm:text-6xl font-black text-accent-400 tracking-widest leading-none drop-shadow-lg">
            COLLEGE
          </h1>
        </div>

        {/* Co-Education tag */}
        <div className="animate-splash-sub mt-3"
          style={{ animationDelay: '1.1s', animationFillMode: 'both' }}>
          <p className="text-base font-semibold text-white/80 tracking-[0.15em] uppercase">
            Co-Education
          </p>
        </div>

        {/* Divider */}
        <div className="animate-splash-sub w-24 h-px bg-gradient-to-r from-transparent via-accent-400 to-transparent my-4"
          style={{ animationDelay: '1.3s', animationFillMode: 'both' }} />

        {/* Affiliation */}
        <div className="animate-splash-sub space-y-1"
          style={{ animationDelay: '1.4s', animationFillMode: 'both' }}>
          <p className="text-xs text-white/60 tracking-wide">
            Affiliated to University of Kota · Govt. of Rajasthan
          </p>
          <p className="text-xs text-white/50">
            Basant Vihar, Kota 324009 (Raj.)
          </p>
        </div>

        {/* Loading bar */}
        <div className="mt-10 w-52 h-1 bg-white/15 rounded-full overflow-hidden"
          style={{ animationDelay: '1.5s' }}>
          <div className="h-full bg-gradient-to-r from-accent-500 to-accent-300 rounded-full animate-splash-fill"
            style={{ animationDelay: '0.5s', animationFillMode: 'both' }} />
        </div>

        {/* Loading dots */}
        <div className="animate-splash-sub flex gap-1.5 mt-3"
          style={{ animationDelay: '1.6s', animationFillMode: 'both' }}>
          {[0, 0.2, 0.4].map((d, i) => (
            <div key={i} className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce"
              style={{ animationDelay: `${d + 1.8}s` }} />
          ))}
        </div>
      </div>

      {/* Bottom motto */}
      <div className="absolute bottom-8 left-0 right-0 text-center animate-splash-sub"
        style={{ animationDelay: '1.8s', animationFillMode: 'both' }}>
        <p className="text-sm text-white/40 tracking-[0.3em] font-light italic">
          चारितं खलु धम्मो
        </p>
      </div>
    </div>
  )
}
