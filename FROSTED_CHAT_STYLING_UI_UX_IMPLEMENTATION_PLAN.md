# FROSTED CHAT - COMPLETE STYLING & UI/UX IMPLEMENTATION PLAN

**Version**: 1.0  
**Date**: 2025-11-11  
**Design System**: Glassmorphism with Dark Theme Focus  
**Framework**: Tailwind CSS + Custom CSS

---

## GLOBAL STYLING FOUNDATION

### Design Philosophy
- **Primary Style**: Glassmorphism (frosted glass effect)
- **Theme**: Dark-first with light theme support
- **Aesthetic**: Modern, minimalist, ethereal
- **Inspiration**: Frosted glass, ice, winter aesthetic
- **Visual Hierarchy**: Clear, subtle, immersive

---

## COLOR SYSTEM

### Primary Color Palette
```css
/* Brand Colors */
--ice-accent: #60A5FA (blue-400)
--ice-dark: #0F172A (slate-900)
--ice-light: #F8FAFC (slate-50)

/* Semantic Colors */
--success: #10B981 (emerald-500) - Online status, success messages
--warning: #F59E0B (amber-500) - Away status, warnings
--error: #EF4444 (red-500) - Error messages, destructive actions
--info: #3B82F6 (blue-500) - Info messages, links

/* Neutral Palette */
--white: #FFFFFF
--black: #000000
--gray-50: #F9FAFB
--gray-100: #F3F4F6
--gray-200: #E5E7EB
--gray-300: #D1D5DB
--gray-400: #9CA3AF
--gray-500: #6B7280
--gray-600: #4B5563
--gray-700: #374151
--gray-800: #1F2937
--gray-900: #111827
```

### Glassmorphism Color Variations
```css
/* Light Glass */
--glass-light-bg: rgba(255, 255, 255, 0.1)
--glass-light-border: rgba(255, 255, 255, 0.2)
--glass-light-hover: rgba(255, 255, 255, 0.2)

/* Dark Glass */
--glass-dark-bg: rgba(0, 0, 0, 0.3)
--glass-dark-border: rgba(255, 255, 255, 0.1)
--glass-dark-hover: rgba(255, 255, 255, 0.15)

/* Interactive States */
--glass-active: rgba(255, 255, 255, 0.25)
--glass-focus: rgba(96, 165, 250, 0.5)
--glass-disabled: rgba(255, 255, 255, 0.05)
```

### Usage Guidelines
- **ice-accent**: Primary actions, accents, focus states, online indicators
- **ice-dark**: Backgrounds, dark surfaces, message sent bubbles
- **White variants**: Text, icons, light surfaces
- **Success (green)**: Online status dots, success toasts, delivered status
- **Warning (amber)**: Away status, typing indicators
- **Error (red)**: Error toasts, failed sends, destructive actions

---

## TYPOGRAPHY SYSTEM

### Font Stack
```css
/* Primary Font - System UI Stack */
font-family: 
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  Roboto,
  "Helvetica Neue",
  Arial,
  sans-serif,
  "Apple Color Emoji",
  "Segoe UI Emoji",
  "Segoe UI Symbol";
```

### Font Scale
```css
/* Display */
--text-5xl: 3rem (48px) - Page titles
--text-4xl: 2.25rem (36px) - Section headers
--text-3xl: 1.875rem (30px) - Large headers

/* Headings */
--text-2xl: 1.5rem (24px) - H1
--text-xl: 1.25rem (20px) - H2
--text-lg: 1.125rem (18px) - H3
--text-base: 1rem (16px) - Body default
--text-sm: 0.875rem (14px) - Small text
--text-xs: 0.75rem (12px) - Captions, labels

/* Font Weights */
--font-thin: 100
--font-light: 300
--font-normal: 400
--font-medium: 500
--font-semibold: 600
--font-bold: 700
--font-extrabold: 800
```

