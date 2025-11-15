// Test setup file for Vitest
import { vi } from 'vitest';

// Mock global objects that might not be available in test environment
global.fetch = vi.fn();
global.Request = vi.fn();
global.Response = class Response {
  constructor(public body?: BodyInit | null, public init?: ResponseInit) {}
  static error() { return new Response(); }
  static json(data: any, init?: ResponseInit) { return new Response(JSON.stringify(data), init); }
  static redirect(url: string | URL, status?: number) { return new Response(); }
} as any;
global.Headers = vi.fn();

// Mock WebRTC APIs if not available
if (typeof RTCPeerConnection === 'undefined') {
  global.RTCPeerConnection = class RTCPeerConnection {
    connectionState = 'new';
    iceConnectionState = 'new';
    signalingState = 'stable';
    getSenders = vi.fn(() => []);
    getReceivers = vi.fn(() => []);
    getStats = vi.fn(() => Promise.resolve(new Map()));
    getConfiguration = vi.fn(() => ({ iceServers: [] }));
    setConfiguration = vi.fn();
    addTrack = vi.fn(() => ({ 
      getParameters: vi.fn(() => ({ encodings: [] })), 
      setParameters: vi.fn(() => Promise.resolve()) 
    }));
    removeTrack = vi.fn();
    addIceCandidate = vi.fn(() => Promise.resolve());
    setLocalDescription = vi.fn(() => Promise.resolve());
    setRemoteDescription = vi.fn(() => Promise.resolve());
    createOffer = vi.fn(() => Promise.resolve({}));
    createAnswer = vi.fn(() => Promise.resolve({}));
    close = vi.fn();
    onicecandidate = null;
    ontrack = null;
    onnegotiationneeded = null;
    onconnectionstatechange = null;
    oniceconnectionstatechange = null;
    
    static generateCertificate = vi.fn(() => Promise.resolve({}));
  } as any;
}

if (typeof MediaStream === 'undefined') {
  global.MediaStream = class MediaStream {
    active = true;
    id = 'test-stream-id';
    onaddtrack = null;
    onremovetrack = null;
    getTracks = vi.fn(() => []);
    getVideoTracks = vi.fn(() => []);
    getAudioTracks = vi.fn(() => []);
    addTrack = vi.fn();
    removeTrack = vi.fn();
    addEventListener = vi.fn();
    removeEventListener = vi.fn();
    dispatchEvent = vi.fn(() => true);
  } as any;
}

if (typeof MediaStreamTrack === 'undefined') {
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
}

if (typeof navigator === 'undefined') {
  global.navigator = {
    mediaDevices: {
      getUserMedia: vi.fn(() => Promise.resolve(new MediaStream())),
      getDisplayMedia: vi.fn(() => Promise.resolve(new MediaStream())),
      enumerateDevices: vi.fn(() => Promise.resolve([])),
      getSupportedConstraints: vi.fn(() => ({})),
      ondevicechange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
  } as any;
}

if (typeof AudioContext === 'undefined') {
  global.AudioContext = class AudioContext {
    currentTime = 0;
    state = 'running';
    baseLatency = 0;
    outputLatency = 0;
    createGain = vi.fn(() => ({ 
      gain: { setValueAtTime: vi.fn() }, 
      connect: vi.fn(), 
      disconnect: vi.fn() 
    }));
    createMediaStreamDestination = vi.fn(() => ({ stream: new MediaStream() }));
    createMediaStreamSource = vi.fn(() => ({ connect: vi.fn(), disconnect: vi.fn() }));
    createAnalyser = vi.fn(() => ({ 
      frequencyBinCount: 256, 
      fftSize: 256,
      connect: vi.fn(), 
      disconnect: vi.fn(),
      getByteFrequencyData: vi.fn()
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
}

if (typeof crypto === 'undefined') {
  global.crypto = {
    randomUUID: vi.fn(() => 'test-uuid-123'),
    getRandomValues: vi.fn((array) => array),
  } as any;
}

// Suppress console errors in tests unless explicitly testing error handling
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  // Only log if it's not a mock-related error
  if (!args.some(arg => 
    typeof arg === 'string' && 
    (arg.includes('mock') || arg.includes('vi.fn'))
  )) {
    originalConsoleError(...args);
  }
};

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});