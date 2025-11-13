# FROSTED CHAT - COMPLETE IMPLEMENTATION PLAN

**Version**: 1.0  
**Date**: 2025-11-11  
**Total Features**: 50+ features across backend and frontend

---

## BACKEND CATEGORY

### feature: authentication_system
**How it's done**: Supabase Auth integration with email/password registration and login
- User registration creates account in auth.users (Supabase managed)
- Profile automatically created via trigger `handle_new_user()` in auth.users
- Login via Supabase auth.signInWithPassword()
- Session management handled by Supabase client
- Auth state maintained in React context (AuthContext)
- Logout clears all auth data and redirects to login

**Function**: Handles user registration, login, logout, and session management
- Register new users with email and password
- Authenticate existing users
- Maintain user session across page refreshes
- Provide authenticated user object to all components
- Auto-create user profile on registration
- Redirect unauthenticated users to login

**db_schema**: 
- `auth.users` (Supabase managed table)
- `profiles` table with foreign key to auth.users
- Trigger: `handle_new_user()` creates profile on user creation

---

### feature: user_profiles
**How it's done**: User profile data stored in profiles table with real-time updates
- Profile created on user registration (via trigger)
- Username must be unique (enforced by UNIQUE constraint)
- Profile updates via Supabase client
- Real-time subscription to profile changes
- Profile includes: username, display_name, avatar_url, status, bio, public_key, last_seen

**Function**: Manages user profile information
- Create profile on registration
- Update profile information (username, display name, bio, avatar)
- Track user's online/offline status
- Store last seen timestamp
- Display profile info in chat list and conversation header
- Enforce unique usernames
- Public profile for user discovery

**db_schema**:
```sql
TABLE profiles (
  id uuid (FK to auth.users),
  username text UNIQUE NOT NULL,
  display_name text,
  avatar_url text,
  status text DEFAULT 'offline',
  bio text,
  public_key text,
  last_seen timestamp DEFAULT now(),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
)
```

---

### feature: chat_management
**How it's done**: Chat entities stored in chats table with participants
- Chat created via POST to chats table
- Two participants automatically added to chat_participants
- Chat updated with timestamp on new messages
- Support for both 1-on-1 and group chats (is_group boolean)
- RLS policies restrict access to chat participants only

**Function**: Creates and manages chat conversations
- Create new chat between two users
- Store chat metadata (name, group status, avatar, creator)
- Track chat creation and last activity timestamps
- Query user's chats via chat_participants join
- Prevent duplicate chats between same users
- Support future group chat expansion

**db_schema**:
```sql
TABLE chats (
  id uuid PRIMARY KEY,
  name text,
  is_group boolean DEFAULT false,
  avatar_url text,
  created_by uuid (FK to profiles),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  last_message_at timestamp DEFAULT now()
)

TABLE chat_participants (
  id uuid PRIMARY KEY,
  chat_id uuid (FK to chats),
  user_id uuid (FK to profiles),
  role text DEFAULT 'member',
  joined_at timestamp DEFAULT now(),
  last_read_at timestamp DEFAULT now(),
  muted boolean DEFAULT false,
  UNIQUE(chat_id, user_id)
)
```

---

### feature: message_system_with_e2ee
**How it's done**: Messages encrypted with AES-256-CBC using passphrase-derived keys
- Message content encrypted before storage (is_encrypted=true)
- Key derivation: PBKDF2-SHA256 with 150,000 iterations
- Salt: SHA256 of chat_id
- AES-256-CBC with random IV per message
- Encrypted payload: {ciphertext, iv, senderId, timestamp}
- Password stored in sessionStorage (not persisted)
- Decryption on-demand with cached password

**Function**: Sends and receives encrypted messages
- Encrypt message content with derived key
- Store only encrypted content in database
- Decrypt messages when password is provided
- Cache passwords in sessionStorage for active session
- Support for disappearing messages (disappear_after + disappears_at)
- Support for one-time view messages (is_one_time_view + viewed_at)
- Reply to messages (reply_to_id foreign key)
- Store media URLs for attachments

**db_schema**:
```sql
TABLE messages (
  id uuid PRIMARY KEY,
  chat_id uuid (FK to chats),
  sender_id uuid (FK to profiles),
  content text NOT NULL,  -- Encrypted content
  content_type text DEFAULT 'text',
  media_url text,
  is_encrypted boolean DEFAULT true,
  is_one_time_view boolean DEFAULT false,
  viewed_at timestamp,
  disappear_after integer,  -- seconds
  disappears_at timestamp,
  reply_to_id uuid (FK to messages),
  read_at timestamp,
  delivered_at timestamp,
  created_at timestamp DEFAULT now()
)

-- Trigger updates last_message_at on new message
TRIGGER update_conversation_timestamp()
```

---

### feature: e2ee_key_management
**How it's done**: Passphrase-based key derivation with session storage
- User enters passphrase for each chat
- Key derived using PBKDF2-SHA256 (150k iterations)
- Salt: SHA256(chatId) - deterministic per chat
- Key: 256-bit AES key
- Passwords cached in sessionStorage under 'chat_session_passwords'
- Password validation: minimum 8 characters
- Clear password on logout or explicit clear
- Support for multiple chat passwords simultaneously

