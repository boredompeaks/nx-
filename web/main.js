import { supabase, subscribeToMessages, subscribeToReactions, subscribeToTyping, subscribeToPresence } from '../src/supabase.js';

// Enhanced API client with error handling
const api = {
  async createChat(name){
    try {
      const response = await fetch('/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to create chat');
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Error - createChat:', error);
      throw error;
    }
  },
  
  async listChats(){ 
    try {
      const response = await fetch('/chats');
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to list chats');
      }
      
      const result = await response.json();
      return result.data || result; // Handle both old and new format
    } catch (error) {
      console.error('API Error - listChats:', error);
      throw error;
    }
  },
  
  async sendMessage(chat_id, sender_id, content){
    try {
      const response = await fetch('/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id,
          sender_id,
          content,
          content_type: 'text'
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to send message');
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Error - sendMessage:', error);
      throw error;
    }
  },
  
  async listMessages(chat_id){ 
    try {
      const response = await fetch('/messages?chat_id='+encodeURIComponent(chat_id));
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to list messages');
      }
      
      const result = await response.json();
      return result.data || result; // Handle both old and new format
    } catch (error) {
      console.error('API Error - listMessages:', error);
      throw error;
    }
  },
  
  async react(message_id, user_id, emoji){
    try {
      const response = await fetch('/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_id, user_id, emoji })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to add reaction');
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Error - react:', error);
      throw error;
    }
  },
  
  async reactions(message_id){ 
    try {
      const response = await fetch('/reactions?message_id='+encodeURIComponent(message_id));
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to get reactions');
      }
      
      const result = await response.json();
      return result.data || result; // Handle both old and new format
    } catch (error) {
      console.error('API Error - reactions:', error);
      throw error;
    }
  },
  
  async messageStatus(message_id){ 
    try {
      const response = await fetch('/message-status?message_id='+encodeURIComponent(message_id));
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to get message status');
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Error - messageStatus:', error);
      throw error;
    }
  },
  
  async searchMessages(chat_id, query){ 
    try {
      const response = await fetch('/search?chat_id='+encodeURIComponent(chat_id)+'&q='+encodeURIComponent(query));
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Search failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Error - searchMessages:', error);
      throw error;
    }
  },
  
  async editMessage(message_id, content){
    try {
      const response = await fetch('/messages/'+encodeURIComponent(message_id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to edit message');
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Error - editMessage:', error);
      throw error;
    }
  },
  
  async deleteMessage(message_id){
    try {
      const response = await fetch('/messages/'+encodeURIComponent(message_id), { method: 'DELETE' });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to delete message');
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Error - deleteMessage:', error);
      throw error;
    }
  },
  
  async markRead(message_id, user_id){ 
    try {
      const response = await fetch('/read-receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_id, user_id })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to mark as read');
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Error - markRead:', error);
      throw error;
    }
  },
  
  async typing(chat_id, user_id, is_typing){ 
    try {
      const response = await fetch('/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id, user_id, is_typing })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to update typing status');
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Error - typing:', error);
      throw error;
    }
  },
  
  async presence(user_id, status){ 
    try {
      const response = await fetch('/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id, status })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to update presence');
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Error - presence:', error);
      throw error;
    }
  }
};

let currentChatId = null;
let currentUser = 'user-demo';
let messageSubscription = null;
let typingSubscription = null;
let isLowEndDevice = false;
let replyingToMessageId = null;

// Detect low-end device
function detectDevicePerformance() {
  const memory = navigator.deviceMemory;
  const cores = navigator.hardwareConcurrency;
  const isLowMemory = memory && memory < 4;
  const isLowCores = cores && cores <= 2;
  isLowEndDevice = isLowMemory || isLowCores || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  if (isLowEndDevice) {
    document.documentElement.classList.add('low-end-device');
  }
}

// Throttle function for performance
function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }
}

function longPress(el, cb, timeout = 600) {
  let timer;
  const start = () => timer = setTimeout(cb, timeout);
  const cancel = () => clearTimeout(timer);
  el.addEventListener('mousedown', start);
  el.addEventListener('mouseup', cancel);
  el.addEventListener('mouseleave', cancel);
  el.addEventListener('touchstart', start);
  el.addEventListener('touchend', cancel);
}

