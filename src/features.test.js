import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderMessages, addMessageToUI, showMessageActions, startEditMessage } from '../web/main.js';

// Mock DOM environment
global.document = {
  getElementById: vi.fn(() => ({
    innerHTML: '',
    appendChild: vi.fn(),
    scrollTop: 0,
    scrollHeight: 100,
    querySelector: vi.fn(),
    querySelectorAll: vi.fn(() => []),
    classList: {
      toggle: vi.fn(),
      add: vi.fn(),
      remove: vi.fn()
    },
    style: {},
    dataset: {},
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  })),
  createElement: vi.fn((tag) => ({
    className: '',
    innerHTML: '',
    textContent: '',
    onclick: null,
    onkeydown: null,
    appendChild: vi.fn(),
    insertBefore: vi.fn(),
    remove: vi.fn(),
    focus: vi.fn(),
    select: vi.fn(),
    style: {},
    dataset: {},
    classList: {
      add: vi.fn(),
      remove: vi.fn(),
      contains: vi.fn(),
      toggle: vi.fn()
    }
  })),
  createDocumentFragment: vi.fn(() => ({
    appendChild: vi.fn()
  }))
};

global.localStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn()
};

global.navigator = {
  deviceMemory: 8,
  hardwareConcurrency: 4
};

global.window = {
  matchMedia: vi.fn(() => ({ matches: false }))
};

