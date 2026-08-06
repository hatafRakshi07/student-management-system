import React, { useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Bot, Send, Mic, Sparkles, User, MessageSquare } from 'lucide-react'

export default function AICampusAssistant() {
  const [messages, setMessages] = useState([
    { sender: 'ai', text: 'Hello! I am your Aklank College AI Campus Assistant. Ask me about your Fee Dues, Attendance %, Exam Grades, Timetable, or Library books!' }
  ])
  const [inputQuery, setInputQuery] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSend = async (queryText) => {
    const q = queryText || inputQuery
    if (!q.trim()) return

    const newMsgs = [...messages, { sender: 'user', text: q }]
    setMessages(newMsgs)
    setInputQuery('')
    setLoading(true)

    try {
      const token = localStorage.getItem('access_token')
      const res = await axios.post('/api/ai-assistant/chat', { query: q }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      setMessages([...newMsgs, { sender: 'ai', text: res.data.ai_response }])
    } catch {
      toast.error('AI Assistant experienced a connection issue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-page">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <Bot className="w-7 h-7 text-primary-700" /> AI Campus Assistant Engine
        </h1>
        <p className="page-subtitle">Natural Language Conversational Bot with Context-Aware ERP Intelligence</p>
      </div>

      {/* Quick Suggestion Shortcuts */}
      <div className="flex flex-wrap gap-2 text-xs">
        <button onClick={() => handleSend("What is my fee balance?")} className="px-3 py-1.5 rounded-xl border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-950/40 text-primary-700 font-bold hover:bg-primary-100 transition">
          <Sparkles className="w-3.5 h-3.5 inline mr-1" /> What is my fee balance?
        </button>
        <button onClick={() => handleSend("Show my attendance percentage")} className="px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 font-bold hover:bg-emerald-100 transition">
          <Sparkles className="w-3.5 h-3.5 inline mr-1" /> Show my attendance %
        </button>
        <button onClick={() => handleSend("What are my exam grades?")} className="px-3 py-1.5 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 text-purple-700 font-bold hover:bg-purple-100 transition">
          <Sparkles className="w-3.5 h-3.5 inline mr-1" /> What are my exam grades?
        </button>
      </div>

      {/* Chat Messages Vault */}
      <div className="card p-5 h-[450px] flex flex-col justify-between space-y-4">
        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {messages.map((m, idx) => (
            <div key={idx} className={`flex gap-3 text-xs ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.sender === 'ai' && (
                <div className="w-8 h-8 rounded-full bg-primary-700 text-white flex items-center justify-center font-bold flex-shrink-0">
                  AI
                </div>
              )}
              <div className={`p-3.5 rounded-2xl max-w-[80%] ${m.sender === 'user' ? 'bg-primary-600 text-white font-medium rounded-tr-none' : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-tl-none'}`}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3 text-xs justify-start">
              <div className="w-8 h-8 rounded-full bg-primary-700 text-white flex items-center justify-center font-bold flex-shrink-0 animate-pulse">AI</div>
              <div className="p-3.5 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-500 italic">Thinking and checking ERP ledger...</div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form onSubmit={e => { e.preventDefault(); handleSend() }} className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <input
            type="text"
            value={inputQuery}
            onChange={e => setInputQuery(e.target.value)}
            placeholder="Ask AI anything about your fees, attendance, results, exams, or timetable..."
            className="flex-1 p-3 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-xs"
          />
          <button type="button" onClick={() => toast.success('Voice recognition ready. Speak your query!')} className="btn-secondary px-3.5 py-3">
            <Mic className="w-4 h-4 text-gray-600" />
          </button>
          <button type="submit" disabled={loading} className="btn-primary px-5 py-3 text-xs flex items-center gap-1.5">
            <Send className="w-4 h-4" /> Send
          </button>
        </form>
      </div>
    </div>
  )
}