function showMessageActions(messageEl) {
  const existing = messageEl.querySelector('.message-actions');
  if (existing) return;
  
  const actions = document.createElement('div');
  actions.className = 'message-actions';
  
  // Edit button (only for own messages)
  if (messageEl.classList.contains('sent')) {
    const editBtn = document.createElement('button');
    editBtn.className = 'action-btn';
    editBtn.textContent = '✏️';
    editBtn.onclick = () => startEditMessage(messageEl);
    actions.appendChild(editBtn);
  }
  
  // Delete button (only for own messages)
  if (messageEl.classList.contains('sent')) {
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'action-btn';
    deleteBtn.textContent = '🗑️';
    deleteBtn.onclick = async () => {
      if (confirm('Delete this message?')) {
        await api.deleteMessage(messageEl.dataset.id);
        messageEl.remove();
      }
    };
    actions.appendChild(deleteBtn);
  }
  
  // Reply button
  const replyBtn = document.createElement('button');
  replyBtn.className = 'action-btn';
  replyBtn.textContent = '💬';
  replyBtn.onclick = () => startReplyToMessage(messageEl);
  actions.appendChild(replyBtn);
  
  // Reaction button
  const reactBtn = document.createElement('button');
  reactBtn.className = 'action-btn';
  reactBtn.textContent = '😊';
  reactBtn.onclick = () => showReactionBar(messageEl);
  actions.appendChild(reactBtn);
  
  messageEl.appendChild(actions);
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    if (actions.parentElement) actions.remove();
  }, 3000);
}

function startEditMessage(messageEl) {
  const textSpan = messageEl.querySelector('.message-text');
  const currentText = textSpan.textContent;
  
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'edit-input';
  input.value = currentText;
  
  input.onkeydown = async (e) => {
    if (e.key === 'Enter') {
      const newText = input.value.trim();
      if (newText && newText !== currentText) {
        await api.editMessage(messageEl.dataset.id, newText);
        textSpan.textContent = newText;
      }
      textSpan.style.display = '';
      input.remove();
    } else if (e.key === 'Escape') {
      textSpan.style.display = '';
      input.remove();
    }
  };
  
  textSpan.style.display = 'none';
  messageEl.querySelector('.message-content').insertBefore(input, textSpan);
  input.focus();
  input.select();
}

function showReactionBar(messageEl) {
  const existing = messageEl.querySelector('.reaction-bar');
  if (existing) return;
  const bar = document.createElement('div');
  bar.className = 'reaction-bar';
  ['👍','❤️','🎉'].forEach(e=>{
    const btn = document.createElement('button');
    btn.className='reaction-btn';
    btn.textContent=e;
    btn.onclick=async()=>{ await api.react(messageEl.dataset.id,currentUser,e); hideReactionBar(messageEl); };
    bar.appendChild(btn);
  });
  messageEl.appendChild(bar);
}

function startReplyToMessage(messageEl) {
  const messageText = messageEl.querySelector('.message-text').textContent;
  replyingToMessageId = messageEl.dataset.id;
  
  const composer = document.querySelector('.composer');
  let replyIndicator = document.getElementById('reply-indicator');
  
  if (!replyIndicator) {
    replyIndicator = document.createElement('div');
    replyIndicator.id = 'reply-indicator';
    replyIndicator.className = 'reply-indicator';
    composer.insertBefore(replyIndicator, composer.firstChild);
  }
  
  replyIndicator.innerHTML = `
    <div class="reply-content">
      <span class="reply-text">${messageText}</span>
      <button class="cancel-reply" onclick="cancelReply()">✕</button>
    </div>
  `;
  
  document.getElementById('message-input').focus();
}

function cancelReply() {
  replyingToMessageId = null;
  const replyIndicator = document.getElementById('reply-indicator');
  if (replyIndicator) replyIndicator.remove();
}

function hideReactionBar(messageEl) {
  const bar = messageEl.querySelector('.reaction-bar');
  if (bar) bar.remove();
}

async function refreshChats(){
  try {
    const list = await api.listChats();
    const el = document.getElementById('chat-list');
    el.innerHTML = '';
    
    if (!Array.isArray(list)) {
      console.error('Invalid chat list format:', list);
      return;
    }
    
    list.forEach(c=>{
      const div = document.createElement('div');
      div.textContent = c.name || c.id;
      div.className = 'message';
      div.onclick = () => loadChat(c.id);
      el.appendChild(div);
    });
  } catch (error) {
    console.error('Failed to refresh chats:', error);
    // Show user-friendly error message
    const el = document.getElementById('chat-list');
    el.innerHTML = '<div class="error-message">Failed to load chats. Please try again.</div>';
  }
}

