import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { BookOpen, Video, FileText, CheckSquare, PlayCircle, HelpCircle, Award } from 'lucide-react'

export default function StudentLMS() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [quizAnswers, setQuizAnswers] = useState({})
  const [quizResult, setQuizResult] = useState(null)

  const loadLMSData = async () => {
    setLoading(true)
    try {
      const res = await api.get('/lms/contents/1')
      setData(res.data)
    } catch {
      toast.error('Failed to load LMS course contents')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLMSData()
  }, [])

  const handleQuizSubmit = async (e) => {
    e.preventDefault()
    try {
      const res = await api.post('/lms/quiz/submit', {
        quiz_id: 1,
        answers: quizAnswers
      })

      setQuizResult(res.data)
      toast.success('Quiz submitted successfully!')
    } catch {
      toast.error('Failed to submit quiz')
    }
  }

  return (
    <div className="space-y-6 animate-page">
      {/* Header */}
      <div>
        <h1 className="page-title flex items-center gap-2">
          <BookOpen className="w-7 h-7 text-primary-700" /> Learning Management System (LMS)
        </h1>
        <p className="page-subtitle">Access Video Lectures, Download PDF Notes & Complete Interactive Quizzes</p>
      </div>

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-5 space-y-4">
              <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <Video className="w-5 h-5 text-red-600" /> Active Video Lectures & Lesson Modules
              </h3>

              <div className="space-y-3">
                {data.lessons.map(l => (
                  <div key={l.id} className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <PlayCircle className="w-8 h-8 text-primary-600 flex-shrink-0" />
                      <div>
                        <h4 className="font-bold text-sm text-gray-900 dark:text-white">{l.lesson_title}</h4>
                        <p className="text-xs text-gray-500">{l.module_name} — Duration: {l.duration} mins</p>
                      </div>
                    </div>
                    {l.video_url && (
                      <a href={l.video_url} target="_blank" rel="noreferrer" className="btn-primary text-xs py-1.5 px-3">
                        Watch Lecture
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive Quiz Panel */}
          <div className="space-y-6">
            <div className="card p-5 space-y-4">
              <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-amber-500" /> Interactive MCQ Quiz Engine
              </h3>

              {!quizResult ? (
                <form onSubmit={handleQuizSubmit} className="space-y-4 text-xs">
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 rounded-xl">
                    <p className="font-bold text-gray-900 dark:text-white">Q1: What is the size of int in 32-bit C compiler?</p>
                    <div className="mt-2 space-y-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="q1" value="A" onChange={() => setQuizAnswers({ ...quizAnswers, 1: 'A' })} /> 2 Bytes
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="q1" value="B" onChange={() => setQuizAnswers({ ...quizAnswers, 1: 'B' })} /> 4 Bytes
                      </label>
                    </div>
                  </div>

                  <button type="submit" className="w-full btn-primary py-2.5 text-xs">Submit Quiz Solutions</button>
                </form>
              ) : (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 rounded-2xl text-center space-y-2">
                  <Award className="w-8 h-8 text-emerald-600 mx-auto" />
                  <h4 className="font-bold text-sm text-emerald-900 dark:text-emerald-200">Quiz Completed!</h4>
                  <p className="text-xl font-black text-emerald-600">{quizResult.score_obtained} / {quizResult.total_marks} ({quizResult.percentage}%)</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
