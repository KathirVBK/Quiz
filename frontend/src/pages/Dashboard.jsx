import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileText, MoreVertical } from 'lucide-react'

export default function Dashboard({ token }) {
  const [recentQuizzes, setRecentQuizzes] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/history`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setRecentQuizzes(data)
      })
      .catch(err => console.error(err))
  }, [token])

  const getDifficultyBadge = () => {
    const rand = Math.random()
    if (rand > 0.6) return 'Hard'
    if (rand > 0.3) return 'Medium'
    return 'Easy'
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 18) return 'Good Afternoon'
    return 'Good Evening'
  }

  return (
    <>
      <div style={{ marginBottom: '2rem' }}>
        <h1>{getGreeting()}, Kathir</h1>
        <div className="subtitle">Learn. Practice. Improve. Anytime, anywhere.</div>
      </div>

      <div className="hero-banner">
        <div className="hero-content">
          <h2>Create Quizzes from Any Content</h2>
          <p>Generate questions from topics, text, or PDF documents and test your knowledge instantly.</p>
          <button className="hero-btn" onClick={() => navigate('/new')}>Create New Quiz &rarr;</button>
        </div>
        <svg className="hero-graphic" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <path fill="#ffffff" d="M30,50 h100 v120 h-100 z" rx="10" />
          <line x1="45" y1="70" x2="110" y2="70" stroke="#cbd5e1" strokeWidth="6" strokeLinecap="round" />
          <line x1="45" y1="90" x2="110" y2="90" stroke="#cbd5e1" strokeWidth="6" strokeLinecap="round" />
          <line x1="45" y1="110" x2="90" y2="110" stroke="#cbd5e1" strokeWidth="6" strokeLinecap="round" />
          <circle cx="160" cy="80" r="25" fill="#ffffff" />
          <circle cx="150" cy="150" r="20" fill="#ffffff" />
          <circle cx="50" cy="180" r="25" fill="#ffffff" />
        </svg>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem' }}>
          <FileText size={20} color="var(--primary)" /> Learning Overview
        </h3>
        
        {recentQuizzes.length > 0 ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
              {(() => {
                let totalQuestions = 0;
                let correctAnswers = 0;
                let perfectQuizzes = 0;
                let latestTopic = recentQuizzes[0]?.topic || 'None';

                recentQuizzes.forEach(quiz => {
                  if (quiz.score) {
                    const parts = quiz.score.split('/');
                    if (parts.length === 2) {
                      const correct = parseInt(parts[0].trim(), 10);
                      const possible = parseInt(parts[1].trim(), 10);
                      if (!isNaN(correct) && !isNaN(possible)) {
                        totalQuestions += possible;
                        correctAnswers += correct;
                        if (correct === possible && possible > 0) perfectQuizzes++;
                      }
                    }
                  }
                });

                return (
                  <>
                    <div style={{ background: 'var(--surface-color)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase' }}>Questions Attempted</span>
                      <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)' }}>{totalQuestions}</span>
                    </div>
                    <div style={{ background: 'var(--surface-color)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase' }}>Correct Answers</span>
                      <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>{correctAnswers}</span>
                    </div>
                    <div style={{ background: 'var(--surface-color)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase' }}>Perfect Quizzes</span>
                      <span style={{ fontSize: '2rem', fontWeight: 800, color: '#16a34a' }}>{perfectQuizzes}</span>
                    </div>
                    <div style={{ background: 'var(--surface-color)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase' }}>Latest Topic</span>
                      <span style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-main)', marginTop: 'auto' }}>{latestTopic}</span>
                    </div>
                  </>
                )
              })()}
            </div>

            <div style={{ marginTop: '2rem', background: 'var(--surface-color)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
              <h4 style={{ margin: '0 0 1.5rem 0', color: 'var(--text-main)' }}>Performance History (Last 10 Quizzes)</h4>
              <div style={{ height: '200px', display: 'flex', alignItems: 'flex-end', gap: '1rem' }}>
                {recentQuizzes.slice(0, 10).reverse().map((quiz, idx) => {
                  let pct = 0;
                  if (quiz.score) {
                    const parts = quiz.score.split('/');
                    if (parts.length === 2) {
                      const correct = parseInt(parts[0].trim(), 10);
                      const possible = parseInt(parts[1].trim(), 10);
                      if (!isNaN(correct) && !isNaN(possible) && possible > 0) {
                        pct = Math.round((correct / possible) * 100);
                      }
                    }
                  }
                  return (
                    <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', height: '100%' }}>
                      <div style={{ width: '100%', height: '100%', background: 'var(--bg-color)', borderRadius: '4px', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${pct}%`, background: 'var(--primary)', borderRadius: '4px', transition: 'height 1s ease' }}></div>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        ) : (
          <div style={{padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--surface-color)', borderRadius: '1rem', border: '1px dashed var(--border-color)'}}>
            No data yet. Generate a quiz to see your learning overview!
          </div>
        )}
      </div>
    </>
  )
}
