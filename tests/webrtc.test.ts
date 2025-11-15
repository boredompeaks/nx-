// Comprehensive Test Suite for WebRTC Engine

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  CallEngine, 
  SignalingClient, 
  TurnSelector, 
  AudioDucker, 
  StatsMonitor,
  createCallEngine,
  isWebRTCSupported,
  getWebRTCCapabilities
} from '../src/webrtc';
import { validateMediaConstraints, cleanupMediaStream, validateSignalMessage } from '../src/webrtc/utils';

// Mock WebRTC APIs
global.RTCPeerConnection = class RTCPeerConnection {
  connectionState = 'new';
  iceConnectionState = 'new';
  signalingState = 'stable';
  getSenders = vi.fn(() => []);
  getReceivers = vi.fn(() => []);
  getStats = vi.fn(() => Promise.resolve(new Map()));
  getConfiguration = vi.fn(() => ({ iceServers: [] }));
  setConfiguration = vi.fn();
  close = vi.fn();
  addTrack = vi.fn();
  removeTrack = vi.fn();
  createOffer = vi.fn(() => Promise.resolve({ type: 'offer', sdp: 'test' }));
  setLocalDescription = vi.fn(() => Promise.resolve());
  setRemoteDescription = vi.fn(() => Promise.resolve());
  addIceCandidate = vi.fn(() => Promise.resolve());
  onicecandidate = null;
  ontrack = null;
  onnegotiationneeded = null;
  onconnectionstatechange = null;
  oniceconnectionstatechange = null;
  
  static generateCertificate = vi.fn(() => Promise.resolve({}));
} as any;

global.MediaStream = class MediaStream {
  active = true;
  id = 'test-stream-id';
  onaddtrack = null;
  onremovetrack = null;
  getTracks = vi.fn(() => []);
  getAudioTracks = vi.fn(() => []);
  getVideoTracks = vi.fn(() => []);
  addTrack = vi.fn();
  removeTrack = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  dispatchEvent = vi.fn(() => true);
} as any;

global.MediaStreamTrack = class MediaStreamTrack {
  kind = 'video';
  enabled = true;
  stop = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  dispatchEvent = vi.fn(() => true);
  contentHint = '';
  id = 'test-track-id';
  label = 'Test Track';
  muted = false;
  onended = null;
  onmute = null;
  onunmute = null;
  readyState = 'live';
  applyConstraints = vi.fn(() => Promise.resolve());
  clone = vi.fn(() => new MediaStreamTrack());
  getCapabilities = vi.fn(() => ({}));
  getConstraints = vi.fn(() => ({}));
  getSettings = vi.fn(() => ({}));
} as any;

// Mock navigator.mediaDevices
Object.defineProperty(global, 'navigator', {
  value: {
    mediaDevices: {
      getUserMedia: vi.fn(() => Promise.resolve(new MediaStream())),
      getDisplayMedia: vi.fn(() => Promise.resolve(new MediaStream())),
      enumerateDevices: vi.fn(() => Promise.resolve([])),
      getSupportedConstraints: vi.fn(() => ({})),
      ondevicechange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(() => true),
    },
  },
  writable: true,
  configurable: true,
});

// Mock AudioContext
global.AudioContext = class AudioContext {
  currentTime = 0;
  state = 'running';
  baseLatency = 0;
  outputLatency = 0;
  createGain = vi.fn(() => ({
    gain: {
      setValueAtTime: vi.fn(),
      value: 1,
    },
    connect: vi.fn(),
    disconnect: vi.fn(),
  }));
  createMediaStreamSource = vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
  }));
  createAnalyser = vi.fn(() => ({
    fftSize: 256,
    frequencyBinCount: 128,
    getByteFrequencyData: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
  }));
  createMediaStreamDestination = vi.fn(() => ({
    stream: new MediaStream(),
  }));
  createMediaElementSource = vi.fn(() => ({ connect: vi.fn(), disconnect: vi.fn() }));
  getOutputTimestamp = vi.fn(() => ({ contextTime: 0, performanceTime: 0 }));
  resume = vi.fn(() => Promise.resolve());
  suspend = vi.fn(() => Promise.resolve());
  close = vi.fn(() => Promise.resolve());
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  dispatchEvent = vi.fn(() => true);
} as any;

