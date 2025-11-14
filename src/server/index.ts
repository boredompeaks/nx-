import express from 'express';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { validateInput, 
         chatValidation, 
         messageValidation, 
         reactionValidation, 
         readReceiptValidation, 
         typingValidation, 
         presenceValidation,
         searchValidation } from './validation.js';
import { errorHandler, asyncHandler, requestTimeout, AppError, NotFoundError } from './errorHandler.js';

const app = express();

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

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - ${req.ip}`);
  next();
});

type Chat = { id: string; name?: string; is_group?: boolean };
type Message = { id: string; chat_id: string; sender_id: string; content: string; content_type: string; created_at: number };
type Reaction = { id: string; message_id: string; user_id: string; emoji: string };
type ReadReceipt = { id: string; message_id: string; user_id: string; read_at: number };
type Typing = { chat_id: string; user_id: string; is_typing: boolean; updated_at: number };
type Presence = { user_id: string; status: 'online'|'offline'|'away'; updated_at: number };

const chats: Map<string, Chat> = new Map();
const messages: Map<string, Message> = new Map();
const reactions: Reaction[] = [];
const receipts: ReadReceipt[] = [];
const typingIndicators: Typing[] = [];
const presence: Presence[] = [];

// Chat endpoints with validation
app.post('/chats', validateInput(chatValidation), asyncHandler(async (req: express.Request, res: express.Response) => {
  const id = `c_${Date.now()}`;
  const chat: Chat = { 
    id, 
    name: req.body.name || `Chat ${id}`, 
    is_group: req.body.is_group || false 
  };
  chats.set(id, chat);
  res.status(201).json(chat);
}));

app.get('/chats', asyncHandler(async (_req: express.Request, res: express.Response) => {
  const chatList = Array.from(chats.values());
  res.json({
    data: chatList,
    count: chatList.length,
    timestamp: new Date().toISOString()
  });
}));

// Message endpoints with validation
app.post('/messages', validateInput(messageValidation), asyncHandler(async (req: express.Request, res: express.Response) => {
  // Check if chat exists
  if (!chats.has(req.body.chat_id)) {
    throw new NotFoundError('Chat', req.body.chat_id);
  }
  
  const id = `m_${Date.now()}`;
  const msg: Message = {
    id,
    chat_id: req.body.chat_id,
    sender_id: req.body.sender_id,
    content: req.body.content,
    content_type: req.body.content_type || 'text',
    created_at: Date.now(),
  };
  messages.set(id, msg);
  res.status(201).json(msg);
}));

app.get('/messages', validateInput({ chat_id: messageValidation.chat_id as any }, 'query'), asyncHandler(async (req: express.Request, res: express.Response) => {
  const chat_id = req.query.chat_id as string;
  
  // Check if chat exists
  if (!chats.has(chat_id)) {
    throw new NotFoundError('Chat', chat_id);
  }
  
  const list = Array.from(messages.values()).filter(m => m.chat_id === chat_id);
  res.json({
    data: list,
    count: list.length,
    chat_id,
    timestamp: new Date().toISOString()
  });
}));

// Reaction endpoints with validation
app.post('/reactions', validateInput(reactionValidation), asyncHandler(async (req: express.Request, res: express.Response) => {
  // Check if message exists
  if (!messages.has(req.body.message_id)) {
    throw new NotFoundError('Message', req.body.message_id);
  }
  
  // Check for duplicate reaction (same user, same message, same emoji)
  const existingReaction = reactions.find(
    r => r.message_id === req.body.message_id && 
         r.user_id === req.body.user_id && 
         r.emoji === req.body.emoji
  );
  
  if (existingReaction) {
    return res.status(200).json(existingReaction); // Return existing reaction
  }
  
  const r: Reaction = { 
    id: `r_${Date.now()}`, 
    message_id: req.body.message_id, 
    user_id: req.body.user_id, 
    emoji: req.body.emoji 
  };
  reactions.push(r);
  res.status(201).json(r);
}));

app.get('/reactions', validateInput({ message_id: reactionValidation.message_id as any }, 'query'), asyncHandler(async (req: express.Request, res: express.Response) => {
  const message_id = req.query.message_id as string;
  
  // Check if message exists
  if (!messages.has(message_id)) {
    throw new NotFoundError('Message', message_id);
  }
  
  const messageReactions = reactions.filter(r => r.message_id === message_id);
  res.json({
    data: messageReactions,
    count: messageReactions.length,
    message_id,
    timestamp: new Date().toISOString()
  });
}));

// Read receipt endpoints with validation
app.post('/read-receipts', validateInput(readReceiptValidation), asyncHandler(async (req: express.Request, res: express.Response) => {
  // Check if message exists
  if (!messages.has(req.body.message_id)) {
    throw new NotFoundError('Message', req.body.message_id);
  }
  
  // Check for existing read receipt
  const existingReceipt = receipts.find(
    r => r.message_id === req.body.message_id && r.user_id === req.body.user_id
  );
  
  if (existingReceipt) {
    return res.status(200).json(existingReceipt);
  }
  
  const rr: ReadReceipt = { 
    id: `rr_${Date.now()}`, 
    message_id: req.body.message_id, 
    user_id: req.body.user_id, 
    read_at: Date.now() 
  };
  receipts.push(rr);
  res.status(201).json(rr);
}));

app.get('/read-receipts', validateInput({ message_id: readReceiptValidation.message_id as any }, 'query'), asyncHandler(async (req: express.Request, res: express.Response) => {
  const message_id = req.query.message_id as string;
  
  // Check if message exists
  if (!messages.has(message_id)) {
    throw new NotFoundError('Message', message_id);
  }
  
  const messageReceipts = receipts.filter(r => r.message_id === message_id);
  res.json({
    data: messageReceipts,
    count: messageReceipts.length,
    message_id,
    timestamp: new Date().toISOString()
  });
}));

// Typing indicator endpoints with validation
app.post('/typing', validateInput(typingValidation), asyncHandler(async (req: express.Request, res: express.Response) => {
  // Check if chat exists
  if (!chats.has(req.body.chat_id)) {
    throw new NotFoundError('Chat', req.body.chat_id);
  }
  
  const t: Typing = { 
    chat_id: req.body.chat_id, 
    user_id: req.body.user_id, 
    is_typing: req.body.is_typing, 
    updated_at: Date.now() 
  };
  
  const idx = typingIndicators.findIndex(x => x.chat_id === t.chat_id && x.user_id === t.user_id);
  if (idx >= 0) {
    typingIndicators[idx] = t;
  } else {
    typingIndicators.push(t);
  }
  
  res.json(t);
}));

app.get('/typing', validateInput({ chat_id: typingValidation.chat_id as any }, 'query'), asyncHandler(async (req: express.Request, res: express.Response) => {
  const chat_id = req.query.chat_id as string;
  
  // Check if chat exists
  if (!chats.has(chat_id)) {
    throw new NotFoundError('Chat', chat_id);
  }
  
  const chatTypingIndicators = typingIndicators.filter(t => t.chat_id === chat_id);
  res.json({
    data: chatTypingIndicators,
    count: chatTypingIndicators.length,
    chat_id,
    timestamp: new Date().toISOString()
  });
}));

// Presence endpoints with validation
app.post('/presence', validateInput(presenceValidation), asyncHandler(async (req: express.Request, res: express.Response) => {
  const p: Presence = { 
    user_id: req.body.user_id, 
    status: req.body.status, 
    updated_at: Date.now() 
  };
  
  const idx = presence.findIndex(x => x.user_id === p.user_id);
  if (idx >= 0) {
    presence[idx] = p;
  } else {
    presence.push(p);
  }
  
  res.json(p);
}));

app.get('/presence', asyncHandler(async (_req: express.Request, res: express.Response) => {
  res.json({
    data: presence,
    count: presence.length,
    timestamp: new Date().toISOString()
  });
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

