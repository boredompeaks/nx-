import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useRealtimeStore } from '../store/realtime'
import { getChatPassword, setChatPassword } from '../components/E2EEPasswordModal'

type Message = { id: string, sender_id: string, content: string, content_type?: string, created_at?: number }

export default function Conversation(){
  const { id } = useParams()
  const nav = useNavigate()
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [showUnlock, setShowUnlock] = useState(false)
  const [typing, setTyping] = useState(false)
  const [statusMap, setStatusMap] = useState<Record<string, { delivered_at?: number, read_by?: string[] }>>({})
  const currentUser = useMemo(()=> user?.id || 'user-demo', [user])
  const password = useMemo(()=> id ? getChatPassword(id) : null, [id])

  async function deriveKey(passphrase: string, chatId: string) {
    const enc = new TextEncoder()
    const salt = await crypto.subtle.digest('SHA-256', enc.encode(chatId))
    const baseKey = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey'])
    const key = await crypto.subtle.deriveKey({ name:'PBKDF2', hash:'SHA-256', salt, iterations: 150000 }, baseKey, { name:'AES-CBC', length:256 }, false, ['encrypt','decrypt'])
    const raw = await crypto.subtle.exportKey('raw', key)
    return raw
  }

  async function encryptWithPassword(plain: string) {
    if (!id || !password) return plain
    const keyRaw = await deriveKey(password, id)
    const iv = crypto.getRandomValues(new Uint8Array(16))
    const cipherBuf = await crypto.subtle.encrypt({ name:'AES-CBC', iv }, await crypto.subtle.importKey('raw', keyRaw, 'AES-CBC', false, ['encrypt']), new TextEncoder().encode(plain))
    const payload = {
      ciphertext: btoa(String.fromCharCode(...new Uint8Array(cipherBuf))),
      iv: btoa(String.fromCharCode(...iv)),
      senderId: currentUser,
      timestamp: Date.now(),
      contentType: 'text'
    }
    return JSON.stringify(payload)
  }

  async function tryDecrypt(content: string) {
    try {
      const obj = JSON.parse(content)
      if (!obj?.ciphertext || !obj?.iv) return content
      if (!id || !password) return content
      const keyRaw = await deriveKey(password, id)
      const iv = Uint8Array.from(atob(obj.iv), c=>c.charCodeAt(0))
      const cipher = Uint8Array.from(atob(obj.ciphertext), c=>c.charCodeAt(0))
      const plainBuf = await crypto.subtle.decrypt({ name:'AES-CBC', iv }, await crypto.subtle.importKey('raw', keyRaw, 'AES-CBC', false, ['decrypt']), cipher)
      return new TextDecoder().decode(plainBuf)
    } catch { return content }
  }

  useEffect(()=>{ (async()=>{
    const res = await fetch(`/messages?chat_id=${encodeURIComponent(id!)}`)
    const data = await res.json()
    if (Array.isArray(data.data)) {
      const decrypted = await Promise.all(data.data.map(async (m: any)=> ({ ...m, content: await tryDecrypt(m.content) })))
      setMessages(decrypted)
      const myIds = decrypted.filter(m=>m.sender_id===currentUser).map(m=>m.id)
      await Promise.all(myIds.map(async mid=>{
        const s = await fetch(`/message-status?message_id=${encodeURIComponent(mid)}`)
        const sj = await s.json()
        setStatusMap(prev=>({ ...prev, [mid]: sj.data?.[0] || {} }))
      }))
    }
  })() },[id])

  useEffect(()=>{ (async()=>{
    if (!id) return
    await useRealtimeStore.getState().subscribeChat(id)
    return ()=> useRealtimeStore.getState().unsubscribeChat(id)
  })() },[id])

  useEffect(()=>{
    const unsub = setInterval(()=>{
      const t = useRealtimeStore.getState().typing[id!]
      setTyping(!!t?.is_typing)
    }, 300)
    return ()=> clearInterval(unsub)
  },[id])

  const send = async () => {
    if (!text.trim()) return
    const temp = { id: `temp_${Date.now()}`, sender_id: currentUser, content: text, content_type: 'text', created_at: Date.now() }
    setMessages(prev=>[...prev, temp])
    setText('')
    const encrypted = await encryptWithPassword(temp.content)
    const session = await (await import('../context/AuthContext')).supabase.auth.getSession()
    const token = session.data.session?.access_token
    const res = await fetch('/messages', { method:'POST', headers:{'Content-Type':'application/json', ...(token? { Authorization: `Bearer ${token}` }: {}) }, body: JSON.stringify({ chat_id: id, sender_id: currentUser, content: encrypted, content_type: 'text' }) })
    const msg = await res.json()
    const finalMsg = { ...msg, content: await tryDecrypt(msg.content) }
    setMessages(prev=> prev.filter(m=>m.id!==temp.id).concat(finalMsg))
    const s = await fetch(`/message-status?message_id=${encodeURIComponent(finalMsg.id)}`)
    const sj = await s.json()
    setStatusMap(prev=>({ ...prev, [finalMsg.id]: sj.data?.[0] || {} }))
  }

  useEffect(()=>{
    if (id && !getChatPassword(id)) {
      const pass = window.prompt('Enter chat passphrase') || ''
      if (pass && pass.length >= 1) setChatPassword(id, pass)
    }
  },[id])

  return (
    <div className="app">
      <aside className="sidebar glass">
        <button className="btn" onClick={()=>nav('/chats')}>← Back</button>
      </aside>
      <main className="conversation glass">
        <div className="chat-header">
          <img src="https://api.dicebear.com/7.x/shapes/svg?seed=user" alt="avatar" style={{width:'28px',height:'28px',borderRadius:'50%',marginRight:'8px'}} />
          <span id="chat-name">Chat {id}</span>
          {typing ? <span className="typing-indicator" id="typing-indicator">Typing...</span> : null}
          <div style={{marginLeft:'auto',display:'flex',gap:'8px'}}>
            <button className="btn-icon" title="Voice Call">🔊</button>
            <button className="btn-icon" title="Video Call">🎥</button>
          </div>
        </div>
        <div className="messages">
          {messages.map(m=> (
            <div key={m.id} className={`message ${m.sender_id===currentUser?'sent':''}`}>
              <div className="message-content">
                <span className="message-text">{m.content}</span>
                <div className="message-meta">
                  <span className="message-time">{m.created_at? new Date(m.created_at).toLocaleTimeString(): ''}</span>
                  {m.sender_id===currentUser? <span className="message-status">{statusMap[m.id]?.delivered_at? '✓✓' : '✓'}</span>:null}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="composer">
          <input id="message-input" className="glass-input" placeholder="Type a message" value={text} onChange={e=>setText(e.target.value)} />
          <button id="send" className="btn" onClick={send}>Send</button>
        </div>
      </main>
      
    </div>
  )
}
