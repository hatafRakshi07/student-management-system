import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

// Notify user when a new version is available and auto-reload
registerSW({
  onNeedRefresh() {
    if (confirm('New version available! Reload to update?')) {
      location.reload()
    }
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
