import React, { useEffect, useState } from 'react'
import { Download, X, Smartphone } from 'lucide-react'

const DISMISSED_KEY = 'pwa_install_dismissed'

export default function PWAInstallBanner() {
  const [prompt, setPrompt] = useState(null)
  const [show, setShow] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem(DISMISSED_KEY)) return

    // Detect iOS (Safari doesn't fire beforeinstallprompt)
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream
    const standalone = window.navigator.standalone === true
    if (ios && !standalone) {
      setIsIOS(true)
      setShow(true)
      return
    }

    const handler = (e) => {
      e.preventDefault()
      setPrompt(e)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // Already running as installed PWA
  if (window.matchMedia('(display-mode: standalone)').matches) return null
  if (!show) return null

  const dismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, '1')
    setShow(false)
  }

  const install = async () => {
    if (!prompt) return
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setShow(false)
  }

  return (
    <div className="fixed bottom-[72px] sm:bottom-4 left-3 right-3 sm:left-auto sm:right-4 sm:w-80 z-50 animate-slide-up">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
          <Smartphone className="w-5 h-5 text-primary-600 dark:text-primary-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">Install Aklank App</p>
          {isIOS ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
              Tap <strong>Share</strong> → <strong>"Add to Home Screen"</strong> to install
            </p>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
              Add to your home screen for the best experience
            </p>
          )}
          {!isIOS && (
            <button
              onClick={install}
              className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 active:scale-95 px-3 py-1.5 rounded-lg transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Install Now
            </button>
          )}
        </div>
        <button
          onClick={dismiss}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 active:scale-95 transition-all p-1 -mt-1 -mr-1"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