### Typography Classes
```css
.text-display {
  font-size: 3rem;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.text-heading-1 {
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1.2;
}

.text-heading-2 {
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.3;
}

.text-body {
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.5;
}

.text-body-large {
  font-size: 1.125rem;
  font-weight: 400;
  line-height: 1.5;
}

.text-small {
  font-size: 0.875rem;
  font-weight: 400;
  line-height: 1.4;
}

.text-caption {
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1.3;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

### Text Colors
```css
.text-primary { color: #FFFFFF; }
.text-secondary { color: rgba(255, 255, 255, 0.7); }
.text-tertiary { color: rgba(255, 255, 255, 0.5); }
.text-accent { color: #60A5FA; }
.text-success { color: #10B981; }
.text-warning { color: #F59E0B; }
.text-error { color: #EF4444; }
```

---

## GLASSMORPHISM DESIGN SYSTEM

### Core Glass Classes
```css
/* Base Glass Effect */
.glass {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

/* Dark Glass Variant */
.glass-dark {
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.7),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

/* Container Usage */
.glass-container {
  .glass;
  padding: 1.5rem;
  width: 100%;
  max-width: 28rem;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

/* Card Usage */
.glass-card {
  .glass;
  padding: 1rem;
  transition: all 0.3s ease;
  cursor: pointer;
}

.glass-card:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
  box-shadow: 
    0 32px 64px -12px rgba(0, 0, 0, 0.6);
}

/* Button Usage */
.glass-button {
  .glass;
  padding: 0.5rem 1rem;
  font-weight: 500;
  transition: all 0.3s ease;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.glass-button:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.glass-button:active {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(0);
  transition: all 0.1s ease;
}

.glass-button:disabled {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.05);
  cursor: not-allowed;
  opacity: 0.5;
}

/* Input Usage */
.glass-input {
  .glass;
  padding: 0.75rem 1rem;
  width: 100%;
  color: #FFFFFF;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.glass-input::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

.glass-input:focus {
  outline: none;
  ring: 2px;
  ring-color: rgba(96, 165, 250, 0.5);
  ring-offset: 2px;
  ring-offset-color: transparent;
}

/* Badge Usage */
.glass-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}
```

### Advanced Glass Effects
```css
/* Elevated Glass (for modals) */
.glass-elevated {
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.8),
    0 0 0 1px rgba(255, 255, 255, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

/* Inset Glass (for pressed states) */
.glass-inset {
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  box-shadow: 
    inset 0 2px 4px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

/* Gradient Glass */
.glass-gradient {
  background: linear-gradient(
    135deg,
    rgba(96, 165, 250, 0.2) 0%,
    rgba(139, 92, 246, 0.2) 100%
  );
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}
```

---

## LAYOUT SYSTEM

### Container Sizes
```css
/* Max Widths */
--container-xs: 20rem (320px)
--container-sm: 24rem (384px)
--container-md: 28rem (448px)
--container-lg: 32rem (512px)
--container-xl: 36rem (576px)
--container-2xl: 42rem (672px)
--container-3xl: 48rem (768px)

/* Chat-Specific */
--chat-width: 28rem (448px) - Max chat container width
--message-max-width: 80% - Max message bubble width
```

### Spacing Scale
```css
/* Spacing System (4px base) */
--space-px: 1px
--space-0: 0
--space-1: 0.25rem (4px)
--space-2: 0.5rem (8px)
--space-3: 0.75rem (12px)
--space-4: 1rem (16px)
--space-5: 1.25rem (20px)
--space-6: 1.5rem (24px)
--space-8: 2rem (32px)
--space-10: 2.5rem (40px)
--space-12: 3rem (48px)
--space-16: 4rem (64px)
--space-20: 5rem (80px)
--space-24: 6rem (96px)
```

### Grid System
```css
/* Flexbox Utilities */
.flex { display: flex; }
.flex-col { flex-direction: column; }
.flex-row { flex-direction: row; }
.items-center { align-items: center; }
.items-start { align-items: flex-start; }
.items-end { align-items: flex-end; }
.justify-center { justify-content: center; }
.justify-between { justify-content: space-between; }
.justify-end { justify-content: flex-end; }

/* Gap Utilities */
.gap-1 { gap: 0.25rem; }
.gap-2 { gap: 0.5rem; }
.gap-3 { gap: 0.75rem; }
.gap-4 { gap: 1rem; }
.gap-5 { gap: 1.25rem; }
.gap-6 { gap: 1.5rem; }
.gap-8 { gap: 2rem; }
```

### Layout Patterns
```css
/* Chat Layout */
.chat-layout {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.chat-container {
  width: 100%;
  max-width: 28rem;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.chat-header {
  padding: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.chat-input {
  padding: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}
```

---

## BACKGROUND SYSTEM

### Main Background
```css
body {
  background-image: 
    url('https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&q=80&w=1740');
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
  background-repeat: no-repeat;
  min-height: 100vh;
  color: #FFFFFF;
  font-family: system-ui, sans-serif;
}
```

### Background Overlays
```css
/* Dark Overlay for Better Readability */
.background-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(4px);
  z-index: -1;
}

/* Gradient Overlay */
.background-gradient {
  background: linear-gradient(
    180deg,
    rgba(15, 23, 42, 0.8) 0%,
    rgba(15, 23, 42, 0.9) 50%,
    rgba(15, 23, 42, 0.95) 100%
  );
}
```

### Pattern Backgrounds
```css
/* Subtle Pattern for Sections */
.pattern-dots {
  background-image: radial-gradient(
    rgba(255, 255, 255, 0.05) 1px,
    transparent 1px
  );
  background-size: 20px 20px;
}

.pattern-grid {
  background-image: 
    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 20px 20px;
}
```

---

## MESSAGE BUBBLES

### Message Layout
```css
.message-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 80%;
  margin-bottom: 0.5rem;
}

.message-sent {
  margin-left: auto;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px 12px 4px 12px;
  padding: 0.75rem;
  color: #FFFFFF;
  position: relative;
}

.message-received {
  margin-right: auto;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px 12px 12px 4px;
  padding: 0.75rem;
  color: #FFFFFF;
  position: relative;
}

.message-bubble {
  word-wrap: break-word;
  overflow-wrap: break-word;
  max-width: 100%;
}

.message-timestamp {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 0.25rem;
  text-align: right;
}

.message-received .message-timestamp {
  text-align: left;
}
```

### Message States
```css
/* Message Sending State */
.message-sending {
  opacity: 0.7;
  position: relative;
}

.message-sending::after {
  content: '';
  position: absolute;
  top: 50%;
  right: 0.5rem;
  transform: translateY(-50%);
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #60A5FA;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* Message Failed State */
.message-failed {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
}

.message-failed::after {
  content: '⚠';
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  font-size: 0.75rem;
}

/* One-Time View Message */
.message-one-time {
  border: 2px dashed rgba(96, 165, 250, 0.5);
}

.message-one-time::before {
  content: '👁';
  position: absolute;
  top: -0.5rem;
  left: 0.5rem;
  font-size: 0.75rem;
  background: rgba(15, 23, 42, 0.9);
  padding: 0.125rem 0.25rem;
  border-radius: 4px;
}
```

### Read Receipts
```css
.message-read-receipts {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.25rem;
}

.read-receipt {
  display: flex;
  align-items: center;
}

.read-receipt-icon {
  width: 1rem;
  height: 1rem;
  color: rgba(255, 255, 255, 0.5);
}

.read-receipt-icon.read {
  color: #60A5FA;
}
```

---

## ANIMATIONS & TRANSITIONS

### Keyframe Animations
```css
/* Typing Indicator */
@keyframes typing-animation {
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-0.5rem);
  }
}

.typing-indicator {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem;
}

.typing-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: #60A5FA;
  animation: typing-animation 1.4s infinite ease-in-out;
}

.typing-dot:nth-child(1) {
  animation-delay: 0s;
}

.typing-dot:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dot:nth-child(3) {
  animation-delay: 0.4s;
}

/* Disappearing Message Timer */
@keyframes disappear-timer {
  0% {
    width: 0%;
  }
  100% {
    width: 100%;
  }
}

.disappearing-message {
  position: relative;
  overflow: hidden;
}

.disappearing-message::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2px;
  background: #60A5FA;
  animation: disappear-timer var(--duration, 30s) linear forwards;
}

/* Pulse Animation for Online Status */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.status-online {
  animation: pulse 2s infinite;
}

/* Fade In Animation */
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(0.5rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in {
  animation: fade-in 0.3s ease-out;
}

/* Slide Up Animation */
@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(1rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.slide-up {
  animation: slide-up 0.4s ease-out;
}

/* Bounce Animation */
@keyframes bounce {
  0%, 20%, 53%, 80%, 100% {
    transform: translate3d(0, 0, 0);
  }
  40%, 43% {
    transform: translate3d(0, -0.5rem, 0);
  }
  70% {
    transform: translate3d(0, -0.25rem, 0);
  }
  90% {
    transform: translate3d(0, -0.125rem, 0);
  }
}

.bounce {
  animation: bounce 1s;
}

/* Spin Animation */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.spin {
  animation: spin 1s linear infinite;
}
```

### Transition Classes
```css
/* Standard Transitions */
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 300ms;
}

.transition-colors {
  transition-property: color, background-color, border-color, text-decoration-color, fill, stroke;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}

.transition-transform {
  transition-property: transform;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 300ms;
}

.transition-opacity {
  transition-property: opacity;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}
```

---

## COMPONENT VARIANTS

### Button Variants
```css
/* Default Glass Button */
.btn-glass {
  .glass-button;
  background: rgba(255, 255, 255, 0.1);
  color: #FFFFFF;
}

.btn-glass:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* Accent Button */
.btn-accent {
  .glass-button;
  background: linear-gradient(
    135deg,
    rgba(96, 165, 250, 0.3) 0%,
    rgba(139, 92, 246, 0.3) 100%
  );
  border: 1px solid rgba(96, 165, 250, 0.5);
  color: #FFFFFF;
}

.btn-accent:hover {
  background: linear-gradient(
    135deg,
    rgba(96, 165, 250, 0.4) 0%,
    rgba(139, 92, 246, 0.4) 100%
  );
  border: 1px solid rgba(96, 165, 250, 0.6);
}

/* Ghost Button */
.btn-ghost {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #FFFFFF;
  backdrop-filter: blur(8px);
}

.btn-ghost:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* Destructive Button */
.btn-destructive {
  .glass-button;
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #FFFFFF;
}

.btn-destructive:hover {
  background: rgba(239, 68, 68, 0.3);
}

/* Success Button */
.btn-success {
  .glass-button;
  background: rgba(16, 185, 129, 0.2);
  border: 1px solid rgba(16, 185, 129, 0.4);
  color: #FFFFFF;
}

.btn-success:hover {
  background: rgba(16, 185, 129, 0.3);
}
```

### Button Sizes
```css
/* Small */
.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  border-radius: 0.5rem;
}

/* Medium (Default) */
.btn-md {
  padding: 0.5rem 1rem;
  font-size: 1rem;
  border-radius: 0.625rem;
}

/* Large */
.btn-lg {
  padding: 0.75rem 1.5rem;
  font-size: 1.125rem;
  border-radius: 0.75rem;
}

/* Icon Button */
.btn-icon {
  padding: 0.5rem;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon-sm {
  padding: 0.375rem;
  width: 2rem;
  height: 2rem;
}
```

### Input Variants
```css
/* Default Glass Input */
.input-glass {
  .glass-input;
}

/* Search Input */
.input-search {
  .glass-input;
  position: relative;
  padding-left: 2.5rem;
}

.input-search::before {
  content: '🔍';
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255, 255, 255, 0.6);
}

/* File Input */
.input-file {
  .glass-input;
  padding: 0.5rem;
  cursor: pointer;
}

.input-file::-webkit-file-upload-button {
  .btn-glass;
  margin-right: 0.5rem;
  cursor: pointer;
}
```

### Badge Variants
```css
.badge-default {
  .glass-badge;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #FFFFFF;
}

.badge-outline {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #FFFFFF;
}

.badge-success {
  background: rgba(16, 185, 129, 0.2);
  border: 1px solid rgba(16, 185, 129, 0.4);
  color: #10B981;
}

.badge-warning {
  background: rgba(245, 158, 11, 0.2);
  border: 1px solid rgba(245, 158, 11, 0.4);
  color: #F59E0B;
}

.badge-error {
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #EF4444;
}

.badge-info {
  background: rgba(59, 130, 246, 0.2);
  border: 1px solid rgba(59, 130, 246, 0.4);
  color: #3B82F6;
}
```

---

## INTERACTIVE STATES

### Hover States
```css
/* General Hover */
.hover-lift {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
}

/* Glass Hover */
.hover-glass {
  transition: background 0.3s ease, border-color 0.3s ease;
}

.hover-glass:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
}

/* Accent Hover */
.hover-accent {
  transition: all 0.3s ease;
}

.hover-accent:hover {
  background: rgba(96, 165, 250, 0.3);
  border-color: rgba(96, 165, 250, 0.5);
  color: #FFFFFF;
}
```

### Focus States
```css
/* Standard Focus */
.focus-ring {
  transition: box-shadow 0.2s ease;
}

.focus-ring:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.5);
}

/* Accent Focus */
.focus-accent {
  transition: box-shadow 0.2s ease;
}

.focus-accent:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.6);
  border-color: rgba(96, 165, 250, 0.6);
}
```

### Active States
```css
.active-scale {
  transition: transform 0.1s ease;
}

.active-scale:active {
  transform: scale(0.95);
}

.active-darken {
  transition: background 0.1s ease;
}

.active-darken:active {
  background: rgba(0, 0, 0, 0.4);
}
```

### Disabled States
```css
.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.disabled-glass {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.05);
  cursor: not-allowed;
  pointer-events: none;
}
```

---

## FORM STYLING

### Form Layout
```css
.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
}