**Function**: Manages encryption keys derived from user passphrases
- Derive unique encryption key per chat from passphrase
- Validate passphrase format (8+ characters)
- Store passwords in sessionStorage for active session
- Clear password from storage on logout
- Support passphrase re-entry if not cached
- Handle decryption errors (wrong password detection)
- Generate secure random passwords if needed

**Key Functions**:
- `deriveChatKey(passphrase, chatId)` - Derive key using PBKDF2
- `setChatPassword(chatId, password)` - Cache password
- `getChatPassword(chatId)` - Retrieve cached password
- `clearChatPassword(chatId)` - Remove from cache
- `validatePassword(password)` - Validate format

---

### feature: read_receipts_system
**How it's done**: Real-time read receipt tracking with batch updates
- Read receipt stored in messages.read_at (simple) and read_receipts (full)
- Mark message as read when user views it
- Batch mark all messages as read for chat
- Real-time updates via Supabase subscription
- Read receipts show in message UI (single tick, double tick)
- Optimistic UI updates for instant feedback
- Fallback retry mechanism if database update fails

**Function**: Tracks when messages have been read
- Mark single message as read (when user scrolls to it)
- Mark all messages in chat as read (bulk operation)
- Display read status in message UI
- Real-time update of read receipts across devices
- Track read timestamp per user
- Support read receipts for encrypted messages
- Optimistic UI with rollback on failure

**db_schema**:
```sql
TABLE messages (
  read_at timestamp  -- Simple read tracking
)

TABLE read_receipts (
  id uuid PRIMARY KEY,
  message_id uuid (FK to messages),
  user_id uuid (FK to auth.users),
  conversation_id uuid (FK to chats),
  read_at timestamp DEFAULT now(),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  UNIQUE(message_id, user_id)
)

-- Optimistic updates via Supabase realtime
-- Retry mechanism on failure
```

---

### feature: message_reactions
**How it's done**: Emoji reactions stored in reactions table with real-time updates
- Reactions stored as emoji + user_id pair per message
- Real-time subscription to reaction changes
- Toggle reaction on/off (add/remove on click)
- Support multiple different emojis per user per message
- Aggregate reaction counts displayed on message
- User's own reactions highlighted

**Function**: Allows users to react to messages with emojis
- Add emoji reaction to any message
- Remove own reaction by clicking same emoji
- Display reaction counts on message
- Show which reactions user has selected
- Real-time sync of reactions across all users
- Support for 7 default emojis: 👍, ❤️, 😊, 😂, 😮, 😢, 🎉
- Prevent duplicate reactions from same user

**db_schema**:
```sql
TABLE reactions (
  id uuid PRIMARY KEY,
  message_id uuid (FK to messages),
  user_id uuid (FK to profiles),
  emoji text NOT NULL,
  created_at timestamp DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
)

-- Real-time updates via Supabase subscription
-- Optimistic UI updates
```

---

### feature: presence_tracking_system
**How it's done**: Real-time presence via presence_updates table + Supabase Presence API
- Track online/offline/away status
- Update presence on user activity (typing, sending messages)
- Auto-away after 5 minutes of inactivity
- Manual status setting (online/away/offline)
- Connection quality tracking (excellent/good/poor/unknown)
- Device info (browser, OS) stored in JSON
- Heartbeat mechanism updates last_seen

**Function**: Shows which users are online/offline/away
- Display online status in chat list (green dot)
- Show "Online", "Away", "Offline" in conversation header
- Auto-detect user activity and update status
- Track connection quality
- Show last seen timestamp
- Real-time status updates across all users
- Device and browser information tracking

**db_schema**:
```sql
TABLE presence_updates (
  id uuid PRIMARY KEY,
  user_id uuid (FK to profiles),
  status text CHECK (status IN ('online', 'offline', 'away')),
  connection_quality text CHECK (connection_quality IN ('excellent', 'good', 'poor', 'unknown')),
  device_info jsonb,
  updated_at timestamp DEFAULT now()
)

TABLE profiles (
  last_seen timestamp DEFAULT now(),
  is_online boolean  -- Computed from presence
)

-- Trigger: update_profile_presence()
-- Real-time via Supabase Presence API
-- Auto-away after 5 minutes
```

---

### feature: typing_indicators
**How it's done**: Real-time typing status via typing_indicators table
- Typing status tracked per conversation
- User marked as typing when they start typing
- Auto-clear typing status after 3 seconds of inactivity
- Cleanup stale indicators via trigger
- Real-time subscription to typing changes
- Typing indicator shown in conversation UI

**Function**: Shows when other user is typing
- Track typing status per user per conversation
- Show "User is typing..." indicator in conversation
- Auto-clear after 3 seconds of no activity
- Real-time sync across all participants
- Cleanup expired indicators via trigger
- Typing status shown in conversation header

**db_schema**:
```sql
TABLE typing_indicators (
  id uuid PRIMARY KEY,
  conversation_id uuid (FK to chats),
  user_id uuid (FK to profiles),
  is_typing boolean DEFAULT true,
  updated_at timestamp DEFAULT now(),
  created_at timestamp DEFAULT now(),
  UNIQUE(conversation_id, user_id)
)

-- Trigger: cleanup_stale_typing_indicators() - removes >2 min old
-- Trigger: update_typing_indicators_updated_at() - auto-update timestamp
-- Real-time via Supabase subscription
```

---

