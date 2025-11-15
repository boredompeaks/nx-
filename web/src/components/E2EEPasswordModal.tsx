import React, { useState } from 'react'

async function deriveKey(passphrase: string, chatId: string) {
  const enc = new TextEncoder()
  const salt = await crypto.subtle.digest('SHA-256', enc.encode(chatId))
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey'])
  const key = await crypto.subtle.deriveKey({ name:'PBKDF2', hash:'SHA-256', salt, iterations: 150000 }, baseKey, { name:'AES-CBC', length:256 }, false, ['encrypt','decrypt'])
  const raw = await crypto.subtle.exportKey('raw', key)
  return raw
}

export function setChatPassword(chatId: string, password: string) {
  const store = JSON.parse(sessionStorage.getItem('chat_session_passwords')||'{}')
  store[chatId] = password
  sessionStorage.setItem('chat_session_passwords', JSON.stringify(store))
}

export function getChatPassword(chatId: string) {
  const store = JSON.parse(sessionStorage.getItem('chat_session_passwords')||'{}')
  return store[chatId] || null
}

export default function E2EEPasswordModal({ chatId, onClose, onUnlock }:{ chatId: string, onClose: ()=>void, onUnlock: (key:ArrayBuffer)=>void }){
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  return (
    <div className="loading-overlay">
      <div className="glass-elevated" style={{padding:'1rem',maxWidth:'24rem'}}>
        <h2 className="text-heading-1">Unlock Chat</h2>
        {error && <div className="toast toast-error">{error}</div>}
        <input className="glass-input" type="password" placeholder="Enter passphrase" value={password} onChange={e=>setPassword(e.target.value)} />
        <div style={{display:'flex',gap:'8px',marginTop:'8px'}}>
          <button className="btn-glass" onClick={onClose}>Cancel</button>
          <button className="btn-glass" onClick={async()=>{
            try {
              if (password.length < 8) throw new Error('Minimum 8 characters')
              const key = await deriveKey(password, chatId)
              setChatPassword(chatId, password)
              onUnlock(key)
              onClose()
            } catch(e:any){ setError(e.message||'Failed to unlock') }
          }}>Unlock</button>
        </div>
      </div>
    </div>
  )
}