.form-error {
  font-size: 0.75rem;
  color: #EF4444;
  margin-top: 0.25rem;
}

.form-help {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 0.25rem;
}
```

### Form Validation
```css
.form-field-valid {
  .glass-input;
  border-color: rgba(16, 185, 129, 0.5);
}

.form-field-invalid {
  .glass-input;
  border-color: rgba(239, 68, 68, 0.5);
}

.form-field-invalid:focus {
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.5);
}
```

### Checkbox & Radio
```css
.form-checkbox {
  appearance: none;
  width: 1.25rem;
  height: 1.25rem;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.1);
  border-radius: 0.25rem;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;
}

.form-checkbox:checked {
  background: #60A5FA;
  border-color: #60A5FA;
}

.form-checkbox:checked::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #FFFFFF;
  font-size: 0.875rem;
}

.form-radio {
  appearance: none;
  width: 1.25rem;
  height: 1.25rem;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;
}

.form-radio:checked {
  border-color: #60AFA;
  background: #60A5FA;
}

.form-radio:checked::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 0.5rem;
  height: 0.5rem;
  background: #FFFFFF;
  border-radius: 50%;
}
```

---

## TOAST NOTIFICATIONS

### Toast Styling
```css
.toast {
  .glass-elevated;
  padding: 1rem;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  max-width: 24rem;
  position: relative;
  animation: slide-up 0.3s ease-out;
}