### feature: realtime_messaging
**How it's done**: Supabase Realtime for instant message delivery
- Real-time subscriptions on messages, reactions, presence, typing
- PostgreSQL LISTEN/NOTIFY for instant updates
- Multiple channels per chat (messages, reactions, presence)
- Automatic reconnection on connection loss
- Optimistic UI updates for instant feedback
- Merge real-time updates with local state

**Function**: Delivers messages and updates in real-time
- Instant message delivery without refresh
- Real-time reaction updates
- Live typing indicators
- Live presence updates
- Automatic reconnection handling
- Handle network interruptions gracefully
- Maintain UI state during real-time updates

**Realtime Channels**:
- `chat:{chatId}:messages` - New message notifications
- `chat:{chatId}:reactions` - Reaction changes
- `presence:{chatId}` - Typing and presence via Supabase Presence API

**Subscription Management**:
- Subscribe on component mount
- Unsubscribe on unmount
- Update local state on real-time events
- Handle INSERT, UPDATE, DELETE events
- Merge real-time data with cache

---

### feature: message_cache_system
**How it's done**: localStorage-based client-side caching
- Cache messages per chat in localStorage
- Cache pagination offset
- Save on every successful message fetch
- Load from cache on component mount
- Background refresh to keep cache fresh
- Error handling for cache failures
- Clear cache on logout

**Function**: Improves performance by caching messages locally
- Store recent messages in localStorage
- Instant message loading from cache
- Cache pagination state
- Background refresh to stay current
- Reduce database queries
- Improve perceived performance
- Handle cache misses gracefully

**Cache Structure**:
- Key: `chat-messages-{chatId}` - Array of messages
- Key: `chat-offset-{chatId}` - Current pagination offset
- Persist across page refreshes
- Clear on user logout
- Merge with fresh data from server

---

### feature: optimistic_ui_updates
**How it's done**: Immediate UI updates with server sync in background
- Add message to UI immediately on send
- Assign temporary ID for optimistic message
- Send to server in background
- Replace optimistic message with server response
- Rollback on failure with error message
- Timeout fallback (3 seconds)

**Function**: Provides instant feedback when sending messages
- Show message in chat immediately
- Show "Sending..." state
- Send to server asynchronously
- Update with server timestamp and ID
- Rollback on error with retry option
- Maintain smooth user experience

**Implementation**:
- Temporary ID: `temp-{timestamp}-{random}`
- Optimistic state in React
- Server response replaces optimistic data
- Timeout: 3 seconds fallback
- Error state: "Failed to send - Tap to retry"
- Automatic retry on network recovery

---

### feature: message_pagination
**How it's done**: Offset-based pagination with "load more" functionality
- Load 50 messages at a time
- Track offset in state and localStorage
- "Load more" button loads previous messages
- Merge new messages with existing
- Disable "load more" when at beginning
- Prefetch next page on scroll

**Function**: Efficiently loads large message histories
- Initial load: first 50 messages (most recent)
- "Load more" loads 50 older messages
- Merge with existing messages
- Track total loaded for "load more" state
- Optimize for performance with large histories
- Maintain scroll position during load

**Pagination Logic**:
- `offset` - Number of messages loaded
- `hasMore` - Boolean if more messages available
- `loadMoreMessages()` - Fetch previous messages
- `MESSAGE_PAGE_SIZE` - 50 messages per page
- Reverse chronological ordering
- Merge by ID to prevent duplicates

---

### feature: message_deletion
**How it's done**: Soft delete via hidden_messages table + hard delete after delay
- Soft delete: Add to hidden_messages table
- User-specific deletion (only hidden for deleter)
- Hard delete: Remove from messages table after delay
- Real-time updates notify other users
- UI updates immediately on delete action
- Support for disappearing messages with timer

**Function**: Allows users to delete their own messages
- Delete message for everyone (hard delete)
- Hide message for self (soft delete)
- Disappearing messages auto-delete after timer
- One-time view messages delete after viewing
- Real-time notification of deletions
- Prevent deletion of other users' messages

**db_schema**:
```sql
TABLE hidden_messages (
  id uuid PRIMARY KEY,
  message_id uuid (FK to messages),
  hidden_by_user_id uuid (FK to profiles),
  hidden_at timestamp DEFAULT now(),
  user_id uuid (FK to profiles),
  conversation_id uuid (FK to chats),
  created_at timestamp DEFAULT now()
)

-- Soft delete: Add to hidden_messages
-- Hard delete: DELETE from messages
-- Real-time via Supabase subscription
```

---

### feature: message_status_tracking
**How it's done**: Delivery and read status tracking in message_status table
- Track delivered_at when message reaches server
- Track read_at when recipient views message
- Store per-user status
- Real-time updates via Supabase
- Optimistic updates for instant feedback
- Support for message retry on failure

**Function**: Tracks message delivery and read status
- Show single check (sent)
- Show double check (delivered)
- Show double blue check (read)
- Track exact timestamps
- Real-time status updates
- Handle delivery failures with retry
- Per-recipient status tracking

**db_schema**:
```sql
TABLE message_status (
  id uuid PRIMARY KEY,
  message_id uuid (FK to messages),
  user_id uuid (FK to profiles),
  is_delivered boolean DEFAULT false,
  is_read boolean DEFAULT false,
  delivered_at timestamp,
  read_at timestamp,
  UNIQUE(message_id, user_id)
)

-- Real-time updates via Supabase
-- Optimistic UI with retry on failure
```

