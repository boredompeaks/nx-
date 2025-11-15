import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

type Chat = { id: string, name?: string }

export default function Chats(){
  const { user, signOut } = useAuth()
  const nav = useNavigate()
  const [chats, setChats] = useState<Chat[]>([])
  const [error, setError] = useState('')
  useEffect(()=>{ (async()=>{
    try {
      const res = await fetch('/chats')
      const data = await res.json()
      setChats(Array.isArray(data.data)?data.data:[])
    } catch(e:any){ setError(e.message||'Failed to load chats') }
  })() },[])
  return (
    <div className="app">
      <aside className="sidebar glass">
        <h1 className="title">Chats</h1>
        <button className="btn" onClick={async()=>{
          const session = await (await import('../context/AuthContext')).supabase.auth.getSession()
          const token = session.data.session?.access_token
          const res = await fetch('/chats', { method:'POST', headers:{'Content-Type':'application/json', ...(token? { Authorization: `Bearer ${token}` }: {}) }, body: JSON.stringify({ name: 'New Chat' }) })
          const c = await res.json()
          setChats(prev=>[c,...prev])
        }}>New Chat</button>
        <button className="btn" style={{marginLeft:'8px'}} onClick={()=>nav('/settings')}>Settings</button>
        <div style={{marginTop:'0.5rem'}}>Signed in as {user?.email}</div>
        <button className="btn" style={{marginTop:'0.5rem'}} onClick={async()=>{ await signOut(); nav('/login') }}>Logout</button>
        {error && <div className="toast toast-error" style={{marginTop:'0.5rem'}}>{error}</div>}
        <div id="chat-list">
          {chats.map(c=> (
            <div key={c.id} className="message glass-card" style={{cursor:'pointer'}} onClick={()=>nav(`/chats/${c.id}`)}>
              {c.name || c.id}
            </div>
          ))}
        </div>
      </aside>
      <main className="conversation glass">
        <div className="header">
          <span className="presence online"></span>
          <span>Conversation</span>
        </div>
        <div className="messages">
          <div className="text-secondary">Select a chat from the left to start messaging.</div>
        </div>
      </main>
    </div>
  )
}
