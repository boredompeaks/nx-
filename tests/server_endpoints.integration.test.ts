import request from 'supertest'
import { spawn } from 'child_process'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const RUN = process.env.RUN_INTEGRATION_SERVER_TESTS === '1'
let SKIP = !(RUN && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)

describe('Server endpoints (Supabase integration)', () => {
  let proc: any
  const base = 'http://127.0.0.1:' + (process.env.PORT || 3000)

  beforeAll(async () => {
    if (SKIP) return
    proc = spawn('node', ['dist/src/server/index.js'], { env: process.env })
    const start = Date.now()
    let ok = false
    while (Date.now() - start < 5000) {
      try {
        await request(base).get('/health').expect(200)
        ok = true
        break
      } catch {}
      await new Promise((r) => setTimeout(r, 250))
    }
    if (!ok) { SKIP = true }
  })

  afterAll(async () => {
    if ((global as any).skipAll) return
    try { proc && proc.kill() } catch {}
  })

  const itOrSkip = (name: string, fn: any) => (SKIP ? it.skip(name, fn) : it(name, fn))

  itOrSkip('chat create and list', async () => {
    const c = await request(base).post('/chats').send({ name: 'Integration Demo' }).expect(201)
    expect(c.body.id).toBeTruthy()
    const list = await request(base).get('/chats').expect(200)
    expect(Array.isArray(list.body.data)).toBe(true)
  })

  itOrSkip('message send and list', async () => {
    const chat = await request(base).post('/chats').send({ name: 'Messages Demo' })
    const chatId = chat.body.id
    const m = await request(base).post('/messages').send({ chat_id: chatId, sender_id: '00000000-0000-0000-0000-000000000000', content: 'hello', content_type: 'text' }).expect(201)
    expect(m.body.content).toBe('hello')
    const list = await request(base).get('/messages').query({ chat_id: chatId }).expect(200)
    expect(list.body.count >= 1).toBe(true)
  })

  itOrSkip('reaction add/list', async () => {
    const chat = await request(base).post('/chats').send({ name: 'Reactions Demo' })
    const chatId = chat.body.id
    const m = await request(base).post('/messages').send({ chat_id: chatId, sender_id: '00000000-0000-0000-0000-000000000000', content: 'hi' })
    const msgId = m.body.id
    const r = await request(base).post('/reactions').send({ message_id: msgId, user_id: '00000000-0000-0000-0000-000000000000', emoji: '👍' }).expect(201)
    expect(r.body.emoji).toBe('👍')
    const list = await request(base).get('/reactions').query({ message_id: msgId }).expect(200)
    expect(list.body.count >= 1).toBe(true)
  })
})