---

### feature: search_functionality
**How it's done**: Username-based search in profiles table
- Search by username substring
- Case-insensitive ILIKE query
- Exclude current user from results
- Limit to 50 results
- Real-time search as user types
- Display user status with results

**Function**: Allows users to find and start chats with other users
- Search for users by username
- Real-time results as typing
- Show user status (online/offline)
- Click result to start new chat
- Exclude self from search results
- Display avatar placeholder (first letter)

**Search Query**:
```sql
SELECT id, username, status
FROM profiles
WHERE id != ${currentUserId}
  AND username ILIKE '%${searchQuery}%'
ORDER BY username
LIMIT 50
```

---

### feature: media_sharing
**How it's done**: Supabase Storage for file uploads
- Upload to Supabase storage bucket 'chat-media'
- Path: `${userId}/${fileName}`
- Support images, videos, documents
- Public URL generation for media display
- File metadata stored in messages.media_url
- One-time view support for sensitive media

**Function**: Allows users to share media files in chats
- Upload images, videos, documents
- Display media in message bubble
- Download/view media from storage
- Support for one-time view (auto-delete after viewing)
- File type validation
- Error handling for upload failures

**File Upload Flow**:
- Select file via file input
- Upload to Supabase storage
- Get public URL
- Insert message with media_url
- Display media in chat
- One-time view: mark as viewed after access

---

### feature: security_audit_logging
**How it's done**: Audit trail for security events
- Log authentication events
- Log password attempts
- Log decryption failures
- Store in database with timestamps
- Track IP addresses and user agents
- Alert on suspicious activity

**Function**: Maintains security audit trail
- Track all authentication events
- Log password validation attempts
- Record decryption failures (potential attacks)
- Track failed login attempts
- Store metadata (IP, user agent, timestamp)
- Support security analysis and monitoring

**Events Logged**:
- User login/logout
- Password validation
- Decryption attempts
- Failed auth attempts
- Chat access
- Message operations

---

## FRONTEND CATEGORY

### feature: login_interface
**How it's done**: Glassmorphism-styled login form with email/password
- GlassContainer with blur background effect
- Email and password inputs with validation
- Submit button with loading state
- Toast notifications for errors
- Redirect to /chats on success
- Link to register page

**Function**: Authenticates users and redirects to chat
- Display login form with email/password
- Validate inputs (non-empty, valid email)
- Show loading state during authentication
- Display errors via toast notifications
- Redirect to /chats on successful login
- Link to registration for new users
- Clear form on successful login

**UI Elements**:
- GlassContainer wrapper
- Form with email and password fields
- GlassInput components with styling
- GlassButton for submit
- Loading spinner during auth
- Toast notifications
- Link to register page

---

### feature: register_interface
**How it's done**: Registration form with email/password confirmation
- Email and password inputs
- Confirm password validation
- Email uniqueness check
- Password strength validation
- Show loading state
- Toast notifications for errors
- Auto-login after registration

**Function**: Creates new user account and logs in
- Display registration form
- Validate email format
- Validate password (min length, match)
- Check email uniqueness
- Create account via Supabase Auth
- Auto-login on success
- Show errors for validation failures
- Redirect to /chats after successful registration

**Validation Rules**:
- Email: Valid email format, unique
- Password: Min 8 characters, confirm match
- All fields required
- Email uniqueness enforced by database

---

### feature: calculator_decoy
**How it's done**: Functional calculator with hidden unlock mechanism
- Fully functional calculator UI
- Unlocks on two conditions: code "1337" OR long-press for 1.5 seconds
- Visual progress indicator during long-press
- Smooth animations and transitions
- Glassmorphism design
- Calculator operations work normally
- No indication of unlock functionality

**Function**: Provides stealth access to chat application
- Display as normal calculator app
- Accept "1337" code input (appear as calculation)
- Accept long-press (1.5s) on any button
- Show visual progress bar during long-press
- Call onUnlock() callback when activated
- Smooth transition to chat app
- Maintain calculator functionality for decoy

**Unlock Mechanisms**:
1. Enter "1337" and press equals
2. Long-press any button for 1.5 seconds
3. Visual feedback: progress bar
4. Animations: smooth transition to chat

**UI Elements**:
- Full calculator layout (0-9, +, -, ×, ÷, =, C)
- Display screen with current value
- Glassmorphism styling
- Progress indicator for long-press
- Animations using Framer Motion
- Responsive button grid

---

### feature: chat_list_interface
**How it's done**: Glassmorphism list showing user's chats with previews
- GlassContainer with scroll
- Search bar at top
- Chat list with preview info
- Unread count badges
- Last message preview
- Last activity timestamp
- Online status indicator
- Empty state when no chats

**Function**: Displays all user chats with latest activity
- Show all chats user participates in
- Display chat partner's username
- Show last message preview (truncated)
- Show unread count badge
- Show last activity timestamp
- Show online status (green dot)
- Search functionality to filter chats
- Click chat to navigate to conversation

**UI Elements**:
- GlassContainer wrapper
- SearchBar component
- GlassCard for each chat
- Avatar placeholder (first letter of username)
- Green dot for online status
- GlassBadge for unread count
- Timestamp formatting (time if < 24h, date if older)
- Empty state with "No chats found"

