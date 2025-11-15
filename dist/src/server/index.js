import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import cors from 'cors';
import mime from 'mime';
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import 'dotenv/config';
import { validateInput, chatValidation, messageValidation, reactionValidation, readReceiptValidation, typingValidation, presenceValidation } from './validation.js';
import { errorHandler, asyncHandler, requestTimeout, AppError, NotFoundError } from './errorHandler.js';
import { attachUser, requireAuth } from './authMiddleware.js';
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let webDir = path.resolve(__dirname, '../../..', 'web');
const builtDir = path.resolve(webDir, 'dist');
try {
    webDir = builtDir;
}
catch { }
// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://bjnxsfipttpdwodktcwt.supabase.co"],
        },
    },
}));
// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? ['https://yourdomain.com']
        : ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
    optionsSuccessStatus: 200,
}));
app.use(express.static(webDir, {
    setHeaders: (res, filePath) => {
        const type = mime.getType(filePath) || 'application/octet-stream';
        res.setHeader('Content-Type', type);
    }
}));
app.get('/', (_req, res) => {
    res.sendFile(path.join(webDir, 'index.html'));
});
// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.',
        code: 'RATE_LIMIT',
        retryAfter: 15 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);
// Body parsing with size limits
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
// Request timeout middleware
app.use(requestTimeout(30000)); // 30 seconds
app.use(attachUser);
// Request logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path} - ${req.ip}`);
    next();
});
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);
// Chat endpoints with validation
app.post('/chats', requireAuth, validateInput(chatValidation), asyncHandler(async (req, res) => {
    const id = crypto.randomUUID();
    const chatInsert = {
        id,
        name: req.body.name || `Chat ${id}`,
        is_group: req.body.is_group || false,
        created_by: req.userId || null,
    };
    const { data, error } = await supabase.from('chats').insert(chatInsert).select().single();
    if (error)
        throw new AppError(503, error.message, true, 'DATABASE_ERROR');
    res.status(201).json(data);
}));
app.get('/chats', asyncHandler(async (_req, res) => {
    const { data, error } = await supabase.from('chats').select('*').order('last_message_at', { ascending: false });
    if (error)
        throw new AppError(503, error.message, true, 'DATABASE_ERROR');
    res.json({ data: data || [], count: (data || []).length, timestamp: new Date().toISOString() });
}));
// Message endpoints with validation
app.post('/messages', requireAuth, validateInput(messageValidation), asyncHandler(async (req, res) => {
    const chatId = req.body.chat_id;
    const { data: chatExists, error: chatErr } = await supabase.from('chats').select('id').eq('id', chatId).maybeSingle();
    if (chatErr)
        throw new AppError(503, chatErr.message, true, 'DATABASE_ERROR');
    if (!chatExists)
        throw new NotFoundError('Chat', chatId);
    const id = crypto.randomUUID();
    const insert = {
        id,
        chat_id: req.body.chat_id,
        sender_id: req.userId || req.body.sender_id,
        content: req.body.content,
        content_type: req.body.content_type || 'text',
        media_url: req.body.media_url,
        disappear_after: req.body.disappear_after,
        disappears_at: req.body.disappears_at,
        reply_to_id: req.body.reply_to_id,
        is_one_time_view: req.body.is_one_time_view,
    };
    const { data, error } = await supabase.from('messages').insert(insert).select().single();
    if (error)
        throw new AppError(503, error.message, true, 'DATABASE_ERROR');
    const statusRow = {
        message_id: id,
        user_id: req.userId || req.body.sender_id,
        is_delivered: true,
        delivered_at: new Date().toISOString(),
    };
    await supabase.from('message_status').upsert(statusRow);
    res.status(201).json(data);
}));
app.get('/messages', validateInput({ chat_id: messageValidation.chat_id }, 'query'), asyncHandler(async (req, res) => {
    const chat_id = req.query.chat_id;
    const { data: chatExists, error: chatErr } = await supabase.from('chats').select('id').eq('id', chat_id).maybeSingle();
    if (chatErr)
        throw new AppError(503, chatErr.message, true, 'DATABASE_ERROR');
    if (!chatExists)
        throw new NotFoundError('Chat', chat_id);
    const { data, error, count } = await supabase
        .from('messages')
        .select('*', { count: 'exact' })
        .eq('chat_id', chat_id)
        .order('created_at', { ascending: true });
    if (error)
        throw new AppError(503, error.message, true, 'DATABASE_ERROR');
    res.json({ data: data || [], count: count || 0, chat_id, timestamp: new Date().toISOString() });
}));
// Reaction endpoints with validation
app.post('/reactions', requireAuth, validateInput(reactionValidation), asyncHandler(async (req, res) => {
    const { data: msgExists, error: msgErr } = await supabase.from('messages').select('id').eq('id', req.body.message_id).maybeSingle();
    if (msgErr)
        throw new AppError(503, msgErr.message, true, 'DATABASE_ERROR');
    if (!msgExists)
        throw new NotFoundError('Message', req.body.message_id);
    const insert = {
        message_id: req.body.message_id,
        user_id: req.userId || req.body.user_id,
        emoji: req.body.emoji,
    };
    const { data, error } = await supabase.from('reactions').insert(insert).select().single();
    if (error && error.code === '23505') {
        const { data: existing } = await supabase
            .from('reactions')
            .select('*')
            .eq('message_id', req.body.message_id)
            .eq('user_id', req.body.user_id)
            .eq('emoji', req.body.emoji)
            .maybeSingle();
        return res.status(200).json(existing);
    }
    if (error)
        throw new AppError(503, error.message, true, 'DATABASE_ERROR');
    res.status(201).json(data);
}));
app.get('/reactions', validateInput({ message_id: reactionValidation.message_id }, 'query'), asyncHandler(async (req, res) => {
    const message_id = req.query.message_id;
    const { data: msgExists, error: msgErr } = await supabase.from('messages').select('id').eq('id', message_id).maybeSingle();
    if (msgErr)
        throw new AppError(503, msgErr.message, true, 'DATABASE_ERROR');
    if (!msgExists)
        throw new NotFoundError('Message', message_id);
    const { data, error, count } = await supabase
        .from('reactions')
        .select('*', { count: 'exact' })
        .eq('message_id', message_id)
        .order('created_at', { ascending: true });
    if (error)
        throw new AppError(503, error.message, true, 'DATABASE_ERROR');
    res.json({ data: data || [], count: count || 0, message_id, timestamp: new Date().toISOString() });
}));
// Read receipt endpoints with validation
app.post('/read-receipts', requireAuth, validateInput(readReceiptValidation), asyncHandler(async (req, res) => {
    const { data: msgExists, error: msgErr } = await supabase.from('messages').select('id, chat_id').eq('id', req.body.message_id).maybeSingle();
    if (msgErr)
        throw new AppError(503, msgErr.message, true, 'DATABASE_ERROR');
    if (!msgExists)
        throw new NotFoundError('Message', req.body.message_id);
    const insert = {
        message_id: req.body.message_id,
        user_id: req.userId || req.body.user_id,
        chat_id: msgExists.chat_id,
        read_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from('read_receipts').upsert(insert).select().single();
    if (error)
        throw new AppError(503, error.message, true, 'DATABASE_ERROR');
    await supabase
        .from('message_status')
        .upsert({ message_id: req.body.message_id, user_id: req.userId || req.body.user_id, is_read: true, read_at: new Date().toISOString() });
    res.status(201).json(data);
}));
app.get('/read-receipts', validateInput({ message_id: readReceiptValidation.message_id }, 'query'), asyncHandler(async (req, res) => {
    const message_id = req.query.message_id;
    const { data: msgExists, error: msgErr } = await supabase.from('messages').select('id').eq('id', message_id).maybeSingle();
    if (msgErr)
        throw new AppError(503, msgErr.message, true, 'DATABASE_ERROR');
    if (!msgExists)
        throw new NotFoundError('Message', message_id);
    const { data, error, count } = await supabase
        .from('read_receipts')
        .select('*', { count: 'exact' })
        .eq('message_id', message_id)
        .order('read_at', { ascending: true });
    if (error)
        throw new AppError(503, error.message, true, 'DATABASE_ERROR');
    res.json({ data: data || [], count: count || 0, message_id, timestamp: new Date().toISOString() });
}));
// Typing indicator endpoints with validation
app.post('/typing', requireAuth, validateInput(typingValidation), asyncHandler(async (req, res) => {
    const chatId = req.body.chat_id;
    const { data: chatExists, error: chatErr } = await supabase.from('chats').select('id').eq('id', chatId).maybeSingle();
    if (chatErr)
        throw new AppError(503, chatErr.message, true, 'DATABASE_ERROR');
    if (!chatExists)
        throw new NotFoundError('Chat', chatId);
    const row = {
        chat_id: chatId,
        user_id: req.userId || req.body.user_id,
        is_typing: !!req.body.is_typing,
        updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from('typing_indicators').upsert(row).select().single();
    if (error)
        throw new AppError(503, error.message, true, 'DATABASE_ERROR');
    res.json(data);
}));
app.get('/typing', validateInput({ chat_id: typingValidation.chat_id }, 'query'), asyncHandler(async (req, res) => {
    const chat_id = req.query.chat_id;
    const { data: chatExists, error: chatErr } = await supabase.from('chats').select('id').eq('id', chat_id).maybeSingle();
    if (chatErr)
        throw new AppError(503, chatErr.message, true, 'DATABASE_ERROR');
    if (!chatExists)
        throw new NotFoundError('Chat', chat_id);
    const { data, error, count } = await supabase
        .from('typing_indicators')
        .select('*', { count: 'exact' })
        .eq('chat_id', chat_id)
        .order('updated_at', { ascending: false });
    if (error)
        throw new AppError(503, error.message, true, 'DATABASE_ERROR');
    res.json({ data: data || [], count: count || 0, chat_id, timestamp: new Date().toISOString() });
}));
// Presence endpoints with validation
app.post('/presence', requireAuth, validateInput(presenceValidation), asyncHandler(async (req, res) => {
    const { data, error } = await supabase
        .from('profiles')
        .update({ status: req.body.status, last_seen: new Date().toISOString() })
        .eq('id', req.userId || req.body.user_id)
        .select()
        .single();
    if (error)
        throw new AppError(503, error.message, true, 'DATABASE_ERROR');
    res.json(data);
}));
app.get('/presence', asyncHandler(async (_req, res) => {
    const { data, error, count } = await supabase
        .from('profiles')
        .select('id, username, status, last_seen', { count: 'exact' })
        .order('last_seen', { ascending: false });
    if (error)
        throw new AppError(503, error.message, true, 'DATABASE_ERROR');
    res.json({ data: data || [], count: count || 0, timestamp: new Date().toISOString() });
}));
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV || 'development'
    });
});
app.get('/metrics', asyncHandler(async (_req, res) => {
    const [messagesCount, chatsCount, profilesCount] = await Promise.all([
        supabase.from('messages').select('id', { count: 'exact', head: true }),
        supabase.from('chats').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
    ]);
    res.json({
        timestamp: new Date().toISOString(),
        counts: {
            messages: messagesCount.count || 0,
            chats: chatsCount.count || 0,
            profiles: profilesCount.count || 0,
        }
    });
}));
// 404 handler for unknown routes
app.use('*', (req, res) => {
    res.status(404).json({
        error: {
            message: `Route ${req.method} ${req.originalUrl} not found`,
            code: 'ROUTE_NOT_FOUND',
            timestamp: new Date().toISOString(),
            path: req.path
        }
    });
});
// Global error handler (must be last)
app.use(errorHandler);
const port = process.env.PORT || 3000;
app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`server listening on ${port}`);
});
// Message status endpoints
app.get('/message-status', asyncHandler(async (req, res) => {
    const message_id = String(req.query.message_id || '');
    const { data, error } = await supabase
        .from('message_status')
        .select('*')
        .eq('message_id', message_id);
    if (error)
        throw new AppError(503, error.message, true, 'DATABASE_ERROR');
    res.json({ data: data || [], message_id, timestamp: new Date().toISOString() });
}));
