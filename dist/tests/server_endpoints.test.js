import request from 'supertest';
import express from 'express';
import bodyParser from 'body-parser';
function makeApp() {
    const app = express();
    app.use(bodyParser.json());
    const chats = [];
    const messages = [];
    const reactions = [];
    const receipts = [];
    const typing = [];
    const presence = [];
    app.post('/chats', (req, res) => { const c = { id: 'c1', name: req.body?.name }; chats.push(c); res.json(c); });
    app.get('/chats', (_req, res) => res.json(chats));
    app.post('/messages', (req, res) => { const m = { id: 'm1', chat_id: req.body.chat_id, sender_id: req.body.sender_id, content: req.body.content, content_type: 'text', created_at: Date.now() }; messages.push(m); res.json(m); });
    app.get('/messages', (req, res) => { res.json(messages.filter(m => m.chat_id === req.query.chat_id)); });
    app.post('/reactions', (req, res) => { const r = { id: 'r1', message_id: req.body.message_id, user_id: req.body.user_id, emoji: req.body.emoji }; reactions.push(r); res.json(r); });
    app.get('/reactions', (req, res) => { res.json(reactions.filter(r => r.message_id === req.query.message_id)); });
    app.post('/read-receipts', (req, res) => { const rr = { id: 'rr1', message_id: req.body.message_id, user_id: req.body.user_id, read_at: Date.now() }; receipts.push(rr); res.json(rr); });
    app.get('/read-receipts', (req, res) => { res.json(receipts.filter(r => r.message_id === req.query.message_id)); });
    app.post('/typing', (req, res) => { const t = { chat_id: req.body.chat_id, user_id: req.body.user_id, is_typing: !!req.body.is_typing, updated_at: Date.now() }; const i = typing.findIndex(x => x.chat_id === t.chat_id && x.user_id === t.user_id); if (i >= 0)
        typing[i] = t;
    else
        typing.push(t); res.json(t); });
    app.get('/typing', (req, res) => { res.json(typing.filter(t => t.chat_id === req.query.chat_id)); });
    app.post('/presence', (req, res) => { const p = { user_id: req.body.user_id, status: req.body.status, updated_at: Date.now() }; const i = presence.findIndex(x => x.user_id === p.user_id); if (i >= 0)
        presence[i] = p;
    else
        presence.push(p); res.json(p); });
    app.get('/presence', (_req, res) => res.json(presence));
    return app;
}
describe('Server endpoints', () => {
    const app = makeApp();
    it('chat create and list', async () => {
        await request(app).post('/chats').send({ name: 'Demo' }).expect(200);
        const res = await request(app).get('/chats').expect(200);
        expect(res.body.length).toBe(1);
    });
    it('message send and list', async () => {
        const m = await request(app).post('/messages').send({ chat_id: 'c1', sender_id: 'u1', content: 'hello' }).expect(200);
        expect(m.body.content).toBe('hello');
        const list = await request(app).get('/messages').query({ chat_id: 'c1' }).expect(200);
        expect(list.body[0].content).toBe('hello');
    });
    it('reaction add/list', async () => {
        await request(app).post('/reactions').send({ message_id: 'm1', user_id: 'u1', emoji: '👍' }).expect(200);
        const res = await request(app).get('/reactions').query({ message_id: 'm1' }).expect(200);
        expect(res.body[0].emoji).toBe('👍');
    });
    it('read receipt add/list', async () => {
        await request(app).post('/read-receipts').send({ message_id: 'm1', user_id: 'u1' }).expect(200);
        const res = await request(app).get('/read-receipts').query({ message_id: 'm1' }).expect(200);
        expect(res.body[0].user_id).toBe('u1');
    });
    it('typing set/list', async () => {
        await request(app).post('/typing').send({ chat_id: 'c1', user_id: 'u1', is_typing: true }).expect(200);
        const res = await request(app).get('/typing').query({ chat_id: 'c1' }).expect(200);
        expect(res.body[0].is_typing).toBe(true);
    });
    it('presence set/list', async () => {
        await request(app).post('/presence').send({ user_id: 'u1', status: 'online' }).expect(200);
        const res = await request(app).get('/presence').expect(200);
        expect(res.body[0].status).toBe('online');
    });
});