**Data Source**: useChatData hook with chats query

---

### feature: new_chat_interface
**How it's done**: User search and chat creation flow
- Search bar to find users
- Real-time search results
- Click user to start chat
- Check for existing chat
- Create new chat if none exists
- Navigate to new chat
- Loading states throughout

**Function**: Creates new chats with other users
- Display search interface
- Search users by username
- Show search results in real-time
- Click user to create chat
- Check for existing chat first
- Create chat_participants entries
- Navigate to new chat
- Show loading states and errors

**User Search**:
- Real-time as user types
- Exclude current user
- Show username and status
- Click to start chat
- Limit 50 results

**Chat Creation Flow**:
1. Check existing chats for both users
2. If exists, navigate to existing chat
3. If not, create new chat
4. Add both users to chat_participants
5. Navigate to new chat

---

### feature: conversation_interface
**How it's done**: Full-featured chat interface with real-time messaging
- GlassContainer with header, messages, input
- Message list with pagination
- Typing indicator
- Online status display
- Emoji picker for reactions
- Real-time message updates
- Optimistic message sending
- Message read receipts

**Function**: Main chat interface for messaging
- Display chat partner info in header
- Show all messages in chat
- Handle message sending
- Real-time message updates
- Show typing indicators
- Show online status
- Support message reactions
- Pagination (load more messages)
- Mark messages as read
- Show read receipts

**UI Layout**:
- Header: Back button, avatar, username, status
- Messages: Scrollable list with message bubbles
- Input: Text input, send button, optional file upload
- Typing indicator: "User is typing..."
- Emoji picker: Popup with reaction options

**Data Source**: useChatData hook (1,017 lines)

---

### feature: message_component
**How it's done**: Individual message bubble with actions
- Differentiate sent vs received messages
- Show message content
- Show timestamp
- Reaction display
- One-time view handling
- Disappearing message handling
- Reply reference display
- Media display (images, files)

**Function**: Renders individual messages with metadata
- Display message content (decrypted)
- Show sent/received styling
- Display timestamp
- Show reaction counts
- Handle one-time view messages
- Handle disappearing messages
- Show reply reference
- Display media attachments
- Show read status
- Support message actions (react, delete)

**Message States**:
- Sending (optimistic)
- Sent (single check)
- Delivered (double check)
- Read (double blue check)
- Failed (error state)
- One-time view (hidden after viewing)
- Disappeared (auto-deleted)

**UI Elements**:
- Message bubble (left for received, right for sent)
- Timestamp display
- Reaction display
- Read receipts
- One-time view indicator
- Disappearing timer

---

### feature: message_input
**How it's done**: Rich text input with send functionality
- Text input with placeholder
- Send button
- File upload button
- Typing status updates
- Character count
- Auto-resize input
- Enter to send
- Shift+Enter for newline
- Emoji support

**Function**: Handles message composition and sending
- Multi-line text input
- Send message on Enter
- Support for file attachments
- Show typing status to other users
- Validate message before send
- Clear input after send
- Auto-resize as user types
- Support emojis
- Handle long messages

**Input Features**:
- Text input with placeholder
- Auto-resize height
- Enter to send, Shift+Enter for newline
- File upload button
- Typing indicator updates (throttled)
- Character validation
- Loading state during send

---

### feature: emoji_picker
**How it's done**: Popup with predefined emoji reactions
- 7 predefined emojis: 👍, ❤️, 😊, 😂, 😮, 😢, 🎉
- Click emoji to react
- Toggle reaction on/off
- Show on long-press or button click
- Auto-close after selection
- Highlight user's reactions
- Reaction count display

**Function**: Allows quick emoji reactions to messages
- Display emoji selection popup
- Click emoji to add/remove reaction
- Toggle existing reactions
- Show selected emojis highlighted
- Auto-close after selection
- Display reaction counts
- Real-time sync of reactions

**Emoji Set**:
- 👍 (Thumbs up)
- ❤️ (Heart)
- 😊 (Smile)
- 😂 (Laugh)
- 😮 (Wow)
- 😢 (Sad)
- 🎉 (Celebrate)

**UI Behavior**:
- Appear on message long-press or reaction button
- Popup with horizontal emoji list
- Highlight if user has already reacted
- Auto-close after click
- Smooth animations

---

### feature: e2ee_password_prompt
**How it's done**: Modal dialog for password entry
- Glassmorphism dialog
- Password input with validation
- Show/hide password toggle
- Cancel and submit buttons
- Loading state during unlock
- Error handling
- Auto-focus on password field

**Function**: Prompts user for chat encryption password
- Display modal when password required
- Password input field
- Validation (min 8 characters)
- Store password in sessionStorage
- Call unlock callback on success
- Show loading state during unlock
- Display errors for invalid password
- Close modal on cancel

**UI Elements**:
- Dialog component with backdrop
- Lock icon and title
- Password input with lock icon
- Validation error display
- Cancel and Unlock buttons
- Loading spinner
- Glassmorphism styling

**Validation**:
- Min 8 characters
- Required field
- Show error for invalid password

---

### feature: presence_indicators
**How it's done**: Real-time online/offline/away status display
- Online: Green dot in chat list
- Away: Yellow dot in chat list
- Offline: Gray dot in chat list
- "Online" text in conversation header
- "Away" text in conversation header
- Last seen timestamp
- Auto-away after 5 minutes