.toast-icon {
  flex-shrink: 0;
  width: 1.5rem;
  height: 1.5rem;
}

.toast-content {
  flex: 1;
}

.toast-title {
  font-weight: 600;
  margin-bottom: 0.25rem;
  color: #FFFFFF;
}

.toast-description {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
}

.toast-close {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  padding: 0.25rem;
  transition: color 0.2s ease;
}

.toast-close:hover {
  color: #FFFFFF;
}

/* Toast Variants */
.toast-success {
  border-left: 3px solid #10B981;
}

.toast-error {
  border-left: 3px solid #EF4444;
}

.toast-warning {
  border-left: 3px solid #F59E0B;
}

.toast-info {
  border-left: 3px solid #3B82F6;
}
```

### Toast Positioning
```css
.toast-container {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.toast-container-top-left {
  top: 1rem;
  left: 1rem;
  right: auto;
}

.toast-container-bottom-right {
  top: auto;
  bottom: 1rem;
  right: 1rem;
}

.toast-container-bottom-left {
  top: auto;
  bottom: 1rem;
  left: 1rem;
  right: auto;
}

.toast-container-top-center {
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
}
```

---

## MODAL & DIALOG STYLING

### Modal Layout
```css
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9998;
  animation: fade-in 0.3s ease-out;
}