// Mock Supabase
global.fetch = vi.fn(() => Promise.resolve(new Response('{}', { status: 200 })));

// Shared test data
const mockOptions = {
  userId: 'test-user',
  roomId: 'test-room',
  supabaseUrl: 'https://test.supabase.co',
  supabaseKey: 'test-key',
  turnServers: [{
    urls: ['turn:turn.example.com:3478'],
    username: 'testuser',
    credential: 'testpass',
  }],
};

describe('WebRTC Engine - Enterprise Grade Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('CallEngine', () => {
    let engine: CallEngine;

    it('should create CallEngine with valid options', () => {
      engine = createCallEngine(mockOptions);
      expect(engine).toBeInstanceOf(CallEngine);
    });

    it('should throw error with invalid options', () => {
      expect(() => {
        createCallEngine(null as any);
      }).toThrow('CallEngineOptions is required');
    });

    it('should throw error with missing required fields', () => {
      expect(() => {
        createCallEngine({ userId: 'test' } as any);
      }).toThrow('Missing required option: roomId');
    });

    it('should throw error with empty turn servers', () => {
      expect(() => {
        createCallEngine({ ...mockOptions, turnServers: [] });
      }).toThrow('At least one TURN server is required');
    });

    it('should validate maxBandwidth range', () => {
      expect(() => {
        createCallEngine({ ...mockOptions, maxBandwidth: 50 });
      }).toThrow('maxBandwidth must be between 100 and 10000 kbps');

      expect(() => {
        createCallEngine({ ...mockOptions, maxBandwidth: 15000 });
      }).toThrow('maxBandwidth must be between 100 and 10000 kbps');
    });

    it('should initialize successfully', async () => {
      engine = createCallEngine(mockOptions);
      
      // Mock signaling client
      vi.spyOn(engine as any, 'signaling', 'get').mockReturnValue({
        connect: vi.fn(() => Promise.resolve()),
        onSignal: vi.fn(() => vi.fn()),
        onPresence: vi.fn(() => vi.fn()),
      });

      await expect(engine.init()).resolves.not.toThrow();
    });

    it('should handle initialization errors gracefully', async () => {
      engine = createCallEngine(mockOptions);
      
      // Mock signaling client with error
      vi.spyOn(engine as any, 'signaling', 'get').mockReturnValue({
        connect: vi.fn(() => Promise.reject(new Error('Connection failed'))),
      });

      await expect(engine.init()).rejects.toThrow('Connection failed');
    });

    it('should start local media with valid constraints', async () => {
      engine = createCallEngine(mockOptions);
      
      // Mock successful init
      vi.spyOn(engine as any, 'signaling', 'get').mockReturnValue({
        connect: vi.fn(() => Promise.resolve()),
        onSignal: vi.fn(() => vi.fn()),
        onPresence: vi.fn(() => vi.fn()),
      });
      
      await engine.init();

      const constraints = { video: true, audio: true };
      const stream = await engine.startLocalMedia(constraints);
      
      expect(stream).toBeDefined();
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        video: true,
        audio: true
      });
    });

    it('should handle media constraints validation errors', async () => {
      engine = createCallEngine(mockOptions);
      
      // Mock successful init
      vi.spyOn(engine as any, 'signaling', 'get').mockReturnValue({
        connect: vi.fn(() => Promise.resolve()),
        onSignal: vi.fn(() => vi.fn()),
        onPresence: vi.fn(() => vi.fn()),
      });
      
      await engine.init();

      const invalidConstraints = { video: false, audio: false };
      
      await expect(engine.startLocalMedia(invalidConstraints)).rejects.toThrow('Invalid media constraints');
    });

    it('should handle getUserMedia errors gracefully', async () => {
      engine = createCallEngine(mockOptions);
      
      // Mock successful init
      vi.spyOn(engine as any, 'signaling', 'get').mockReturnValue({
        connect: vi.fn(() => Promise.resolve()),
        onSignal: vi.fn(() => vi.fn()),
        onPresence: vi.fn(() => vi.fn()),
      });
      
      await engine.init();

      // Mock getUserMedia failure
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(new Error('Permission denied'));

      await expect(engine.startLocalMedia({ video: true })).rejects.toThrow('Permission denied');
    });

    it('should start screen share successfully', async () => {
      engine = createCallEngine(mockOptions);
      
      // Mock successful init
      vi.spyOn(engine as any, 'signaling', 'get').mockReturnValue({
        connect: vi.fn(() => Promise.resolve()),
        onSignal: vi.fn(() => vi.fn()),
        onPresence: vi.fn(() => vi.fn()),
      });
      
      await engine.init();

      // Mock screen stream with video tracks
      const mockScreenStream = new MediaStream();
      const mockVideoTrack = new MediaStreamTrack();
      Object.defineProperty(mockVideoTrack, 'kind', { value: 'video', writable: true });
      mockScreenStream.getVideoTracks = vi.fn(() => [mockVideoTrack]);
      mockVideoTrack.addEventListener = vi.fn();
      
      vi.mocked(navigator.mediaDevices.getDisplayMedia).mockResolvedValueOnce(mockScreenStream);

      const stream = await engine.startScreenShare();
      
      expect(stream).toBeDefined();
      expect(navigator.mediaDevices.getDisplayMedia).toHaveBeenCalledWith(expect.objectContaining({
        video: expect.objectContaining({
          cursor: 'always',
          displaySurface: 'monitor',
          width: expect.objectContaining({ ideal: 1920 }),
          height: expect.objectContaining({ ideal: 1080 }),
          frameRate: expect.objectContaining({ ideal: 30 }),
        }),
      }));
    });

    it('should handle screen share errors gracefully', async () => {
      engine = createCallEngine(mockOptions);
      
      // Mock successful init
      vi.spyOn(engine as any, 'signaling', 'get').mockReturnValue({
        connect: vi.fn(() => Promise.resolve()),
        onSignal: vi.fn(() => vi.fn()),
        onPresence: vi.fn(() => vi.fn()),
      });
      
      await engine.init();

      // Mock getDisplayMedia failure
      vi.mocked(navigator.mediaDevices.getDisplayMedia).mockRejectedValueOnce(new Error('Screen share denied'));

      await expect(engine.startScreenShare()).rejects.toThrow('Screen share denied');
    });

    it('should toggle mute successfully', async () => {
      engine = createCallEngine(mockOptions);
      
      // Mock successful init and media
      vi.spyOn(engine as any, 'signaling', 'get').mockReturnValue({
        connect: vi.fn(() => Promise.resolve()),
        onSignal: vi.fn(() => vi.fn()),
        onPresence: vi.fn(() => vi.fn()),
      });
      
      await engine.init();
      
      const mockStream = new MediaStream();
      const mockAudioTrack = new MediaStreamTrack();
      Object.defineProperty(mockAudioTrack, 'kind', { value: 'audio', writable: true });
      vi.mocked(mockStream.getAudioTracks).mockReturnValue([mockAudioTrack]);
      
      vi.spyOn(engine as any, 'localStream', 'get').mockReturnValue(mockStream);

      await engine.toggleMute('audio', true);
      expect(mockAudioTrack.enabled).toBe(false);

      await engine.toggleMute('audio', false);
      expect(mockAudioTrack.enabled).toBe(true);
    });

    it('should handle end call gracefully', async () => {
      engine = createCallEngine(mockOptions);
      
      // Mock successful init
      vi.spyOn(engine as any, 'signaling', 'get').mockReturnValue({
        connect: vi.fn(() => Promise.resolve()),
        onSignal: vi.fn(() => vi.fn()),
        onPresence: vi.fn(() => vi.fn()),
        sendSignal: vi.fn(() => Promise.resolve()),
        disconnect: vi.fn(() => Promise.resolve()),
      });
      
      await engine.init();

      await expect(engine.endCall()).resolves.not.toThrow();
    });

    it('should provide call statistics', () => {
      engine = createCallEngine(mockOptions);
      
      const stats = engine.getStats();
      
      expect(stats).toHaveProperty('callId');
      expect(stats).toHaveProperty('startTime');
      expect(stats).toHaveProperty('duration');
      expect(stats).toHaveProperty('peerCount');
      expect(stats).toHaveProperty('errorCount');
      expect(stats).toHaveProperty('connectionStates');
    });

    it('should handle event listeners', () => {
      engine = createCallEngine(mockOptions);
      
      const handler = vi.fn();
      const unsubscribe = engine.on('engine:ready', handler);
      
      expect(unsubscribe).toBeInstanceOf(Function);
      
      // Test unsubscribe
      unsubscribe();
      expect(() => unsubscribe()).not.toThrow();
    });
  });

  describe('SignalingClient', () => {
    let client: SignalingClient;
    const mockConfig = {
      supabaseUrl: 'https://test.supabase.co',
      supabaseKey: 'test-key',
      roomId: 'test-room',
      userId: 'test-user',
    };

    beforeEach(() => {
      // Mock Supabase client
      vi.mock('@supabase/supabase-js', () => ({
        createClient: vi.fn(() => ({
          channel: vi.fn(() => ({
            on: vi.fn(() => ({ subscribe: vi.fn(() => Promise.resolve()) })),
            subscribe: vi.fn(() => Promise.resolve()),
            unsubscribe: vi.fn(() => Promise.resolve()),
          })),
          from: vi.fn(() => ({
            insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
            upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
            update: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      }));
    });

    it('should create SignalingClient with valid config', () => {
      client = new SignalingClient(
        mockConfig.supabaseUrl,
        mockConfig.supabaseKey,
        mockConfig.roomId,
        mockConfig.userId
      );
      
      expect(client).toBeInstanceOf(SignalingClient);
    });

    it('should throw error with invalid config', () => {
      expect(() => {
        new SignalingClient('', '', '', '');
      }).toThrow('All constructor parameters are required');
    });

    it('should throw error with invalid URL', () => {
      expect(() => {
        new SignalingClient('invalid-url', 'key', 'room', 'user');
      }).toThrow('Invalid Supabase URL format');
    });

    it('should throw error with invalid user ID length', () => {
      expect(() => {
        new SignalingClient('https://test.supabase.co', 'key', 'room', 'ab');
      }).toThrow('User ID must be between 3 and 50 characters');
    });

    it('should connect successfully', async () => {
      client = new SignalingClient(
        mockConfig.supabaseUrl,
        mockConfig.supabaseKey,
        mockConfig.roomId,
        mockConfig.userId
      );

      await expect(client.connect()).resolves.not.toThrow();
    });

    it('should handle connection errors gracefully', async () => {
      // Mock the createClient to return a client that fails on subscribe
      const mockCreateClient = vi.fn(() => {
        const mockChannel = {
          on: vi.fn(() => mockChannel),
          subscribe: vi.fn(() => Promise.reject(new Error('Connection failed'))),
        };
        
        return {
          channel: vi.fn(() => mockChannel),
          from: vi.fn(() => ({
            insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
            upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
            update: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        };
      });

      // Create a new SignalingClient instance with the mocked Supabase client
      const { SignalingClient } = await import('../src/webrtc/SignalingClient');
      
      // Override the createClient function in the module
      vi.spyOn(await import('@supabase/supabase-js'), 'createClient').mockImplementation(mockCreateClient);

      const testClient = new SignalingClient(
        mockConfig.supabaseUrl,
        mockConfig.supabaseKey,
        mockConfig.roomId,
        mockConfig.userId
      );

      await expect(testClient.connect()).rejects.toThrow('Signaling connection failed');
    });

    it('should send signals with rate limiting', async () => {
      client = new SignalingClient(
        mockConfig.supabaseUrl,
        mockConfig.supabaseKey,
        mockConfig.roomId,
        mockConfig.userId
      );

      await client.connect();

      // Test signal sending
      await expect(client.sendSignal('recipient', 'offer', { sdp: 'test' })).resolves.not.toThrow();
    });

    it('should handle signal sending errors', async () => {
      // Create a mock that fails on insert
      const mockInsert = vi.fn(() => Promise.reject(new Error('Database error')));
      
      const mockFrom = vi.fn(() => ({
        insert: mockInsert,
        upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
        update: vi.fn(() => Promise.resolve({ data: null, error: null })),
      }));
      
      const mockChannel = {
        on: vi.fn(() => mockChannel), // Return self for chaining
        subscribe: vi.fn(() => Promise.resolve()),
        unsubscribe: vi.fn(() => Promise.resolve()),
      };
      
      const mockSupabaseClient = {
        channel: vi.fn(() => mockChannel),
        from: mockFrom,
      };

      // Create a new SignalingClient instance with the mocked Supabase client
      const { SignalingClient } = await import('../src/webrtc/SignalingClient');
      
      // Override the createClient function in the module
      vi.spyOn(await import('@supabase/supabase-js'), 'createClient').mockImplementation(() => mockSupabaseClient);

      const testClient = new SignalingClient(
        mockConfig.supabaseUrl,
        mockConfig.supabaseKey,
        mockConfig.roomId,
        mockConfig.userId
      );

      await testClient.connect();

      await expect(testClient.sendSignal('recipient', 'offer', { sdp: 'test' })).rejects.toThrow('Database error');
    });

    it('should handle event listeners', () => {
      client = new SignalingClient(
        mockConfig.supabaseUrl,
        mockConfig.supabaseKey,
        mockConfig.roomId,
        mockConfig.userId
      );

      const signalHandler = vi.fn();
      const presenceHandler = vi.fn();

      const unsubSignal = client.onSignal(signalHandler);
      const unsubPresence = client.onPresence(presenceHandler);

      expect(unsubSignal).toBeInstanceOf(Function);
      expect(unsubPresence).toBeInstanceOf(Function);

      // Test unsubscribe
      unsubSignal();
      unsubPresence();
    });

    it('should disconnect gracefully', async () => {
      client = new SignalingClient(
        mockConfig.supabaseUrl,
        mockConfig.supabaseKey,
        mockConfig.roomId,
        mockConfig.userId
      );

      await client.connect();
      await expect(client.disconnect()).resolves.not.toThrow();
    });
  });

  describe('TurnSelector', () => {
    let selector: TurnSelector;
    const mockServers = [
      {
        urls: ['turn:turn1.example.com:3478'],
        username: 'user1',
        credential: 'pass1',
        priority: 10,
      },
      {
        urls: ['turn:turn2.example.com:3478'],
        username: 'user2',
        credential: 'pass2',
        priority: 5,
      },
    ];

    it('should create TurnSelector with valid servers', () => {
      selector = new TurnSelector(mockServers);
      expect(selector).toBeInstanceOf(TurnSelector);
    });

    it('should throw error with empty servers array', () => {
      expect(() => {
        new TurnSelector([]);
      }).toThrow('TURN servers array cannot be empty');
    });

    it('should throw error with invalid server URLs', () => {
      expect(() => {
        new TurnSelector([{ urls: [] }] as any);
      }).toThrow('TURN server must have at least one URL');
    });

    it('should select optimal server', async () => {
      selector = new TurnSelector(mockServers);
      
      const server = await selector.selectOptimalServer();
      expect(server).toBeDefined();
      expect(server.urls).toBeDefined();
    });

    it('should handle server selection errors gracefully', async () => {
      selector = new TurnSelector(mockServers);
      
      // Mock probe failure
      vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));
      
      const server = await selector.selectOptimalServer();
      expect(server).toBeDefined(); // Should return fallback
    });

    it('should get next fallback server', () => {
      selector = new TurnSelector(mockServers);
      
      const currentServer = mockServers[0];
      const fallback = selector.getNextFallback(currentServer);
      
      expect(fallback).toBe(mockServers[1]);
    });

    it('should return null for last server fallback', () => {
      selector = new TurnSelector(mockServers);
      
      const currentServer = mockServers[1];
      const fallback = selector.getNextFallback(currentServer);
      
      expect(fallback).toBeNull();
    });

    it('should clear cache', () => {
      selector = new TurnSelector(mockServers);
      selector.clearCache();
      
      expect(() => selector.clearCache()).not.toThrow();
    });

    it('should provide server count', () => {
      selector = new TurnSelector(mockServers);
      
      expect(selector.getServerCount()).toBe(2);
    });

    it('should check health status', () => {
      selector = new TurnSelector(mockServers);
      
      expect(selector.isHealthy()).toBe(true);
    });
  });

  describe('AudioDucker', () => {
    let ducker: AudioDucker;

    beforeEach(() => {
      ducker = new AudioDucker();
    });

    afterEach(() => {
      ducker.cleanup();
    });

    it('should initialize with local stream', async () => {
      const mockStream = new MediaStream();
      
      const result = await ducker.initialize(mockStream);
      expect(result).toBeDefined();
      expect(ducker.isInitialized()).toBe(true);
    });

    it('should throw error with invalid local stream', async () => {
      await expect(ducker.initialize(null as any)).rejects.toThrow('Local stream is required');
    });

    it('should handle initialization errors gracefully', async () => {
      // Mock AudioContext creation failure
      const originalAudioContext = global.AudioContext;
      (global as any).AudioContext = function() {
        throw new Error('Audio not supported');
      };
      
      const mockStream = new MediaStream();
      await expect(ducker.initialize(mockStream)).rejects.toThrow('Failed to initialize audio ducker');
      
      // Restore original
      (global as any).AudioContext = originalAudioContext;
    });

    it('should manual duck audio', async () => {
      const mockStream = new MediaStream();
      await ducker.initialize(mockStream);
      
      ducker.manualDuck(0.5);
      expect(ducker.isAudioDucked()).toBe(true);
    });

    it('should restore audio', async () => {
      const mockStream = new MediaStream();
      await ducker.initialize(mockStream);
      
      ducker.manualDuck(0.5);
      ducker.restore();
      expect(ducker.isAudioDucked()).toBe(false);
    });

    it('should clamp duck levels', async () => {
      const mockStream = new MediaStream();
      await ducker.initialize(mockStream);
      
      ducker.manualDuck(1.5); // Above 1.0
      expect(ducker.isAudioDucked()).toBe(false); // Should be clamped to 1.0

      ducker.manualDuck(-0.5); // Below 0
      expect(ducker.isAudioDucked()).toBe(true); // Should be clamped to 0
    });

    it('should get current audio level', async () => {
      const mockStream = new MediaStream();
      await ducker.initialize(mockStream);
      
      const level = ducker.getCurrentLevel();
      expect(typeof level).toBe('number');
      expect(level).toBeGreaterThanOrEqual(0);
      expect(level).toBeLessThanOrEqual(1);
    });

    it('should cleanup resources', async () => {
      const mockStream = new MediaStream();
      await ducker.initialize(mockStream);
      
      ducker.cleanup();
      expect(ducker.isInitialized()).toBe(false);
    });

    it('should handle cleanup errors gracefully', async () => {
      const mockStream = new MediaStream();
      await ducker.initialize(mockStream);
      
      // Mock cleanup error
      const mockContext = new (global.AudioContext as any)();
      mockContext.close = vi.fn(() => { throw new Error('Close failed'); });
      
      expect(() => ducker.cleanup()).not.toThrow();
    });
  });

  describe('StatsMonitor', () => {
    let monitor: StatsMonitor;
    let mockPC: RTCPeerConnection;
    let mockCallback: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockPC = new RTCPeerConnection();
      mockCallback = vi.fn();
      monitor = new StatsMonitor(mockPC, mockCallback);
    });

    afterEach(() => {
      monitor.stop();
    });

    it('should create StatsMonitor with valid parameters', () => {
      expect(monitor).toBeInstanceOf(StatsMonitor);
      expect(monitor.isRunning()).toBe(false);
    });

    it('should throw error with invalid peer connection', () => {
      expect(() => {
        new StatsMonitor(null as any, mockCallback);
      }).toThrow('RTCPeerConnection is required');
    });

    it('should throw error with closed peer connection', () => {
      Object.defineProperty(mockPC, 'connectionState', { value: 'closed', writable: true });
      
      expect(() => {
        new StatsMonitor(mockPC, mockCallback);
      }).toThrow('Cannot monitor closed peer connection');
    });

    it('should throw error with invalid callback', () => {
      expect(() => {
        new StatsMonitor(mockPC, 'invalid' as any);
      }).toThrow('Update callback must be a function');
    });

    it('should start monitoring', () => {
      monitor.start(1000);
      expect(monitor.isRunning()).toBe(true);
    });

    it('should enforce minimum interval', () => {
      monitor.start(50); // Below minimum
      expect(monitor.isRunning()).toBe(true);
    });

    it('should stop monitoring', () => {
      monitor.start();
      monitor.stop();
      expect(monitor.isRunning()).toBe(false);
    });

    it('should handle peer connection closure during monitoring', async () => {
      monitor.start(100);
      
      // Mock peer connection state change
      Object.defineProperty(mockPC, 'connectionState', { value: 'closed', writable: true });
      
      // Wait for next monitoring cycle
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(monitor.isRunning()).toBe(false);
    });

    it('should get stats history', () => {
      const history = monitor.getStatsHistory();
      expect(history).toBeInstanceOf(Map);
    });
  });

  describe('Utility Functions', () => {
    describe('validateMediaConstraints', () => {
      it('should validate valid constraints', () => {
        expect(validateMediaConstraints({ video: true, audio: true })).toBe(true);
        expect(validateMediaConstraints({ video: true })).toBe(true);
        expect(validateMediaConstraints({ audio: true })).toBe(true);
      });

      it('should reject invalid constraints', () => {
        expect(validateMediaConstraints({})).toBe(false);
        expect(validateMediaConstraints(null as any)).toBe(false);
        expect(validateMediaConstraints({ video: false, audio: false })).toBe(false);
      });

      it('should validate complex constraints', () => {
        expect(validateMediaConstraints({
          video: {
            width: 1920,
            height: 1080,
            frameRate: 30,
          },
          audio: {
            sampleRate: 48000,
          },
        })).toBe(true);
      });

      it('should reject invalid constraint values', () => {
        expect(validateMediaConstraints({
          video: {
            width: 'invalid' as any,
          },
        })).toBe(false);
      });
    });

    describe('cleanupMediaStream', () => {
      it('should cleanup valid stream', () => {
        const mockTrack = new MediaStreamTrack();
        const mockStream = new MediaStream();
        vi.mocked(mockStream.getTracks).mockReturnValue([mockTrack]);

        expect(() => cleanupMediaStream(mockStream)).not.toThrow();
        expect(mockTrack.stop).toHaveBeenCalled();
      });

      it('should handle null stream', () => {
        expect(() => cleanupMediaStream(null)).not.toThrow();
      });

      it('should handle cleanup errors gracefully', () => {
        const mockTrack = new MediaStreamTrack();
        mockTrack.stop = vi.fn(() => { throw new Error('Stop failed'); });
        
        const mockStream = new MediaStream();
        vi.mocked(mockStream.getTracks).mockReturnValue([mockTrack]);

        expect(() => cleanupMediaStream(mockStream)).not.toThrow();
      });
    });

    describe('validateSignalMessage', () => {
      it('should validate valid signal messages', () => {
        expect(validateSignalMessage({
          type: 'offer',
          from: 'user1',
          to: 'user2',
          data: { sdp: 'test' },
          timestamp: Date.now(),
        })).toBe(true);
      });

      it('should reject invalid signal messages', () => {
        expect(validateSignalMessage(null)).toBe(false);
        expect(validateSignalMessage({})).toBe(false);
        expect(validateSignalMessage({
          type: 'invalid',
          from: 'user1',
          to: 'user2',
        })).toBe(false);
      });

      it('should reject oversized messages', () => {
        const largeData = 'x'.repeat(70000); // Exceeds 64KB limit
        expect(validateSignalMessage({
          type: 'offer',
          from: 'user1',
          to: 'user2',
          data: largeData,
          timestamp: Date.now(),
        })).toBe(false);
      });
    });
  });

  describe('WebRTC Support Detection', () => {
    it('should detect WebRTC support', () => {
      const supported = isWebRTCSupported();
      expect(typeof supported).toBe('boolean');
    });

    it('should get WebRTC capabilities', () => {
      const capabilities = getWebRTCCapabilities();
      
      expect(capabilities).toHaveProperty('supported');
      expect(capabilities).toHaveProperty('features');
      expect(capabilities.features).toHaveProperty('peerConnection');
      expect(capabilities.features).toHaveProperty('mediaStream');
      expect(capabilities.features).toHaveProperty('getUserMedia');
      expect(capabilities.features).toHaveProperty('screenShare');
      expect(capabilities.features).toHaveProperty('audioContext');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle race conditions in peer connection creation', async () => {
      const engine = createCallEngine(mockOptions);
      
      // Mock successful init
      vi.spyOn(engine as any, 'signaling', 'get').mockReturnValue({
        connect: vi.fn(() => Promise.resolve()),
        onSignal: vi.fn(() => vi.fn()),
        onPresence: vi.fn(() => vi.fn()),
      });
      
      await engine.init();

      // Mock turn selector to avoid async issues
      vi.spyOn(engine as any, 'turnSelector', 'get').mockReturnValue({
        selectOptimalServer: vi.fn(() => Promise.resolve({
          urls: ['turn:test.com:3478'],
          username: 'test',
          credential: 'test',
        })),
      });

      // Mock RTCPeerConnection to return the same instance
      const mockPC = new RTCPeerConnection();
      const mockRTCPC = vi.fn().mockReturnValue(mockPC);
      (mockRTCPC as any).generateCertificate = vi.fn(() => Promise.resolve({}));
      global.RTCPeerConnection = mockRTCPC as any;

      // Simulate concurrent peer connection creation
      const promises = [
        (engine as any).createPeerConnection('peer1', true),
        (engine as any).createPeerConnection('peer1', false),
      ];

      const [pc1, pc2] = await Promise.all(promises);
      expect(pc1).toBe(pc2); // Should return the same instance
    });

    it('should handle maximum peer limit', async () => {
      const engine = createCallEngine(mockOptions);
      
      // Mock successful init
      vi.spyOn(engine as any, 'signaling', 'get').mockReturnValue({
        connect: vi.fn(() => Promise.resolve()),
        onSignal: vi.fn(() => vi.fn()),
        onPresence: vi.fn(() => vi.fn()),
      });
      
      await engine.init();

      // Mock peer connections map
      const mockMap = new Map();
      for (let i = 0; i < 50; i++) {
        mockMap.set(`peer${i}`, new RTCPeerConnection());
      }
      vi.spyOn(engine as any, 'peerConnections', 'get').mockReturnValue(mockMap);

      await expect((engine as any).createPeerConnection('peer51', true))
        .rejects.toThrow('Maximum peers per room (50) exceeded');
    });

    it('should handle global error limits', async () => {
      const engine = createCallEngine(mockOptions);
      
      // Mock successful init
      vi.spyOn(engine as any, 'signaling', 'get').mockReturnValue({
        connect: vi.fn(() => Promise.resolve()),
        onSignal: vi.fn(() => vi.fn()),
        onPresence: vi.fn(() => vi.fn()),
      });
      
      await engine.init();

      // Simulate multiple global errors
      for (let i = 0; i < 15; i++) {
        (engine as any).handleGlobalError(new Error(`Error ${i}`));
      }

      // Should trigger maximum error limit
      expect((engine as any).errorCount).toBeGreaterThan(10);
    });
  });

  describe('Performance and Memory Tests', () => {
    it('should handle large numbers of peer connections efficiently', async () => {
      const engine = createCallEngine(mockOptions);
      
      // Mock successful init
      vi.spyOn(engine as any, 'signaling', 'get').mockReturnValue({
        connect: vi.fn(() => Promise.resolve()),
        onSignal: vi.fn(() => vi.fn()),
        onPresence: vi.fn(() => vi.fn()),
      });
      
      await engine.init();

      // Create multiple peer connections
      const startTime = Date.now();
      const promises = [];
      
      for (let i = 0; i < 10; i++) {
        promises.push((engine as any).createPeerConnection(`peer${i}`, true));
      }

      await Promise.all(promises);
      const endTime = Date.now();

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(5000);
      expect((engine as any).peerConnections.size).toBe(10);
    });

    it('should cleanup resources properly', async () => {
      const engine = createCallEngine(mockOptions);
      
      // Mock successful init
      vi.spyOn(engine as any, 'signaling', 'get').mockReturnValue({
        connect: vi.fn(() => Promise.resolve()),
        onSignal: vi.fn(() => vi.fn()),
        onPresence: vi.fn(() => vi.fn()),
        sendSignal: vi.fn(() => Promise.resolve()),
        disconnect: vi.fn(() => Promise.resolve()),
      });
      
      await engine.init();

      // Create some state
      await (engine as any).createPeerConnection('peer1', true);
      
      const mockStream = new MediaStream();
      vi.spyOn(engine as any, 'localStream', 'get').mockReturnValue(mockStream);

      // Cleanup
      await engine.endCall();

      expect((engine as any).peerConnections.size).toBe(0);
      expect((engine as any).isInitialized).toBe(false);
    });
  });
});