import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Lock } from 'lucide-react'

export default function Login({ setToken }) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: identifier, password })
      })

      const data = await res.json()
      if (res.ok) {
        localStorage.setItem('token', data.access_token)
        setToken(data.access_token)
      } else {
        if (Array.isArray(data.detail)) {
          setError(data.detail[0].msg || 'Validation error')
        } else {
          setError(data.detail || 'An error occurred')
        }
      }
    } catch (err) {
      setError('Failed to connect to backend.')
    }
    setLoading(false)
  }

  return (
    <div className="auth-layout">
      <div className="auth-left">
        <div className="auth-brand">
          <img src="/logo.png" alt="Quizify Logo" />
          Quizify
        </div>
        <div className="auth-left-content">
          <h1>Turn<br/>Knowledge<br/>into Progress</h1>
          <p>Create quizzes from topics, text, or PDF files and learn effectively.</p>
        </div>
        <div className="auth-left-footer">
          <h2>Learn<br/>Practice<br/>Grow</h2>
        </div>
        {/* Abstract Waves Graphic */}
        <div className="auth-waves">
          <svg viewBox="0 0 1440 320" xmlns="http://www.w3.org/2000/svg">
            <path fill="rgba(99, 102, 241, 0.2)" fillOpacity="1" d="M0,192L48,181.3C96,171,192,149,288,149.3C384,149,480,171,576,192C672,213,768,235,864,224C960,213,1056,171,1152,144C1248,117,1344,107,1392,101.3L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
            <path fill="rgba(79, 70, 229, 0.4)" fillOpacity="1" d="M0,256L48,250.7C96,245,192,235,288,208C384,181,480,139,576,133.3C672,128,768,160,864,181.3C960,203,1056,213,1152,218.7C1248,224,1344,224,1392,224L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
          </svg>
        </div>
      </div>
      
      <div className="auth-right">
        <div className="auth-form-container">
          <h2>Welcome Back</h2>
          <p>Login to your account to continue</p>

          {error && <div className="error-alert">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="input-label">Email or Username</label>
              <div className="input-wrapper">
                <Mail size={18} className="input-icon" />
                <input 
                  type="text" 
                  placeholder="karthi.ec23@bitsathy.ac.in" 
                  value={identifier} 
                  onChange={e => setIdentifier(e.target.value)} 
                  required 
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Password</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required 
                />
              </div>
            </div>

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? <div className="loader"></div> : 'Sign In'}
            </button>
          </form>

          <div className="auth-footer-link">
            Don't have an account? <Link to="/signup">Create one</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
