import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

// Bind React hook primitives to window scope to permanently guard against bare-identifier minification & cross-chunk scope issues
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

// Automatically force update Service Worker when new build is available
const updateSW = registerSW({
  onNeedRefresh() {
    updateSW(true)
  },
  onOfflineReady() {},
})

// Auto-reload page and clear stale caches if browser tries to execute a deleted JS chunk from an old build
// or if a service worker is caching an outdated bundle
const _clearAndReload = () => {
  if ('caches' in window) {
    caches.keys().then((names) => {
      names.forEach((name) => caches.delete(name))
    })
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((r) => r.unregister())
    })
  }
  const lastReload = sessionStorage.getItem('last_stale_reload')
  const now = Date.now()
  if (!lastReload || now - parseInt(lastReload, 10) > 5000) {
    sessionStorage.setItem('last_stale_reload', now.toString())
    window.location.reload()
  }
}

const _isStaleChunkError = (msg) =>
  msg && (
    msg.includes('Loading chunk') ||
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Failed to construct') ||
    msg.includes('Invalid URL') ||
    msg.includes('useEffect is not defined') ||
    msg.includes('ReferenceError')
  )

window.addEventListener('error', (e) => {
  if (_isStaleChunkError(e?.message)) _clearAndReload()
})

window.addEventListener('unhandledrejection', (e) => {
  if (_isStaleChunkError(e?.reason?.message)) _clearAndReload()
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