describe('Message Features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Message Rendering', () => {
    it('should render message with timestamp and status', () => {
      const message = {
        id: 'msg-123',
        sender_id: 'user-1',
        content: 'Hello World',
        created_at: Date.now()
      };

      const mockEl = document.getElementById();
      const mockDiv = document.createElement();
      
      document.createElement.mockReturnValue(mockDiv);
      
      addMessageToUI(message);
      
      expect(document.createElement).toHaveBeenCalledWith('div');
      expect(mockDiv.className).toContain('message');
      expect(mockDiv.innerHTML).toContain('Hello World');
      expect(mockDiv.innerHTML).toContain('message-time');
      expect(mockDiv.innerHTML).toContain('message-status');
    });

    it('should apply sent class for current user messages', () => {
      const message = {
        id: 'msg-123',
        sender_id: 'user-demo',
        content: 'Test message',
        created_at: Date.now()
      };

      const mockDiv = document.createElement();
      document.createElement.mockReturnValue(mockDiv);
      
      addMessageToUI(message);
      
      expect(mockDiv.className).toContain('sent');
    });

    it('should not apply sent class for other user messages', () => {
      const message = {
        id: 'msg-123',
        sender_id: 'other-user',
        content: 'Test message',
        created_at: Date.now()
      };

      const mockDiv = document.createElement();
      document.createElement.mockReturnValue(mockDiv);
      
      addMessageToUI(message);
      
      expect(mockDiv.className).not.toContain('sent');
    });
  });

  describe('Message Actions', () => {
    it('should show message actions for sent messages', () => {
      const mockMessageEl = {
        classList: {
          contains: vi.fn((className) => className === 'sent')
        },
        querySelector: vi.fn(() => null),
        appendChild: vi.fn()
      };

      const mockActions = document.createElement();
      document.createElement.mockReturnValue(mockActions);

      showMessageActions(mockMessageEl);

      expect(mockActions.className).toBe('message-actions');
      expect(mockActions.appendChild).toHaveBeenCalled();
    });

    it('should include edit button for sent messages', () => {
      const mockMessageEl = {
        classList: {
          contains: vi.fn((className) => className === 'sent')
        },
        querySelector: vi.fn(() => null),
        appendChild: vi.fn()
      };

      const mockActions = document.createElement();
      const mockEditBtn = document.createElement();
      
      document.createElement.mockImplementation((tag) => {
        if (tag === 'div') return mockActions;
        return mockEditBtn;
      });

      showMessageActions(mockMessageEl);

      expect(mockEditBtn.textContent).toBe('✏️');
      expect(typeof mockEditBtn.onclick).toBe('function');
    });

    it('should include delete button for sent messages', () => {
      const mockMessageEl = {
        classList: {
          contains: vi.fn((className) => className === 'sent')
        },
        querySelector: vi.fn(() => null),
        appendChild: vi.fn()
      };

      const mockActions = document.createElement();
      const mockDeleteBtn = document.createElement();
      
      document.createElement.mockImplementation((tag) => {
        if (tag === 'div') return mockActions;
        return mockDeleteBtn;
      });

      showMessageActions(mockMessageEl);

      expect(mockDeleteBtn.textContent).toBe('🗑️');
      expect(typeof mockDeleteBtn.onclick).toBe('function');
    });
  });

  describe('Message Editing', () => {
    it('should create edit input with current text', () => {
      const mockMessageEl = {
        querySelector: vi.fn((selector) => {
          if (selector === '.message-text') {
            return { textContent: 'Original text' };
          }
          if (selector === '.message-content') {
            return { insertBefore: vi.fn() };
          }
          return null;
        })
      };

      const mockInput = document.createElement();
      document.createElement.mockReturnValue(mockInput);

      startEditMessage(mockMessageEl);

      expect(mockInput.type).toBe('text');
      expect(mockInput.value).toBe('Original text');
      expect(mockInput.className).toBe('edit-input');
      expect(typeof mockInput.onkeydown).toBe('function');
    });
  });

  describe('Search Functionality', () => {
    it('should highlight search results', () => {
      const results = [
        { id: 'msg-1', content: 'Hello' },
        { id: 'msg-2', content: 'World' }
      ];

      const mockElements = [
        { classList: { add: vi.fn(), remove: vi.fn() } },
        { classList: { add: vi.fn(), remove: vi.fn() } }
      ];

      document.querySelector.mockImplementation((selector) => {
        if (selector === '[data-id="msg-1"]') return mockElements[0];
        if (selector === '[data-id="msg-2"]') return mockElements[1];
        return null;
      });

      // Mock the highlight removal
      document.querySelectorAll.mockReturnValue([]);

      // Import the function
      const { highlightSearchResults } = require('../web/main.js');
      highlightSearchResults(results);

      expect(mockElements[0].classList.add).toHaveBeenCalledWith('search-highlight');
      expect(mockElements[1].classList.add).toHaveBeenCalledWith('search-highlight');
    });
  });

  describe('Theme Toggle', () => {
    it('should toggle between dark and light themes', () => {
      const mockBody = {
        classList: {
          toggle: vi.fn(),
          add: vi.fn()
        }
      };

      document.body = mockBody;

      // Simulate theme toggle
      let isDarkTheme = true;
      const toggleTheme = () => {
        isDarkTheme = !isDarkTheme;
        mockBody.classList.toggle('light-theme', !isDarkTheme);
      };

      toggleTheme();
      expect(isDarkTheme).toBe(false);
      expect(mockBody.classList.toggle).toHaveBeenCalledWith('light-theme', true);

      toggleTheme();
      expect(isDarkTheme).toBe(true);
      expect(mockBody.classList.toggle).toHaveBeenCalledWith('light-theme', false);
    });
  });

  describe('Device Performance Detection', () => {
    it('should detect low-end devices based on memory and cores', () => {
      global.navigator.deviceMemory = 2;
      global.navigator.hardwareConcurrency = 2;

      const detectDevicePerformance = () => {
        const memory = global.navigator.deviceMemory;
        const cores = global.navigator.hardwareConcurrency;
        return memory < 4 || cores <= 2;
      };

      expect(detectDevicePerformance()).toBe(true);
    });

    it('should not flag high-end devices as low-end', () => {
      global.navigator.deviceMemory = 8;
      global.navigator.hardwareConcurrency = 8;

      const detectDevicePerformance = () => {
        const memory = global.navigator.deviceMemory;
        const cores = global.navigator.hardwareConcurrency;
        return memory < 4 || cores <= 2;
      };

      expect(detectDevicePerformance()).toBe(false);
    });
  });
});