**Function**: Shows user presence status in real-time
- Display status dot in chat list
- Show status text in conversation header
- Update in real-time via presence hook
- Auto-away detection
- Last seen timestamp display
- Connection quality indicator

**Status Types**:
- Online (green dot) - User active
- Away (yellow dot) - Inactive 5+ minutes
- Offline (gray dot) - Not connected

**Data Source**: usePresence hook (411 lines)

---

### feature: typing_indicator
**How it's done**: Animated typing indicator
- Three animated dots
- Show when other user is typing
- Hide when user stops typing or sends message
- Display in conversation header
- Auto-hide after 3 seconds
- Real-time via presence hook

**Function**: Shows when other user is typing
- Animated dots in conversation header
- "User is typing..." text
- Show when typing starts
- Hide when typing stops (3s delay)
- Hide when message sent
- Real-time sync across devices

**Animation**:
- Three dots (∙ ∙ ∙)
- Bounce animation
- Smooth transitions
- 3-second timeout

**Data Source**: usePresence hook with isOtherUserTyping

---

### feature: chat_header
**How it's done**: Conversation header with user info
- Back button to chats
- User avatar (letter placeholder)
- Username display
- Status text (online/typing/away)
- Optional actions menu
- Glassmorphism design

**Function**: Shows conversation participant info
- Display chat partner's username
- Show online/typing/away status
- Back button to chat list
- Avatar (first letter of username)
- Optional menu (settings, etc.)
- Glassmorphism styling

**UI Elements**:
- GlassContainer wrapper
- Back button (ArrowLeft icon)
- Avatar (circular, letter placeholder)
- Username text
- Status text (online/typing/away)
- Border bottom separator

**Data Sources**:
- Contact info from useChatData
- Typing status from usePresence

---

### feature: settings_interface
**How it's done**: User settings and preferences
- Profile settings (username)
- Theme toggle (light/dark)
- Notification settings
- Disappearing messages default
- Chat management
- Account management
- Glassmorphism design

**Function**: Manages user settings and preferences
- Edit username
- Toggle theme
- Enable/disable notifications
- Set default disappearing message time
- Clear chat history
- Account management
- Logout functionality

**Settings Sections**:
- Profile: Username, display name
- Appearance: Theme toggle
- Notifications: Enable/disable
- Messages: Default disappearing time
- Privacy: Chat management
- Account: Logout, delete account

**UI Elements**:
- GlassContainer with sections
- Settings items with toggles
- Input fields for profile
- Buttons for actions
- Toast notifications for changes

---

### feature: theme_system
**How it's done**: Light/dark theme with CSS variables
- Theme context provider
- CSS custom properties for colors
- Toggle between light and dark
- Persist theme choice
- Apply to all components
- Smooth transitions

**Function**: Provides light and dark themes
- Switch between light and dark modes
- Persist theme in localStorage
- Apply to all UI components
- Smooth theme transitions
- System preference detection
- Dynamic color generation

**Theme Colors**:
- Light: White/gray backgrounds
- Dark: Dark blue/black backgrounds
- Glassmorphism effects in both
- Accent colors (ice-accent)
- Text colors adapt to theme

**Implementation**:
- ThemeProvider context
- useTheme hook
- CSS variables
- Persist in localStorage
- Apply to root element

---

### feature: toast_notifications
**How it's done**: Toast notification system
- Global toast context
- Success, error, info variants
- Auto-dismiss after timeout
- Manual dismiss option
- Stacked toasts
- Glassmorphism styling

**Function**: Shows notifications to user
- Success messages (green)
- Error messages (red)
- Info messages (blue)
- Warning messages (yellow)
- Auto-dismiss after 3-5 seconds
- Manual dismiss on click
- Stack multiple toasts
- Glassmorphism design

**Toast Variants**:
- Success: Green background
- Error: Red background
- Info: Blue background
- Warning: Yellow background

**Behavior**:
- Appear at top-right
- Auto-dismiss after timeout
- Click to dismiss
- Stack vertically
- Smooth animations

---

### feature: error_boundary
**How it's done**: React error boundary component
- Catch JavaScript errors
- Display error UI
- Log error details
- Fallback UI
- Reset on retry
- Glassmorphism error page

**Function**: Catches and displays errors gracefully
- Wrap components in error boundary
- Catch render errors
- Show error message to user
- Log error to console
- Provide retry button
- Prevent app crash
- Glassmorphism error page

**Error Page**:
- Error icon
- Error message
- Retry button
- Stack trace (development)
- Glassmorphism card

---

### feature: loading_state
**How it's done**: Reusable loading components
- Spinner animation
- Loading text
- Overlay and inline variants
- Customizable message
- Smooth animations
- Glassmorphism design

**Function**: Shows loading states during async operations
- Display while loading data
- Show progress indication
- Customizable loading message
- Inline or overlay modes
- Smooth animations
- Prevent user interaction during load

**Loading Variants**:
- Spinner only
- Spinner with text
- Skeleton screens
- Overlay blocking
- Inline indicator

**UI Elements**:
- Animated spinner
- Loading text
- Glassmorphism background
- Smooth transitions

---

### feature: network_status
**How it's done**: Network connectivity monitoring
- Monitor online/offline status
- Show status indicator
- Handle reconnection
- Display connection quality
- Background sync
- Retry failed requests

