import { useState, useEffect } from 'react'

export default function History({ token }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/history`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setHistory(data)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [token])

  if (loading) return <div className="container">Loading history...</div>

  return (
    <div className="container history-container">
      <h2>Your Quiz History</h2>
      {history.length === 0 ? (
        <p>No quizzes found. Go generate one!</p>
      ) : (
        <div className="history-list">
          {history.map(item => (
            <div key={item.id} className="history-card">
              <h3>{item.topic}</h3>
              <p className="history-score">Score: {item.score}</p>
              <p className="history-date">{new Date(item.timestamp).toLocaleString()}</p>
              
              <details style={{marginTop: '1rem', background: '#334155', padding: '1rem', borderRadius: '8px'}}>
                <summary style={{cursor: 'pointer', fontWeight: 'bold'}}>View Evaluation Feedback</summary>
                <div style={{marginTop: '1rem', whiteSpace: 'pre-wrap', fontSize: '0.9rem', color: '#cbd5e1'}}>
                  {item.feedback || item.evaluation_result}
                </div>
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
