import { useState, useEffect } from 'react'
import { User, Mail, Shield, Award } from 'lucide-react'

export default function Profile({ token }) {
  const [stats, setStats] = useState({ quizzesTaken: 0, averageScore: 0 })
  const [loading, setLoading] = useState(true)

  // In a real app, you would also fetch user details like username/email from a /me endpoint
  // For now, we mock the user details but fetch the REAL stats from history

  useEffect(() => {
    if (!token) return

    fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/history`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        const quizzesTaken = data.length
        let totalCorrect = 0
        let totalPossible = 0

        data.forEach(quiz => {
          if (quiz.score) {
            // score format is typically "2/3" or "2 / 3"
            const parts = quiz.score.split('/')
            if (parts.length === 2) {
              const correct = parseInt(parts[0].trim(), 10)
              const possible = parseInt(parts[1].trim(), 10)
              if (!isNaN(correct) && !isNaN(possible)) {
                totalCorrect += correct
                totalPossible += possible
              }
            }
          }
        })

        const averageScore = totalPossible > 0 ? Math.round((totalCorrect / totalPossible) * 100) : 0
        
        setStats({ quizzesTaken, averageScore })
        setLoading(false)
      })
      .catch(err => {
        console.error("Failed to fetch history for stats", err)
        setLoading(false)
      })
  }, [token])
  
  return (
    <div style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1>Your Profile</h1>
        <div className="subtitle">Manage your account settings and preferences.</div>
      </div>

      <div style={{ background: 'var(--surface-color)', borderRadius: '1rem', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        <div style={{ padding: '2rem', display: 'flex', alignItems: 'center', gap: '2rem', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 'bold' }}>
            K
          </div>
          <div>
            <h2 style={{ margin: '0 0 0.5rem 0' }}>Kathir</h2>
            <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Mail size={16} /> karthi.ec23@bitsathy.ac.in
            </div>
          </div>
        </div>

        <div style={{ padding: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={18} color="var(--primary)" /> Account Details
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Username</label>
                <div style={{ padding: '0.75rem', background: 'var(--bg-color)', borderRadius: '0.5rem', marginTop: '0.25rem', border: '1px solid var(--border-color)' }}>Kathir</div>
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Role</label>
                <div style={{ padding: '0.75rem', background: 'var(--bg-color)', borderRadius: '0.5rem', marginTop: '0.25rem', border: '1px solid var(--border-color)' }}>Student / Learner</div>
              </div>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Award size={18} color="var(--primary)" /> Statistics
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg-color)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Quizzes Taken</span>
                <span style={{ fontWeight: 'bold' }}>{loading ? '...' : stats.quizzesTaken}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg-color)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Average Score</span>
                <span style={{ fontWeight: 'bold' }}>{loading ? '...' : `${stats.averageScore}%`}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