.modal-content {
  .glass-elevated;
  width: 90%;
  max-width: 28rem;
  max-height: 90vh;
  overflow: hidden;
  animation: scale-in 0.3s ease-out;
}

@keyframes scale-in {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.modal-header {
  padding: 1.5rem 1.5rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #FFFFFF;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.modal-description {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 0.5rem;
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
}

.modal-footer {
  padding: 1rem 1.5rem 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.modal-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  padding: 0.5rem;
  transition: color 0.2s ease;
  border-radius: 0.5rem;
}

.modal-close:hover {
  color: #FFFFFF;
  background: rgba(255, 255, 255, 0.1);
}
```

### Dialog Sizes
```css
.modal-sm {
  max-width: 20rem;
}

.modal-md {
  max-width: 28rem;
}

.modal-lg {
  max-width: 36rem;
}

.modal-xl {
  max-width: 48rem;
}

.modal-full {
  width: 90%;
  max-width: none;
  height: 90vh;
}
```

---

## LOADING STATES

### Spinner
```css
.spinner {
  width: 2rem;
  height: 2rem;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-top-color: #60A5FA;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.spinner-sm {
  width: 1rem;
  height: 1rem;
  border-width: 1px;
}

.spinner-lg {
  width: 3rem;
  height: 3rem;
  border-width: 3px;
}

/* Colored Spinners */
.spinner-success {
  border: 2px solid rgba(16, 185, 129, 0.2);
  border-top-color: #10B981;
}

.spinner-error {
  border: 2px solid rgba(239, 68, 68, 0.2);
  border-top-color: #EF4444;
}

.spinner-warning {
  border: 2px solid rgba(245, 158, 11, 0.2);
  border-top-color: #F59E0B;
}
```

### Skeleton Loading
```css
.skeleton {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.05) 25%,
    rgba(255, 255, 255, 0.1) 50%,
    rgba(255, 255, 255, 0.05) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.skeleton-text {
  .skeleton;
  height: 1rem;
  border-radius: 0.25rem;
  margin-bottom: 0.5rem;
}

.skeleton-avatar {
  .skeleton;
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
}

.skeleton-button {
  .skeleton;
  height: 2.5rem;
  border-radius: 0.5rem;
}

.skeleton-line {
  .skeleton;
  height: 1px;
  width: 100%;
}
```

### Loading Overlay
```css
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(4px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.loading-text {
  color: #FFFFFF;
  font-size: 0.875rem;
}
```

---

## RESPONSIVE DESIGN

### Breakpoints
```css
/* Tailwind CSS Breakpoints */
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
@media (min-width: 1536px) { /* 2xl */ }
```

### Responsive Utilities
```css
/* Container Responsive */
.container {
  width: 100%;
  margin-left: auto;
  margin-right: auto;
  padding-left: 1rem;
  padding-right: 1rem;
}

@media (min-width: 640px) {
  .container {
    max-width: 640px;
  }
}

@media (min-width: 768px) {
  .container {
    max-width: 768px;
  }
}

@media (min-width: 1024px) {
  .container {
    max-width: 1024px;
  }
}

/* Responsive Text */
.text-responsive {
  font-size: 1rem;
}

@media (min-width: 768px) {
  .text-responsive {
    font-size: 1.125rem;
  }
}

@media (min-width: 1024px) {
  .text-responsive {
    font-size: 1.25rem;
  }
}
```

### Mobile Optimizations
```css
/* Touch Targets */
.touch-target {
  min-height: 44px;
  min-width: 44px;
}

/* Mobile Chat */
@media (max-width: 767px) {
  .chat-container {
    max-width: 100%;
    max-height: 100vh;
    border-radius: 0;
  }
  
  .message-bubble {
    max-width: 85%;
  }
  
  .modal-content {
    width: 100%;
    height: 100vh;
    max-width: none;
    max-height: none;
    border-radius: 0;
  }
}

/* Mobile Navigation */
.mobile-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  .glass-dark;
  padding: 0.5rem;
  display: flex;
  justify-content: space-around;
  z-index: 1000;
}
```

---

## ACCESSIBILITY

### Focus Management
```css
/* Focus Visible */
.focus-visible {
  outline: none;
}

.focus-visible:focus-visible {
  outline: 2px solid #60A5FA;
  outline-offset: 2px;
}

/* Skip Link */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #60A5FA;
  color: #FFFFFF;
  padding: 0.5rem 1rem;
  text-decoration: none;
  border-radius: 0 0 0.5rem 0.5rem;
  z-index: 100;
}

