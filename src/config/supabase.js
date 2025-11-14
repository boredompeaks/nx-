import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

// Validate environment configuration
if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
  throw new Error('Supabase configuration is missing. Please check your environment variables.');
}

// Create Supabase client with enhanced configuration
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10 // Rate limit for realtime events
    }
  },
  global: {
    headers: {
      'X-Client-Info': 'frosted-chat/1.0.0'
    }
  }
});

// Enhanced subscription manager with error handling and reconnection
class SubscriptionManager {
  constructor() {
    this.subscriptions = new Map();
    this.reconnectAttempts = new Map();
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
  }

  subscribe(channelName, config, callback) {
    // Prevent duplicate subscriptions
    if (this.subscriptions.has(channelName)) {
      console.warn(`Subscription ${channelName} already exists. Unsubscribing first.`);
      this.unsubscribe(channelName);
    }

    const subscription = supabase
      .channel(channelName)
      .on(config.event, config.filter, (payload) => {
        try {
          callback(payload);
        } catch (error) {
          console.error(`Error in subscription callback for ${channelName}:`, error);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Successfully subscribed to ${channelName}`);
          this.reconnectAttempts.set(channelName, 0);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`Channel error for ${channelName}`);
          this.handleReconnection(channelName, config, callback);
        } else if (status === 'TIMED_OUT') {
          console.error(`Subscription timeout for ${channelName}`);
          this.handleReconnection(channelName, config, callback);
        } else if (status === 'CLOSED') {
          console.log(`Channel closed for ${channelName}`);
          this.subscriptions.delete(channelName);
        }
      });

    this.subscriptions.set(channelName, subscription);
    return subscription;
  }

  unsubscribe(channelName) {
    const subscription = this.subscriptions.get(channelName);
    if (subscription) {
      supabase.removeChannel(subscription);
      this.subscriptions.delete(channelName);
      this.reconnectAttempts.delete(channelName);
      console.log(`Unsubscribed from ${channelName}`);
    }
  }

  handleReconnection(channelName, config, callback) {
    const attempts = this.reconnectAttempts.get(channelName) || 0;
    
    if (attempts >= this.maxReconnectAttempts) {
      console.error(`Max reconnection attempts reached for ${channelName}`);
      this.subscriptions.delete(channelName);
      return;
    }

    this.reconnectAttempts.set(channelName, attempts + 1);
    const delay = this.reconnectDelay * Math.pow(2, attempts); // Exponential backoff
    
    console.log(`Attempting reconnection ${attempts + 1} for ${channelName} in ${delay}ms`);
    
    setTimeout(() => {
      if (this.subscriptions.has(channelName)) {
        this.subscribe(channelName, config, callback);
      }
    }, delay);
  }

  unsubscribeAll() {
    for (const [channelName] of this.subscriptions) {
      this.unsubscribe(channelName);
    }
  }
}

export const subscriptionManager = new SubscriptionManager();

// Enhanced subscription functions with error handling
export function subscribeToMessages(chatId, callback) {
  const channelName = `messages:${chatId}`;
  const config = {
    event: 'postgres_changes',
    filter: { 
      event: 'INSERT', 
      schema: 'public', 
      table: 'messages', 
      filter: `chat_id=eq.${chatId}` 
    }
  };
  
  return subscriptionManager.subscribe(channelName, config, callback);
}

export function subscribeToReactions(messageId, callback) {
  const channelName = `reactions:${messageId}`;
  const config = {
    event: 'postgres_changes',
    filter: { 
      event: '*', 
      schema: 'public', 
      table: 'reactions', 
      filter: `message_id=eq.${messageId}` 
    }
  };
  
  return subscriptionManager.subscribe(channelName, config, callback);
}

export function subscribeToTyping(chatId, callback) {
  const channelName = `typing:${chatId}`;
  const config = {
    event: 'postgres_changes',
    filter: { 
      event: '*', 
      schema: 'public', 
      table: 'typing_indicators', 
      filter: `chat_id=eq.${chatId}` 
    }
  };
  
  return subscriptionManager.subscribe(channelName, config, callback);
}

export function subscribeToPresence(userId, callback) {
  const channelName = `presence:${userId}`;
  const config = {
    event: 'postgres_changes',
    filter: { 
      event: '*', 
      schema: 'public', 
      table: 'presence_updates', 
      filter: `user_id=eq.${userId}` 
    }
  };
  
  return subscriptionManager.subscribe(channelName, config, callback);
}

// Graceful cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    subscriptionManager.unsubscribeAll();
  });
}