async function loadChat(id){
  try {
    // Unsubscribe from previous chat and cleanup fallbacks
    if (messageSubscription) {
      messageSubscription.unsubscribe();
      messageSubscription = null;
    }
    if (typingSubscription) {
      typingSubscription.unsubscribe();
      typingSubscription = null;
    }
    
    // Cleanup fallback polling intervals
    if (window.fallbackIntervals && window.fallbackIntervals.has(currentChatId)) {
      clearInterval(window.fallbackIntervals.get(currentChatId));
      window.fallbackIntervals.delete(currentChatId);
    }
    
    currentChatId = id;
    document.getElementById('chat-name').textContent = 'Chat '+id;
    
    // Load messages with error handling
    const msgs = await api.listMessages(id);
    renderMessages(msgs);
    
    // Subscribe to new messages in this chat with error handling
    messageSubscription = subscribeToMessages(id, (payload) => {
      if (payload.eventType === 'INSERT') {
        const newMessage = payload.new;
        // Only add if it's not from current user (to avoid duplicates)
        if (newMessage.sender_id !== currentUser) {
          addMessageToUI(newMessage);
        }
      }
    }, (error) => {
      console.error('Message subscription error:', error);
      // Fallback: poll for messages every 5 seconds if subscription fails
      const fallbackInterval = setInterval(async () => {
        try {
          const msgs = await api.listMessages(id);
          renderMessages(msgs);
        } catch (pollError) {
          console.error('Fallback polling failed:', pollError);
        }
      }, 5000);
      
      // Store interval for cleanup
      window.fallbackIntervals = window.fallbackIntervals || new Map();
      window.fallbackIntervals.set(id, fallbackInterval);
    });
    
    // Subscribe to typing indicators with error handling
    typingSubscription = subscribeToTyping(id, (payload) => {
      const typingEl = document.getElementById('typing-indicator');
      if (payload.new.user_id !== currentUser) {
        typingEl.classList.toggle('hidden', !payload.new.is_typing);
      }
    }, (error) => {
      console.error('Typing subscription error:', error);
      // Hide typing indicator on subscription failure
      document.getElementById('typing-indicator').classList.add('hidden');
    });
    
  } catch (error) {
    console.error('Failed to load chat:', error);
    // Show user-friendly error message
    const messagesEl = document.getElementById('messages');
    messagesEl.innerHTML = '<div class="error-message">Failed to load messages. Please try again.</div>';
  }
}

async function addMessageToUI(message) {
  const el = document.getElementById('messages');
  const div = document.createElement('div');
  div.className = 'message '+(message.sender_id===currentUser?'sent':'');
  div.dataset.id = message.id;
  
  const timestamp = message.created_at ? new Date(message.created_at).toLocaleTimeString() : '';
  const statusIcon = message.sender_id === currentUser ? '<span class="message-status">✓</span>' : '';
  
  div.innerHTML = `
    <div class="message-content">
      <span class="message-text">${message.content}</span>
      <div class="message-meta">
        <span class="message-time">${timestamp}</span>
        ${statusIcon}
      </div>
    </div>
    <div class="message-reactions" id="reactions-${message.id}"></div>
  `;
  
  longPress(div, ()=>showMessageActions(div));
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
  
  // Load and display reactions
  if (message.id) {
    try {
      const reactions = await api.reactions(message.id);
      displayReactions(message.id, reactions);
    } catch (error) {
      console.error('Failed to load reactions:', error);
    }
  }
}

function displayReactions(messageId, reactions) {
  const reactionsEl = document.getElementById(`reactions-${messageId}`);
  if (!reactionsEl || !reactions.length) return;
  
  const reactionCounts = {};
  reactions.forEach(reaction => {
    reactionCounts[reaction.emoji] = (reactionCounts[reaction.emoji] || 0) + 1;
  });
  
  reactionsEl.innerHTML = Object.entries(reactionCounts)
    .map(([emoji, count]) => `<span class="reaction-badge">${emoji} ${count}</span>`)
    .join('');
}