.skip-link:focus {
  top: 0;
}
```

### Screen Reader
```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

### High Contrast
```css
@media (prefers-contrast: high) {
  .glass {
    background: rgba(255, 255, 255, 0.2);
    border: 2px solid rgba(255, 255, 255, 0.4);
  }
  
  .glass-dark {
    background: rgba(0, 0, 0, 0.5);
    border: 2px solid rgba(255, 255, 255, 0.2);
  }
}
```

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## UTILITY CLASSES

### Spacing Utilities
```css
/* Margin */
.m-0 { margin: 0; }
.m-1 { margin: 0.25rem; }
.m-2 { margin: 0.5rem; }
.m-3 { margin: 0.75rem; }
.m-4 { margin: 1rem; }
.m-5 { margin: 1.25rem; }
.m-6 { margin: 1.5rem; }
.m-8 { margin: 2rem; }

/* Padding */
.p-0 { padding: 0; }
.p-1 { padding: 0.25rem; }
.p-2 { padding: 0.5rem; }
.p-3 { padding: 0.75rem; }
.p-4 { padding: 1rem; }
.p-5 { padding: 1.25rem; }
.p-6 { padding: 1.5rem; }
.p-8 { padding: 2rem; }

/* Negative Margin */
.-m-1 { margin: -0.25rem; }
.-m-2 { margin: -0.5rem; }
.-m-3 { margin: -0.75rem; }
.-m-4 { margin: -1rem; }
```

