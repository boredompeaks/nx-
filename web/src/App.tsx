import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Chats from './pages/Chats'
import Conversation from './pages/Conversation'
import Settings from './pages/Settings'
import CalculatorDecoy from './pages/Calculator'

function Protected({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-overlay"><div className="loading-content"><div className="spinner"></div><div className="loading-text">Loading...</div></div></div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/calculator" element={<CalculatorDecoy />} />
        <Route path="/settings" element={<Protected><Settings /></Protected>} />
        <Route path="/chats" element={<Protected><Chats /></Protected>} />
        <Route path="/chats/:id" element={<Protected><Conversation /></Protected>} />
        <Route path="/" element={<CalculatorDecoy />} />
        <Route path="*" element={<div className="glass-elevated" style={{margin:'2rem',padding:'1rem'}}>Not Found</div>} />
      </Routes>
    </AuthProvider>
  )
}
