import React, { createContext, useContext, useState, useEffect } from 'react'
import { notificationAPI, getBaseURL } from '../services/api'
import { useAuth } from './AuthContext'
import toast from 'react-hot-toast'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread] = useState(0)

  const fetchNotifications = async () => {
    if (!user) return
    try {
      const res = await notificationAPI.list()
      setNotifications(res.data.notifications || [])
      setUnread(res.data.unread || 0)
    } catch {}
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60000)

    let socket = null
    if (user?.id && typeof window !== 'undefined' && window.location) {
      let wsUrl = ''
      try {
        const apiBase = getBaseURL()
        const parsedApi = new URL(apiBase)
        const wsProto = parsedApi.protocol === 'https:' ? 'wss:' : 'ws:'
        wsUrl = `${wsProto}//${parsedApi.host}/ws/${user.id}`
      } catch {
        const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const host = isDev ? `${window.location.hostname}:8000` : 'student-management-system-9yuf.onrender.com'
        wsUrl = `${protocol}//${host}/ws/${user.id}`
      }

      try {
        socket = new WebSocket(wsUrl)
        socket.onerror = () => {} // Suppress console error if WS backend is unavailable
        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type === 'new_notification' || data.type === 'new_message' || data.title) {
              toast.info(data.title || data.content || 'New notification received!')
              fetchNotifications()
            }
          } catch {
            fetchNotifications()
          }
        }
      } catch {}
    }

    return () => {
      clearInterval(interval)
      if (socket) {
        socket.onerror = null
        socket.onopen = null
        socket.onmessage = null
        if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
          socket.close()
        }
      }
    }
  }, [user])

  const markRead = async (id) => {
    await notificationAPI.markRead(id)
    fetchNotifications()
  }

  return (
    <NotificationContext.Provider value={{ notifications, unread, markRead, refetch: fetchNotifications }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  return useContext(NotificationContext)
}