### Display Utilities
```css
.block { display: block; }
.inline { display: inline; }
.inline-block { display: inline-block; }
.flex { display: flex; }
.inline-flex { display: inline-flex; }
.grid { display: grid; }
.hidden { display: none; }
```

### Position Utilities
```css
.static { position: static; }
.fixed { position: fixed; }
.absolute { position: absolute; }
.relative { position: relative; }
.sticky { position: sticky; }
```

### Z-Index Scale
```css
.z-0 { z-index: 0; }
.z-10 { z-index: 10; }
.z-20 { z-index: 20; }
.z-30 { z-index: 30; }
.z-40 { z-index: 40; }
.z-50 { z-index: 50; }
.z-auto { z-index: auto; }

/* Common Z-Index Values */
.z-dropdown { z-index: 1000; }
.z-sticky { z-index: 1020; }
.z-fixed { z-index: 1030; }
.z-modal-backdrop { z-index: 1040; }
.z-modal { z-index: 1050; }
.z-popover { z-index: 1060; }
.z-tooltip { z-index: 1070; }
.z-toast { z-index: 1080; }
```

---

## DARK THEME VARIATIONS

### Light Theme
```css
.theme-light {
  --background: #FFFFFF;
  --foreground: #0F172A;
  --glass-bg: rgba(255, 255, 255, 0.7);
  --glass-border: rgba(0, 0, 0, 0.1);
  --text-primary: #0F172A;
  --text-secondary: rgba(15, 23, 42, 0.7);
}

.theme-light body {
  background-image: url('https://images.unsplash.com/photo-1481349518771-20055b2a7b24?auto=format&fit=crop&q=80&w=1740');
}

.theme-light .glass {
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(0, 0, 0, 0.1);
  color: #0F172A;
}

.theme-light .message-sent {
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
  color: #0F172A;
}
```

