import { createClient } from '@supabase/supabase-js';
import { getEnvConfig } from './config/env.js';

// Load environment configuration
const config = getEnvConfig();

// Create Supabase client with proper error handling
export const supabase = createClient(config.supabase.url, config.supabase.anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  global: {
    headers: {
      'x-application-name': 'frosted-chat',
      'x-environment': config.environment,
    },
  },
});

// Enhanced error handling for Supabase operations
supabase.from = new Proxy(supabase.from, {
  apply(target, thisArg, args) {
    const table = args[0];
    const query = Reflect.apply(target, thisArg, args);
    
    // Add error handling to query methods
    const methods = ['select', 'insert', 'update', 'delete', 'upsert'];
    methods.forEach(method => {
      if (query[method]) {
        const original = query[method];
        query[method] = function(...args) {
          const result = original.apply(this, args);
          if (result.then) {
            return result.catch(error => {
              console.error(`Supabase ${method} error on table ${table}:`, error);
              throw new Error(`Database operation failed: ${error.message}`);
            });
          }
          return result;
        };
      }
    });
    
    return query;
  }
});

// Subscription manager with error handling and reconnection logic
class SubscriptionManager {
  constructor() {
    this.subscriptions = new Map();
    this.reconnectAttempts = new Map();
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.channelStates = new Map();
  }

  createSubscription(channelName, config, callback, errorCallback) {
    const channel = supabase.channel(channelName);
    
    // Add event listeners with error handling
    channel.on('postgres_changes', config, (payload) => {
      try {
        callback(payload);
      } catch (error) {
        console.error(`Error in subscription callback for ${channelName}:`, error);
        if (errorCallback) {
          errorCallback(error);
        }
      }
    });

    // Handle subscription state changes
    channel.on('system', (event) => {
      console.log(`Channel ${channelName} system event:`, event);
      this.channelStates.set(channelName, event.type);
      
      if (event.type === 'system' && event.event === 'error') {
        this.handleReconnection(channelName, config, callback, errorCallback);
      }
    });

    // Subscribe with error handling
    const subscription = channel.subscribe((status) => {
      console.log(`Channel ${channelName} subscription status:`, status);
      
      if (status === 'SUBSCRIBED') {
        this.reconnectAttempts.set(channelName, 0);
        this.channelStates.set(channelName, 'subscribed');
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`Channel ${channelName} subscription error`);
        this.handleReconnection(channelName, config, callback, errorCallback);
      } else if (status === 'TIMED_OUT') {
        console.error(`Channel ${channelName} subscription timeout`);
        this.handleReconnection(channelName, config, callback, errorCallback);
      } else if (status === 'CLOSED') {
        console.log(`Channel ${channelName} subscription closed`);
        this.channelStates.set(channelName, 'closed');
      }
    });

    this.subscriptions.set(channelName, subscription);
    return subscription;
  }

  handleReconnection(channelName, config, callback, errorCallback) {
    const attempts = this.reconnectAttempts.get(channelName) || 0;
    
    if (attempts >= this.maxReconnectAttempts) {
      console.error(`Max reconnection attempts reached for ${channelName}`);
      if (errorCallback) {
        errorCallback(new Error('Max reconnection attempts reached'));
      }
      return;
    }

    this.reconnectAttempts.set(channelName, attempts + 1);
    const delay = this.reconnectDelay * Math.pow(2, attempts);
    
    console.log(`Attempting reconnection ${attempts + 1} for ${channelName} in ${delay}ms`);
    
    setTimeout(() => {
      if (this.subscriptions.has(channelName)) {
        this.createSubscription(channelName, config, callback, errorCallback);
      }
    }, delay);
  }

  unsubscribe(channelName) {
    const subscription = this.subscriptions.get(channelName);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(channelName);
      this.reconnectAttempts.delete(channelName);
      this.channelStates.delete(channelName);
      console.log(`Unsubscribed from ${channelName}`);
    }
  }

  getSubscriptionState(channelName) {
    return this.channelStates.get(channelName) || 'unknown';
  }

  getActiveSubscriptions() {
    return Array.from(this.subscriptions.keys());
  }
}

// Global subscription manager instance
export const subscriptionManager = new SubscriptionManager();

// Enhanced subscription functions with error handling
export function subscribeToMessages(chatId, callback, errorCallback) {
  const channelName = `messages:${chatId}`;
  const config = {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `chat_id=eq.${chatId}`
  };

  return subscriptionManager.createSubscription(channelName, config, callback, errorCallback);
}

export function subscribeToReactions(messageId, callback, errorCallback) {
  const channelName = `reactions:${messageId}`;
  const config = {
    event: '*',
    schema: 'public',
    table: 'reactions',
    filter: `message_id=eq.${messageId}`
  };

  return subscriptionManager.createSubscription(channelName, config, callback, errorCallback);
}

export function subscribeToTyping(chatId, callback, errorCallback) {
  const channelName = `typing:${chatId}`;
  const config = {
    event: '*',
    schema: 'public',
    table: 'typing_indicators',
    filter: `chat_id=eq.${chatId}`
  };

  return subscriptionManager.createSubscription(channelName, config, callback, errorCallback);
}

export function subscribeToPresence(userId, callback, errorCallback) {
  const channelName = `presence:${userId}`;
  const config = {
    event: '*',
    schema: 'public',
    table: 'presence_updates',
    filter: `user_id=eq.${userId}`
  };

  return subscriptionManager.createSubscription(channelName, config, callback, errorCallback);
}