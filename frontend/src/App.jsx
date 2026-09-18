import { useState, useEffect } from 'react'
import { Routes, Route, Link, useNavigate, Navigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, History, User, LogOut, Sun, Moon, PlusSquare } from 'lucide-react'
import Login from './pages/Login'
import Signup from './pages/Signup'
import QuizApp from './pages/QuizApp'
import Dashboard from './pages/Dashboard'
import HistoryPage from './pages/History'
import Profile from './pages/Profile'
import './index.css'

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light')
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setToken(null)
    navigate('/login')
  }

  if (!token) {
    return (
      <Routes>
        <Route path="/login" element={<Login setToken={setToken} />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    )
  }

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src="/logo.png" alt="Quizify Logo" />
          Quizify
        </div>
        
        <nav className="sidebar-nav">
          <Link to="/" className={`sidebar-link ${location.pathname === '/' ? 'active' : ''}`}>
            <LayoutDashboard size={20} /> Dashboard
          </Link>
          <Link to="/new" className={`sidebar-link ${location.pathname === '/new' ? 'active' : ''}`}>
            <PlusSquare size={20} /> New Quiz
          </Link>
          <Link to="/history" className={`sidebar-link ${location.pathname === '/history' ? 'active' : ''}`}>
            <History size={20} /> History
          </Link>
          <Link to="/profile" className={`sidebar-link ${location.pathname === '/profile' ? 'active' : ''}`}>
            <User size={20} /> Profile
          </Link>
        </nav>

        <div className="sidebar-bottom">
          <button onClick={handleLogout} className="sidebar-link" style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
            <LogOut size={20} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="main-wrapper">
        <header className="topbar">
          <button className="theme-toggle" onClick={toggleTheme}>
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <div className="user-profile">
            <div className="user-avatar">K</div>
            <span className="user-name">Kathir</span>
          </div>
        </header>
        
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard token={token} />} />
            <Route path="/new" element={<QuizApp token={token} />} />
            <Route path="/history" element={<HistoryPage token={token} />} />
            <Route path="/profile" element={<Profile token={token} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