---

## ICON SYSTEM

### Icon Sizing
```css
.icon-xs { width: 0.75rem; height: 0.75rem; }
.icon-sm { width: 1rem; height: 1rem; }
.icon-md { width: 1.25rem; height: 1.25rem; }
.icon-lg { width: 1.5rem; height: 1.5rem; }
.icon-xl { width: 2rem; height: 2rem; }
.icon-2xl { width: 2.5rem; height: 2.5rem; }
.icon-3xl { width: 3rem; height: 3rem; }
```

### Icon Colors
```css
.icon-primary { color: #FFFFFF; }
.icon-secondary { color: rgba(255, 255, 255, 0.7); }
.icon-accent { color: #60A5FA; }
.icon-success { color: #10B981; }
.icon-warning { color: #F59E0B; }
.icon-error { color: #EF4444; }
```

### Common Icons
```css
/* Message Status Icons */
.icon-sent { /* Single check */ }
.icon-delivered { /* Double check */ }
.icon-read { /* Double blue check */ }

/* Action Icons */
.icon-send { /* Send arrow */ }
.icon-attach { /* Paperclip */ }
.icon-emoji { /* Smiley face */ }
.icon-more { /* Three dots */ }

/* Status Icons */
.icon-online { /* Green dot */ }
.icon-away { /* Yellow dot */ }
.icon-offline { /* Gray dot */ }

/* Navigation Icons */
.icon-back { /* Arrow left */ }
.icon-forward { /* Arrow right */ }
.icon-close { /* X */ }
.icon-menu { /* Hamburger */ }
```

---

## PRINT STYLES

### Print Optimization
```css
@media print {
  body {
    background: #FFFFFF !important;
    color: #000000 !important;
  }
  
  .glass,
  .glass-dark,
  .glass-card,
  .glass-button {
    background: #FFFFFF !important;
    border: 1px solid #000000 !important;
    box-shadow: none !important;
  }
  
  .no-print {
    display: none !important;
  }
}
```

---

## IMPLEMENTATION CHECKLIST

### ✅ Core Styling
- [ ] Set up color system (CSS custom properties)
- [ ] Implement glassmorphism base classes
- [ ] Create typography scale
- [ ] Set up spacing system
- [ ] Implement animation keyframes

### ✅ Components
- [ ] Create glass container component
- [ ] Create glass button component
- [ ] Create glass input component
- [ ] Create glass card component
- [ ] Create message bubble styles
- [ ] Create badge component
- [ ] Create toast component
- [ ] Create modal component

### ✅ Interactive States
- [ ] Implement hover states
- [ ] Implement focus states
- [ ] Implement active states
- [ ] Implement disabled states
- [ ] Create transition classes

### ✅ Responsive Design
- [ ] Set up breakpoints
- [ ] Create responsive utilities
- [ ] Implement mobile optimizations
- [ ] Create mobile navigation

### ✅ Accessibility
- [ ] Implement focus management
- [ ] Add screen reader utilities
- [ ] Support high contrast mode
- [ ] Support reduced motion

### ✅ Theme System
- [ ] Create dark theme (default)
- [ ] Create light theme variant
- [ ] Implement theme switcher
- [ ] Persist theme preference

---

**TOTAL STYLING AREAS**: 25+ major categories  
**CUSTOM CSS CLASSES**: 200+  
**COMPONENT VARIANTS**: 50+  
**ANIMATION KEYFRAMES**: 10+  

This comprehensive styling plan provides every detail needed to recreate the exact FROSTED CHAT UI/UX with pixel-perfect accuracy.
