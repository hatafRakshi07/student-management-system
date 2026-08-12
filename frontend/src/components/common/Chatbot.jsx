import React, { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Bot, User, Sparkles } from 'lucide-react'
import { aiAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

export default function Chatbot() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'bot', text: "Hi! I'm your AI assistant. Ask me about your attendance, marks, fees, or study tips!" }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!user) return null

  const send = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setLoading(true)
    try {
      const res = await aiAPI.chat(userMsg)
      setMessages(prev => [...prev, { role: 'bot', text: res.data.response }])
    } catch {
      setMessages(prev => [...prev, { role: 'bot', text: 'Sorry, I could not process that. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-20 sm:bottom-20 right-4 sm:right-6 w-14 h-14 bg-gradient-to-br from-primary-500 to-accent-600 hover:from-primary-600 hover:to-accent-700 text-white rounded-2xl shadow-lg shadow-primary-500/30 flex items-center justify-center z-50 transition-all duration-300 hover:scale-110 active:scale-95 ${open ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
        aria-label="Open AI Assistant"
      >
        <Sparkles className="h-6 w-6" />
      </button>

      {/* Chat panel */}
      <div className={`fixed z-50 transition-all duration-300 ease-out ${
        open
          ? 'opacity-100 scale-100 translate-y-0'
          : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
      }
        /* Mobile: full screen bottom sheet */
        inset-x-0 bottom-0 top-[20%] sm:top-auto
        sm:bottom-24 sm:right-6 sm:left-auto sm:w-[380px] sm:h-[520px]
        bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 flex flex-col
      `}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-primary-600 to-accent-600 rounded-t-3xl sm:rounded-t-2xl flex-shrink-0">
          <div className="flex items-center gap-3 text-white">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-sm leading-tight">AI Assistant</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse-slow" />
                <p className="text-xs text-white/70">Always here to help</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 animate-slide-up ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'bot' && (
                <div className="w-7 h-7 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/60 dark:to-primary-800/40 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="h-3.5 w-3.5 text-primary-600 dark:text-primary-400" />
                </div>
              )}
              <div className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white rounded-tr-sm shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700/70 text-gray-900 dark:text-gray-100 rounded-tl-sm'
              }`}>
                {msg.text}
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 bg-gray-200 dark:bg-gray-600 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="h-3.5 w-3.5 text-gray-600 dark:text-gray-300" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-2">
              <div className="w-7 h-7 bg-primary-100 dark:bg-primary-900/60 rounded-xl flex items-center justify-center">
                <Bot className="h-3.5 w-3.5 text-primary-600" />
              </div>
              <div className="bg-gray-100 dark:bg-gray-700/70 px-4 py-3 rounded-2xl rounded-tl-sm">
                <div className="flex gap-1.5 items-center">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-700 flex-shrink-0 safe-bottom">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Ask me anything..."
              className="flex-1 px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-400/40 focus:border-primary-400 dark:focus:border-primary-500 transition-all"
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shadow-sm"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 sm:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  )
}

