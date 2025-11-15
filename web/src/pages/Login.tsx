import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Link, useNavigate } from 'react-router-dom'

export default function Login() {
  const { signIn } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  return (
    <div className="chat-layout" style={{minHeight:'100vh'}}>
      <div className="glass-container" style={{maxWidth:'24rem'}}>
        <h1 className="text-heading-1">Login</h1>
        {error && <div className="toast toast-error">{error}</div>}
        <input className="glass-input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="glass-input" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button className="btn-glass" disabled={loading} onClick={async()=>{
          setLoading(true)
          setError('')
          try { await signIn(email, password); nav('/chats') } catch(e:any){ setError(e.message||'Login failed') } finally { setLoading(false) }
        }}>{loading?'Loading...':'Sign In'}</button>
        <div style={{marginTop:'0.5rem'}}>
          <Link to="/register" className="text-accent">Create account</Link>
        </div>
      </div>
    </div>
  )
}