function renderMessages(msgs){
  const el = document.getElementById('messages');
  el.innerHTML = '';
  msgs.forEach(m=>{
    addMessageToUI(m);
  });
}

document.getElementById('new-chat').onclick = async () => {
  const c = await api.createChat('Demo Chat');
  await refreshChats();
  await loadChat(c.id);
};

document.getElementById('send').onclick = async () => {
  const input = document.getElementById('message-input');
  const text = input.value.trim();
  if(!text || !currentChatId) return;
  document.getElementById('typing-indicator').classList.add('hidden');
  
  // Handle reply
  const replyToId = replyingToMessageId;
  if (replyingToMessageId) {
    cancelReply();
  }
  
  // Add message to UI immediately (optimistic update)
  const tempMessage = {
    id: `temp_${Date.now()}`,
    sender_id: currentUser,
    content: text,
    content_type: 'text',
    reply_to_id: replyToId
  };
  addMessageToUI(tempMessage);
  
  input.value='';
  
  try {
    await api.sendMessage(currentChatId, currentUser, text);
    // Message will appear via realtime subscription, so we don't need to refresh
  } catch (error) {
    console.error('Failed to send message:', error);
    // Remove temporary message on error
    const tempEl = document.querySelector(`[data-id="${tempMessage.id}"]`);
    if (tempEl) tempEl.remove();
  }
};

// Throttled typing indicator for performance
const throttledTyping = throttle(async (isTyping) => {
  if(currentChatId) await api.typing(currentChatId, currentUser, isTyping);
}, 1000);

// Search functionality
let searchTimeout;
document.getElementById('search-chats').addEventListener('input', async (e) => {
  const query = e.target.value.trim();
  if (!query || !currentChatId) return;
  
  // Debounce search
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    try {
      const results = await api.searchMessages(currentChatId, query);
      highlightSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    }
  }, 300);
});

function highlightSearchResults(results) {
  // Remove previous highlights
  document.querySelectorAll('.search-highlight').forEach(el => {
    el.classList.remove('search-highlight');
  });
  
  // Highlight new results
  results.forEach(message => {
    const messageEl = document.querySelector(`[data-id="${message.id}"]`);
    if (messageEl) {
      messageEl.classList.add('search-highlight');
    }
  });
}

document.getElementById('message-input').oninput = async (e) => {
  const val = e.target.value;
  const typingEl = document.getElementById('typing-indicator');
  typingEl.classList.toggle('hidden', val.length===0);
  throttledTyping(val.length>0);
};

// Initialize device detection and optimizations
detectDevicePerformance();

// Theme toggle functionality
let isDarkTheme = true;
document.getElementById('theme-toggle').onclick = () => {
  isDarkTheme = !isDarkTheme;
  document.body.classList.toggle('light-theme', !isDarkTheme);
  document.getElementById('theme-toggle').textContent = isDarkTheme ? '🌙' : '☀️';
  localStorage.setItem('theme', isDarkTheme ? 'dark' : 'light');
};

// Load saved theme
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') {
  isDarkTheme = false;
  document.body.classList.add('light-theme');
  document.getElementById('theme-toggle').textContent = '☀️';
}

// Optimize message rendering for low-end devices
function renderMessagesOptimized(msgs){
  const el = document.getElementById('messages');
  el.innerHTML = '';
  
  // Use DocumentFragment for better performance
  const fragment = document.createDocumentFragment();
  
  msgs.forEach(m=>{
    const div = document.createElement('div');
    div.className = 'message '+(m.sender_id===currentUser?'sent':'');
    div.dataset.id = m.id;
    div.innerHTML = `<span>${m.content}</span>`;
    
    // Only add long-press for non-low-end devices or reduce timeout
    if (!isLowEndDevice) {
      longPress(div, ()=>showMessageActions(div));
    } else {
      // Reduced timeout for low-end devices
      longPress(div, ()=>showMessageActions(div), 400);
    }
    
    fragment.appendChild(div);
  });
  
  el.appendChild(fragment);
}

// Override renderMessages with optimized version
const originalRenderMessages = renderMessages;
renderMessages = function(msgs){
  if (isLowEndDevice) {
    renderMessagesOptimized(msgs);
  } else {
    originalRenderMessages(msgs);
  }
};

api.presence(currentUser,'online');
refreshChats();