**Function**: Monitors and displays network status
- Show online/offline indicator
- Monitor connection quality
- Handle network interruptions
- Auto-retry failed requests
- Background sync when online
- User feedback for connectivity

**Status Indicators**:
- Online (green)
- Offline (red)
- Reconnecting (yellow)
- Sync pending (blue)

**Features**:
- Real-time network status
- Connection quality display
- Auto-retry mechanism
- Background sync
- User notifications

---

### feature: glassmorphism_ui
**How it's done**: Glassmorphism design system
- Backdrop blur effects
- Semi-transparent backgrounds
- Subtle borders
- Gradient overlays
- Consistent styling
- Reusable components

**Function**: Provides modern glass-like UI design
- Backdrop blur on containers
- Semi-transparent backgrounds
- Subtle white borders
- Gradient accents
- Consistent across app
- Responsive design

**Components**:
- GlassContainer
- GlassButton
- GlassInput
- GlassCard
- GlassBadge

**Styling**:
- Background: rgba(255, 255, 255, 0.1)
- Border: 1px solid rgba(255, 255, 255, 0.2)
- Backdrop-filter: blur(16px)
- Box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5)
- Border-radius: 12px

---

### feature: responsive_layout
**How it's done**: Mobile-first responsive design
- Flexible grid system
- Breakpoint-based layouts
- Touch-friendly interactions
- Mobile navigation
- Optimized for mobile
- Desktop enhancements

**Function**: Adapts UI to different screen sizes
- Mobile layout (< 768px)
- Tablet layout (768px - 1024px)
- Desktop layout (> 1024px)
- Touch-friendly buttons
- Mobile navigation
- Swipe gestures (optional)
- Responsive typography

**Breakpoints**:
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

**Mobile Optimizations**:
- Touch targets (44px min)
- Swipe navigation
- Mobile keyboard handling
- Mobile scroll behavior
- Mobile menu

---

### feature: authentication_context
**How it's done**: React context for auth state
- Global auth state
- User object management
- Login/logout methods
- Session persistence
- Protected routes
- Auth redirects

**Function**: Manages authentication state globally
- Provide user object to all components
- Handle login/logout
- Persist session
- Redirect unauthenticated users
- Check authentication status
- Loading state during auth

**Context State**:
- user: User object or null
- loading: Boolean auth loading state
- signIn: Function to login
- signOut: Function to logout
- signUp: Function to register

**Features**:
- Session persistence
- Auto-login on refresh
- Logout cleanup (clear all data)
- Protected route wrapper
- Auth guard components

---

### feature: routing_system
**How it's done**: React Router for navigation
- Route configuration
- Protected routes
- Route parameters
- Navigation guards
- 404 handling
- Programmatic navigation

**Function**: Handles application routing
- Navigate between pages
- Protected route middleware
- Route parameters (/chats/:id)
- Catch-all routes (404)
- Programmatic navigation
- Browser history management

**Routes**:
- /login - Login page
- /register - Registration page
- /chats - Chat list
- /chats/:id - Conversation
- /new-chat - New chat creation
- /settings - Settings page
- /calculator - Calculator decoy (optional)

**Route Guards**:
- ProtectedRoute wrapper
- Redirect to login if not authenticated
- Redirect to /chats if authenticated
- Loading state during auth check

---

### feature: file_upload_system
**How it's done**: File selection and Supabase storage upload
- File input component
- File type validation
- Upload to Supabase storage
- Progress indication
- Error handling
- Generate public URLs
- Store in message

**Function**: Handles file uploads for media sharing
- Select file from device
- Validate file type
- Upload to Supabase storage
- Show upload progress
- Handle upload errors
- Generate public URL
- Insert into message
- Display in chat

**File Types**:
- Images: jpg, png, gif, webp
- Videos: mp4, webm
- Documents: pdf, txt, doc
- Max size: 10MB (configurable)

**Upload Flow**:
1. Select file
2. Validate type/size
3. Upload to storage
4. Get public URL
5. Insert into message
6. Display in chat

---

### feature: message_retry_system
**How it's done**: Retry failed message sends
- Detect failed sends
- Show retry button
- Click to retry send
- Clear error on success
- Optimistic rollback
- Error persistence

**Function**: Handles failed message sends with retry
- Detect send failures
- Show error state on message
- Provide retry button
- Retry on button click
- Clear error on success
- Maintain message state
- User feedback for errors

**Error States**:
- Failed to send
- Network error
- Upload error
- Encryption error

**Retry Flow**:
1. Detect failure
2. Show error UI
3. Display retry button
4. Click to retry
5. Clear error on success
6. Rollback on repeated failure

---

### feature: disappearing_messages
**How it's done**: Timer-based message auto-deletion
- Set disappear_after (seconds)
- Calculate disappears_at timestamp
- Auto-delete on timer expiry
- Show countdown indicator
- Reset on view
- Real-time updates

**Function**: Auto-deletes messages after set time
- Set timer on message send
- Calculate expiry timestamp
- Auto-delete when timer reaches 0
- Show remaining time
- Reset timer if viewed
- Real-time timer updates

**Timer Options**:
- 30 seconds
- 1 minute
- 5 minutes
- 1 hour
- 24 hours
- Custom (user-defined)

**Implementation**:
- Set disappear_after on message
- Calculate expires_at
- Client-side timer
- Auto-delete on expiry
- Real-time notification
- UI countdown indicator

