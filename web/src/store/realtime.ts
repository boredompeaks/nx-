import { create } from 'zustand'
import { supabase } from '../context/AuthContext'

type Presence = { user_id: string, status: 'online'|'offline'|'away' }
type Typing = { chat_id: string, user_id: string, is_typing: boolean }
type Message = { id: string, chat_id: string, sender_id: string, content: string, content_type?: string, created_at?: number }

type Store = {
  presence: Record<string, Presence>
  typing: Record<string, Typing>
  messages: Record<string, Message[]>
  reactions: Record<string, any[]>
  receipts: Record<string, any[]>
  subscribeChat: (chatId: string) => Promise<void>
  unsubscribeChat: (chatId: string) => void
}

const channels = new Map<string, any>()

export const useRealtimeStore = create<Store>((set, get)=>({
  presence: {},
  typing: {},
  messages: {},
  reactions: {},
  receipts: {},
  async subscribeChat(chatId) {
    const chMsgs = supabase.channel(`messages:${chatId}`)
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'messages', filter:`chat_id=eq.${chatId}` }, (payload)=>{
        const msg = payload.new as any
        set(state=>({ messages: { ...state.messages, [chatId]: [...(state.messages[chatId]||[]), msg] } }))
      })
      .on('postgres_changes', { event:'UPDATE', schema:'public', table:'messages', filter:`chat_id=eq.${chatId}` }, (payload)=>{
        const msg = payload.new as any
        set(state=>({ messages: { ...state.messages, [chatId]: (state.messages[chatId]||[]).map(m=>m.id===msg.id? msg : m) } }))
      })
      .on('postgres_changes', { event:'DELETE', schema:'public', table:'messages', filter:`chat_id=eq.${chatId}` }, (payload)=>{
        const msg = payload.old as any
        set(state=>({ messages: { ...state.messages, [chatId]: (state.messages[chatId]||[]).filter(m=>m.id!==msg.id) } }))
      })
    const chTyping = supabase.channel(`typing:${chatId}`)
      .on('postgres_changes', { event:'*', schema:'public', table:'typing_indicators', filter:`chat_id=eq.${chatId}` }, (payload)=>{
        const t = payload.new as any
        set(state=>({ typing: { ...state.typing, [chatId]: t } }))
      })
    const chReactions = supabase.channel(`reactions:${chatId}`)
      .on('postgres_changes', { event:'*', schema:'public', table:'reactions' }, (payload)=>{
        const r = (payload.new || payload.old) as any
        if (!r || r.message_id == null) return
        set(state=>({ reactions: { ...state.reactions, [r.message_id]: (()=>{
          const list = state.reactions[r.message_id] || []
          if (payload.eventType === 'DELETE') return list.filter(x=>x.id!==r.id)
          const exists = list.findIndex(x=>x.id===r.id)
          if (exists>=0) { const copy=[...list]; copy[exists]=r; return copy }
          return [...list, r]
        })() } }))
      })
    const chReceipts = supabase.channel(`receipts:${chatId}`)
      .on('postgres_changes', { event:'*', schema:'public', table:'read_receipts' }, (payload)=>{
        const rr = (payload.new || payload.old) as any
        if (!rr || rr.message_id == null) return
        set(state=>({ receipts: { ...state.receipts, [rr.message_id]: (()=>{
          const list = state.receipts[rr.message_id] || []
          if (payload.eventType === 'DELETE') return list.filter(x=>x.id!==rr.id)
          const exists = list.findIndex(x=>x.id===rr.id)
          if (exists>=0) { const copy=[...list]; copy[exists]=rr; return copy }
          return [...list, rr]
        })() } }))
      })
    await chMsgs.subscribe()
    await chTyping.subscribe()
    await chReactions.subscribe()
    await chReceipts.subscribe()
    channels.set(`messages:${chatId}`, chMsgs)
    channels.set(`typing:${chatId}`, chTyping)
    channels.set(`reactions:${chatId}`, chReactions)
    channels.set(`receipts:${chatId}`, chReceipts)
  },
  unsubscribeChat(chatId) {
    for (const key of [`messages:${chatId}`, `typing:${chatId}`, `reactions:${chatId}`, `receipts:${chatId}`]) {
      const ch = channels.get(key)
      if (ch) ch.unsubscribe()
      channels.delete(key)
    }
  }
}))
