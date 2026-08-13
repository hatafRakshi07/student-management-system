import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

// Bind React hook primitives to window scope to guard against minification scope issues
if (typeof window !== 'undefined') {
  window.React = React
  window.useEffect = React.useEffect
  window.useState = React.useState
  window.useCallback = React.useCallback
  window.useMemo = React.useMemo
  window.useRef = React.useRef
  window.useContext = React.useContext
  window.useReducer = React.useReducer
}

// Automatically update Service Worker when new build is available
if ('serviceWorker' in navigator) {
  try {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        updateSW(true)
      },
      onOfflineReady() {},
    })
  } catch {}
}

// Handle stale chunk reload gracefully if user clicks a lazy route from an old build
window.addEventListener('error', (e) => {
  const msg = e?.message || ''
  if (msg.includes('Loading chunk') || msg.includes('Failed to fetch dynamically imported module')) {
    const lastReload = sessionStorage.getItem('last_stale_chunk_reload')
    const now = Date.now()
    if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
      sessionStorage.setItem('last_stale_chunk_reload', now.toString())
      window.location.reload()
    }
  }
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

