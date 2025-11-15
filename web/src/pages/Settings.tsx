import { useAuth } from '../context/AuthContext'

export default function Settings(){
  const { user } = useAuth()
  return (
    <div className="chat-layout">
      <div className="glass-container" style={{maxWidth:'28rem'}}>
        <h1 className="text-heading-1">Settings</h1>
        <div className="glass-card">Email: {user?.email}</div>
        <div className="glass-card">Theme: <span className="text-secondary">toggle via header</span></div>
      </div>
    </div>
  )
}
