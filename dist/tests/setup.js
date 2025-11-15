var _a;
// Test setup file for Vitest
import { vi } from 'vitest';
// Mock global objects that might not be available in test environment
global.fetch = vi.fn();
global.Request = vi.fn();
global.Response = class Response {
    constructor(body, init) {
        this.body = body;
        this.init = init;
    }
    static error() { return new Response(); }
    static json(data, init) { return new Response(JSON.stringify(data), init); }
    static redirect(url, status) { return new Response(); }
};
global.Headers = vi.fn();
// Mock WebRTC APIs if not available
if (typeof RTCPeerConnection === 'undefined') {
    global.RTCPeerConnection = (_a = class RTCPeerConnection {
            constructor() {
                this.connectionState = 'new';
                this.iceConnectionState = 'new';
                this.signalingState = 'stable';
                this.getSenders = vi.fn(() => []);
                this.getReceivers = vi.fn(() => []);
                this.getStats = vi.fn(() => Promise.resolve(new Map()));
                this.getConfiguration = vi.fn(() => ({ iceServers: [] }));
                this.setConfiguration = vi.fn();
                this.addTrack = vi.fn(() => ({
                    getParameters: vi.fn(() => ({ encodings: [] })),
                    setParameters: vi.fn(() => Promise.resolve())
                }));
                this.removeTrack = vi.fn();
                this.addIceCandidate = vi.fn(() => Promise.resolve());
                this.setLocalDescription = vi.fn(() => Promise.resolve());
                this.setRemoteDescription = vi.fn(() => Promise.resolve());
                this.createOffer = vi.fn(() => Promise.resolve({}));
                this.createAnswer = vi.fn(() => Promise.resolve({}));
                this.close = vi.fn();
                this.onicecandidate = null;
                this.ontrack = null;
                this.onnegotiationneeded = null;
                this.onconnectionstatechange = null;
                this.oniceconnectionstatechange = null;
            }
        },
        _a.generateCertificate = vi.fn(() => Promise.resolve({})),
        _a);
}
if (typeof MediaStream === 'undefined') {
    global.MediaStream = class MediaStream {
        constructor() {
            this.active = true;
            this.id = 'test-stream-id';
            this.onaddtrack = null;
            this.onremovetrack = null;
            this.getTracks = vi.fn(() => []);
            this.getVideoTracks = vi.fn(() => []);
            this.getAudioTracks = vi.fn(() => []);
            this.addTrack = vi.fn();
            this.removeTrack = vi.fn();
            this.addEventListener = vi.fn();
            this.removeEventListener = vi.fn();
            this.dispatchEvent = vi.fn(() => true);
        }
    };
}
if (typeof MediaStreamTrack === 'undefined') {
    global.MediaStreamTrack = class MediaStreamTrack {
        constructor() {
            this.kind = 'video';
            this.enabled = true;
            this.stop = vi.fn();
            this.addEventListener = vi.fn();
            this.removeEventListener = vi.fn();
            this.dispatchEvent = vi.fn(() => true);
            this.contentHint = '';
            this.id = 'test-track-id';
            this.label = 'Test Track';
            this.muted = false;
            this.onended = null;
            this.onmute = null;
            this.onunmute = null;
            this.readyState = 'live';
            this.applyConstraints = vi.fn(() => Promise.resolve());
            this.clone = vi.fn(() => new MediaStreamTrack());
            this.getCapabilities = vi.fn(() => ({}));
            this.getConstraints = vi.fn(() => ({}));
            this.getSettings = vi.fn(() => ({}));
        }
    };
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
    };
}
if (typeof AudioContext === 'undefined') {
    global.AudioContext = class AudioContext {
        constructor() {
            this.currentTime = 0;
            this.state = 'running';
            this.baseLatency = 0;
            this.outputLatency = 0;
            this.createGain = vi.fn(() => ({
                gain: { setValueAtTime: vi.fn() },
                connect: vi.fn(),
                disconnect: vi.fn()
            }));
            this.createMediaStreamDestination = vi.fn(() => ({ stream: new MediaStream() }));
            this.createMediaStreamSource = vi.fn(() => ({ connect: vi.fn(), disconnect: vi.fn() }));
            this.createAnalyser = vi.fn(() => ({
                frequencyBinCount: 256,
                fftSize: 256,
                connect: vi.fn(),
                disconnect: vi.fn(),
                getByteFrequencyData: vi.fn()
            }));
            this.createMediaElementSource = vi.fn(() => ({ connect: vi.fn(), disconnect: vi.fn() }));
            this.getOutputTimestamp = vi.fn(() => ({ contextTime: 0, performanceTime: 0 }));
            this.resume = vi.fn(() => Promise.resolve());
            this.suspend = vi.fn(() => Promise.resolve());
            this.close = vi.fn(() => Promise.resolve());
            this.addEventListener = vi.fn();
            this.removeEventListener = vi.fn();
            this.dispatchEvent = vi.fn(() => true);
        }
    };
}
if (typeof crypto === 'undefined') {
    global.crypto = {
        randomUUID: vi.fn(() => 'test-uuid-123'),
        getRandomValues: vi.fn((array) => array),
    };
}
// Suppress console errors in tests unless explicitly testing error handling
const originalConsoleError = console.error;
console.error = (...args) => {
    // Only log if it's not a mock-related error
    if (!args.some(arg => typeof arg === 'string' &&
        (arg.includes('mock') || arg.includes('vi.fn')))) {
        originalConsoleError(...args);
    }
};
// Clean up after each test
afterEach(() => {
    vi.clearAllMocks();
});