---

### feature: one_time_view
**How it's done**: View-once media with auto-deletion
- Mark message as one-time view
- Auto-delete after viewing
- Hide from UI after view
- Count view attempt
- Real-time notification
- Prevent re-view

**Function**: Allows view-once messages that self-destruct
- Mark message for one-time view
- Show preview indicator
- User clicks to view
- Auto-delete after viewing
- Hide from message list
- Notify sender
- Prevent re-view

**Flow**:
1. Send as one-time view
2. Show "View once" indicator
3. Recipient clicks to view
4. Auto-delete after view
5. Hide from chat
6. Notify sender of view
7. Prevent re-access

**UI Indicators**:
- "View once" badge
- Eye icon
- Special styling
- Countdown (optional)

---

### feature: reply_to_message
**How it's done**: Reply threading with reference display
- Reply to specific message
- Store reply_to_id
- Show reference in UI
- Highlight referenced message
- Thread view
- Navigate to original

**Function**: Allows replying to specific messages
- Select message to reply to
- Show reference in input
- Send with reply_to_id
- Display reference in message bubble
- Highlight original message
- Click to navigate to original
- Thread visualization

**UI Elements**:
- Reply preview in input
- Reference in message bubble
- Highlight original message
- Click to jump to original
- "Replying to username" text
- Thread continuation indicator

**Data**:
- reply_to_id foreign key
- Original message reference
- Sender info
- Timestamp

---

## INTEGRATION & ARCHITECTURE

### feature: state_management
**How it's done**: React hooks for state management
- useState for local state
- Custom hooks for complex logic
- useContext for global state
- Local storage for persistence
- Real-time synchronization

**Function**: Manages application state efficiently
- Local component state
- Global auth state
- Chat data state
- Real-time updates
- Cache management
- Optimistic updates

**State Layers**:
1. Local state (useState)
2. Custom hooks (useChatData, usePresence)
3. Global context (AuthContext, ThemeProvider)
4. Local storage (cache)
5. Server state (Supabase)

### feature: real_time_sync
**How it's done**: Supabase Realtime for live updates
- WebSocket connections
- PostgreSQL LISTEN/NOTIFY
- Channel-based subscriptions
- Automatic reconnection
- Merge with local state
- Conflict resolution

**Function**: Synchronizes data in real-time across clients
- Instant message delivery
- Live typing indicators
- Real-time presence
- Reaction updates
- Read receipt sync
- Connection management

**Sync Features**:
- Message updates
- Reaction changes
- Typing status
- Presence changes
- Read receipts
- User status

### feature: data_layer
**How it's done**: Supabase client for data operations
- Row Level Security (RLS)
- PostgreSQL functions
- Efficient queries
- Indexes for performance
- Real-time subscriptions
- Error handling

**Function**: Handles all database operations
- CRUD operations
- Real-time subscriptions
- Authentication
- File storage
- Query optimization
- Transaction support

**Data Layer**:
- Supabase client
- RLS policies
- Database functions
- Indexes
- Constraints
- Triggers

### feature: security_implementation
**How it's done**: Multi-layer security approach
- End-to-end encryption
- Row Level Security
- Input validation
- XSS protection
- CSRF protection
- Secure storage

**Function**: Protects data and user privacy
- E2EE for messages
- Secure password handling
- Protected routes
- Input sanitization
- Secure storage
- Audit logging

**Security Layers**:
- Application layer (encryption)
- Database layer (RLS)
- Transport layer (HTTPS)
- Client layer (validation)
- Storage layer (secure)

---

## DEPLOYMENT & INFRASTRUCTURE

### feature: build_system
**How it's done**: Vite build system
- TypeScript compilation
- Asset optimization
- Code splitting
- Tree shaking
- Minification
- Source maps

**Function**: Builds production-ready application
- Compile TypeScript
- Bundle modules
- Optimize assets
- Generate source maps
- Code splitting
- Production optimizations

**Build Output**:
- HTML entry point
- JS bundles (split by route)
- CSS bundles
- Asset files
- Source maps
- Service worker (optional)

### feature: environment_config
**How it's done**: Environment-based configuration
- Environment variables
- API endpoints
- Feature flags
- Build configuration
- Runtime config
- Secrets management

**Function**: Configures application for different environments
- Development vs production
- API endpoints
- Supabase configuration
- Feature toggles
- Build optimizations
- Security settings

**Environment Variables**:
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- NODE_ENV
- VITE_APP_ENV

### feature: type_safety
**How it's done**: TypeScript for type safety
- Strict type checking
- Interface definitions
- Type guards
- Generic types
- Union types
- Utility types

**Function**: Prevents runtime errors through static typing
- Type definitions for all data
- Interface contracts
- Type validation
- IDE autocompletion
- Refactoring safety
- Error prevention

**Type Definitions**:
- Message types
- User types
- Chat types
- API response types
- Component props
- Hook return types

---

**TOTAL IMPLEMENTATION AREAS**: 50+ features  
**BACKEND FEATURES**: 20  
**FRONTEND FEATURES**: 30+  
**DATABASE TABLES**: 15+  
**CUSTOM HOOKS**: 8  
**COMPONENTS**: 50+  

This implementation plan provides complete details for building a 1:1 replica of the FROSTED CHAT application.
