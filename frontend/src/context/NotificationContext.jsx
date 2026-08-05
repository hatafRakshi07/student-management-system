import React, { createContext, useContext, useState, useEffect } from 'react'
import { notificationAPI } from '../services/api'
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

    // WebSocket real-time notification integration
    let socket = null
    if (user?.id) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const host = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host
      const wsUrl = `${protocol}//${host}/ws/${user.id}`

      try {
        socket = new WebSocket(wsUrl)
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
      } catch (err) {
        console.warn('WebSocket connection skipped/failed:', err)
      }
    }

    return () => {
      clearInterval(interval)
      if (socket) socket.close()
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
